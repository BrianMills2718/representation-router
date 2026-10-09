// Pure parts of the shared graph viewer: validate a typed-graph/v1 document and
// turn measured node sizes into an ELK layout request and back into positions.
// No DOM here, so the contract and layout can be tested in Node.

import { forceSimulation, forceLink, forceManyBody, forceCollide, forceX, forceY } from "d3-force";

export const SCHEMA = "typed-graph/v1";

/** Returns a list of human-readable problems; empty means the graph is usable. */
export function validateTypedGraph(graph) {
  const problems = [];
  if (!graph || typeof graph !== "object") return ["graph must be an object"];
  if (graph.schema !== SCHEMA) problems.push(`schema must be "${SCHEMA}"`);
  if (!Array.isArray(graph.nodes)) problems.push("nodes must be an array");
  if (!Array.isArray(graph.edges)) problems.push("edges must be an array");
  if (problems.length) return problems;
  const ids = new Set();
  for (const node of graph.nodes) {
    if (!node?.id || !node?.label) problems.push(`node ${JSON.stringify(node?.id)} needs an id and a label`);
    else if (ids.has(node.id)) problems.push(`duplicate node id ${node.id}`);
    ids.add(node?.id);
  }
  const edgeIds = new Set();
  for (const edge of graph.edges) {
    if (!edge?.id) problems.push("every edge needs an id");
    else if (edgeIds.has(edge.id)) problems.push(`duplicate edge id ${edge.id}`);
    edgeIds.add(edge?.id);
    if (!ids.has(edge?.source)) problems.push(`edge ${edge?.id} source ${edge?.source} is not a node`);
    if (!ids.has(edge?.target)) problems.push(`edge ${edge?.id} target ${edge?.target} is not a node`);
  }
  if (graph.hyperedges !== undefined) {
    if (!Array.isArray(graph.hyperedges)) return [...problems, "hyperedges must be an array"];
    for (const h of graph.hyperedges) {
      if (!h?.id || !h?.label) { problems.push(`hyperedge ${JSON.stringify(h?.id)} needs an id and a label`); continue; }
      if (ids.has(h.id) || edgeIds.has(h.id)) problems.push(`hyperedge id ${h.id} is already used by a node or edge`);
      ids.add(h.id);
      const roles = Object.entries(h.roles ?? {});
      if (!roles.length) problems.push(`hyperedge ${h.id} needs at least one role`);
      for (const [role, members] of roles) {
        if (!Array.isArray(members) || !members.length) problems.push(`hyperedge ${h.id} role ${role} needs a list of node ids`);
        else for (const m of members) if (!graph.nodes.some((n) => n.id === m)) problems.push(`hyperedge ${h.id} role ${role} names ${m}, which is not a node`);
      }
    }
  }
  return problems;
}

/**
 * A fact that joins several things in named roles (a hyperedge) becomes one small hub node with a
 * spoke to each participant, labelled with its role: the "fact node plus role edges" encoding
 * onto-canon6 uses for n-ary assertions. Layout, zoom, selection and highlighting then work
 * unchanged, and nothing is split into pairs. A graph without hyperedges is returned as it was.
 */
export function expandHyperedges(graph) {
  const hyperedges = graph.hyperedges ?? [];
  if (!hyperedges.length) return graph;
  const { hyperedges: _drop, ...rest } = graph;
  return {
    ...rest,
    nodes: [...graph.nodes, ...hyperedges.map((h) => ({
      id: h.id, label: h.label, kind: h.kind ?? "fact", hub: true,
      ...(h.explain ? { explain: h.explain } : {}),
    }))],
    edges: [...graph.edges, ...hyperedges.flatMap((h) => Object.entries(h.roles).flatMap(([role, members]) =>
      members.map((m, i) => ({ id: `${h.id}::${role}::${i}`, source: h.id, target: m, label: role, role: true }))))],
  };
}

/**
 * ELK request from measured node sizes ({id: {width, height}}). Edge labels get
 * their measured size too (labelSizes, by edge id), so ELK reserves room for them
 * and no label sits on a box or on another label.
 */
export function toElkGraph(graph, sizes, { direction = graph.layout?.direction ?? "RIGHT", aspectRatio = 1.6, labelSizes = {}, wrap = true } = {}) {
  return {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": direction,
      "elk.spacing.nodeNode": "22",
      "elk.layered.spacing.nodeNodeBetweenLayers": "36",
      "elk.spacing.edgeNode": "20",
      "elk.layered.spacing.edgeNodeBetweenLayers": "20",
      "elk.spacing.componentComponent": "48",
      "elk.separateConnectedComponents": "true",
      "elk.aspectRatio": String(aspectRatio),
      // Long chains may wrap into rows that match the frame instead of one thin line.
      "elk.layered.wrapping.strategy": wrap ? "MULTI_EDGE" : "OFF",
      "elk.edgeRouting": "ORTHOGONAL",
      "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
      "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
      "elk.edgeLabels.placement": "CENTER",
      "elk.spacing.edgeLabel": "4",
    },
    children: graph.nodes.map((node) => ({ id: node.id, width: sizes[node.id]?.width ?? 160, height: sizes[node.id]?.height ?? 48 })),
    edges: graph.edges.map((edge) => ({
      id: edge.id, sources: [edge.source], targets: [edge.target],
      ...(edge.label ? { labels: [{ id: `${edge.id}::label`, text: edge.label, width: labelSizes[edge.id]?.width ?? edge.label.length * 7 + 12, height: labelSizes[edge.id]?.height ?? 20 }] } : {}),
    })),
  };
}

/**
 * Layout candidates to try: left-to-right with and without wrapping long chains,
 * and top-to-bottom without wrapping (wrapping top-to-bottom drew long loop-back
 * routes). A graph that fixes its direction gets only that direction. The viewer
 * keeps whichever fits its frame best (see pickLayout), so text stays as big as
 * the frame allows.
 */
export function layoutCandidates(graph) {
  const fixed = graph.layout?.direction;
  const all = [{ direction: "RIGHT", wrap: true }, { direction: "RIGHT", wrap: false }, { direction: "DOWN", wrap: false }];
  return fixed ? [{ direction: fixed, wrap: fixed === "RIGHT" }, { direction: fixed, wrap: false }] : all;
}

/** Scale at which a laid-out drawing fits a frame (padding as a fraction of the frame). */
export function fitScale(layout, frame, padding = 0.08) {
  const w = Math.max(layout.width ?? 1, 1), h = Math.max(layout.height ?? 1, 1);
  return Math.min((frame.width * (1 - 2 * padding)) / w, (frame.height * (1 - 2 * padding)) / h);
}

/** Total bend points across all edge routes: fewer bends read more easily. */
export function bendCount(layout) {
  return (layout.edges ?? []).reduce((n, e) => n + (e.sections ?? []).reduce((m, sec) => m + (sec.bendPoints?.length ?? 0), 0), 0);
}

/**
 * Pick the layout to show: among those that fit within 10% of the largest scale,
 * the one with the fewest bends (then the larger scale). A straighter drawing
 * beats a marginally bigger tangled one.
 */
export function pickLayout(layouts, frame) {
  const scored = layouts.map((layout) => ({ layout, scale: fitScale(layout, frame), bends: bendCount(layout) }));
  const best = Math.max(...scored.map((c) => c.scale));
  return scored.filter((c) => c.scale >= best * 0.9).sort((a, b) => a.bends - b.bends || b.scale - a.scale)[0].layout;
}

/** Positions ({id: {x, y}}) from an ELK result. */
export function positionsFromElk(layout) {
  return Object.fromEntries((layout.children ?? []).map((child) => [child.id, { x: child.x ?? 0, y: child.y ?? 0 }]));
}

/** Edge routes ({id: [{x, y}, ...]}) from an ELK result: start, bends, end. */
export function routesFromElk(layout) {
  const routes = {};
  for (const edge of layout.edges ?? []) {
    const section = edge.sections?.[0];
    if (!section) continue;
    routes[edge.id] = [section.startPoint, ...(section.bendPoints ?? []), section.endPoint];
  }
  return routes;
}

/** Label centres ({edgeId: {x, y}}) where ELK placed each edge label. */
export function labelsFromElk(layout) {
  const out = {};
  for (const edge of layout.edges ?? []) {
    const label = edge.labels?.[0];
    if (label && label.x != null) out[edge.id] = { x: label.x + (label.width ?? 0) / 2, y: label.y + (label.height ?? 0) / 2 };
  }
  return out;
}

/**
 * After the reader drags nodes, the stored ELK routes for links touching them are stale: drop
 * those routes and label points so the links draw straight to the node's new place. Links between
 * untouched nodes keep their routes. Returns { routes, labelAt, dropped } (dropped: edge ids).
 */
export function dropRoutesTouching(graph, routes, labelAt, movedIds) {
  const moved = new Set(movedIds ?? []);
  const dropped = graph.edges.filter((e) => (moved.has(e.source) || moved.has(e.target)) && (e.id in routes || e.id in labelAt)).map((e) => e.id);
  if (!dropped.length) return { routes, labelAt, dropped };
  const gone = new Set(dropped);
  const keep = (obj) => Object.fromEntries(Object.entries(obj).filter(([id]) => !gone.has(id)));
  return { routes: keep(routes), labelAt: keep(labelAt), dropped };
}

/** SVG path through route points with rounded corners, and the label point at the path's middle. */
export function routePath(points, radius = 10) {
  if (!points?.length) return { d: "", labelX: 0, labelY: 0 };
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const p = points[i], prev = points[i - 1], next = points[i + 1];
    if (!next) { d += ` L ${p.x} ${p.y}`; break; }
    const inLen = Math.hypot(p.x - prev.x, p.y - prev.y), outLen = Math.hypot(next.x - p.x, next.y - p.y);
    const r = Math.min(radius, inLen / 2, outLen / 2);
    const a = { x: p.x - ((p.x - prev.x) / (inLen || 1)) * r, y: p.y - ((p.y - prev.y) / (inLen || 1)) * r };
    const b = { x: p.x + ((next.x - p.x) / (outLen || 1)) * r, y: p.y + ((next.y - p.y) / (outLen || 1)) * r };
    d += ` L ${a.x} ${a.y} Q ${p.x} ${p.y} ${b.x} ${b.y}`;
  }
  const lengths = points.slice(1).map((p, i) => Math.hypot(p.x - points[i].x, p.y - points[i].y));
  let half = lengths.reduce((t, l) => t + l, 0) / 2, labelX = points[0].x, labelY = points[0].y;
  for (let i = 0; i < lengths.length; i++) {
    if (half <= lengths[i]) { const t = lengths[i] ? half / lengths[i] : 0; labelX = points[i].x + (points[i + 1].x - points[i].x) * t; labelY = points[i].y + (points[i + 1].y - points[i].y) * t; break; }
    half -= lengths[i];
  }
  return { d, labelX, labelY };
}

// What stays bright: a selection and its neighbours, else a highlighted set
// (for example everything resting on one source), else everything.
export function litSet(graph, selected, highlight) {
  if (selected) return relatedTo(graph, selected);
  if (highlight) return highlight;
  return null;
}

export function relatedTo(graph, id) {
  const set = new Set(id ? [id] : []);
  for (const edge of graph.edges) {
    if (edge.id === id) { set.add(edge.source); set.add(edge.target); }
    if (edge.source === id || edge.target === id) { set.add(edge.id); set.add(edge.source); set.add(edge.target); }
  }
  return set;
}

/**
 * Force layout for hub graphs (layout.algorithm "force"): d3-force with spring links, repulsion and
 * collision on measured boxes, run to a fixed tick count so the result is the same each time.
 * Returns the same shape as an ELK layout (width, height, children with x/y; no edge routes, so
 * edges are drawn straight). Measured 2026-10-07: the DoDAF model as 131 fact hubs (225 boxes) lays
 * out in about 0.7 s with no overlapping boxes, where ELK's stress layout took 61 s.
 */
export function forceLayout(graph, sizes, { ticks = 400 } = {}) {
  const nodes = graph.nodes.map((n, i) => {
    const s = sizes[n.id] ?? { width: 160, height: 48 };
    const angle = i * 2.399963, r = 12 * Math.sqrt(i);  // deterministic spiral start
    return { id: n.id, w: s.width, h: s.height, x: r * Math.cos(angle), y: r * Math.sin(angle) };
  });
  const links = graph.edges.map((e) => ({ source: e.source, target: e.target }));
  const sim = forceSimulation(nodes)
    .force("link", forceLink(links).id((d) => d.id).distance(110).strength(0.7))
    .force("charge", forceManyBody().strength(-260))
    .force("collide", forceCollide((d) => Math.hypot(d.w, d.h) / 2 + 6))
    .force("x", forceX(0).strength(0.03)).force("y", forceY(0).strength(0.05))
    .stop();
  for (let i = 0; i < ticks; i++) sim.tick();
  const minX = Math.min(...nodes.map((n) => n.x - n.w / 2)), minY = Math.min(...nodes.map((n) => n.y - n.h / 2));
  const children = nodes.map((n) => ({ id: n.id, width: n.w, height: n.h, x: n.x - n.w / 2 - minX + 20, y: n.y - n.h / 2 - minY + 20 }));
  return {
    width: Math.max(...children.map((c) => c.x + c.width)) + 20,
    height: Math.max(...children.map((c) => c.y + c.height)) + 20,
    children, edges: [],
  };
}
