// Pure parts of the shared graph viewer: validate a typed-graph/v1 document and
// turn measured node sizes into an ELK layout request and back into positions.
// No DOM here, so the contract and layout can be tested in Node.

import { forceSimulation, forceLink, forceManyBody, forceCollide, forceX, forceY } from "d3-force";

export const SCHEMA = "typed-graph/v1";
/** Node shapes (node.shape or kinds[kind].shape, 0.12.0): a box, or a diamond for a claim or decision. */
export const NODE_SHAPES = ["box", "diamond"];

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
    if (edge?.line !== undefined && !(edge.line in LINE_DASH)) problems.push(`edge ${edge.id} line ${edge.line} is not one of ${Object.keys(LINE_DASH).join(", ")}`);
  }
  const byId = new Map(graph.nodes.map((n) => [n?.id, n]));
  const laneIds = new Set((graph.layout?.lanes ?? []).map((l) => l?.id));
  for (const node of graph.nodes) {
    const shape = node?.shape ?? graph.kinds?.[node?.kind]?.shape;
    if (shape !== undefined && !NODE_SHAPES.includes(shape)) problems.push(`node ${node.id} shape ${shape} is not one of ${NODE_SHAPES.join(", ")}`);
    if (node?.parent !== undefined) {
      if (!byId.has(node.parent)) problems.push(`node ${node.id} parent ${node.parent} is not a node`);
      else {
        // A parent chain must end: no node may contain itself.
        const seen = new Set([node.id]);
        for (let p = node.parent; p !== undefined; p = byId.get(p)?.parent) {
          if (seen.has(p)) { problems.push(`node ${node.id} is inside itself (parent cycle)`); break; }
          seen.add(p);
        }
      }
    }
    if (node?.lane !== undefined && laneIds.size && !laneIds.has(node.lane)) problems.push(`node ${node.id} lane ${node.lane} is not in layout.lanes`);
    if (node?.source?.from !== undefined && !byId.has(node.source.from)) problems.push(`node ${node.id} source.from ${node.source.from} is not a node`);
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
      ...(h.shape ? { shape: h.shape } : {}), ...(h.strong ? { strong: true } : {}),
    }))],
    edges: [...graph.edges, ...hyperedges.flatMap((h) => Object.entries(h.roles).flatMap(([role, members]) =>
      members.map((m, i) => ({ id: `${h.id}::${role}::${i}`, source: h.id, target: m, label: role, role: true }))))],
  };
}

/**
 * Line styles a link may ask for (edge.line, 0.12.0), so one drawing can show several relation types
 * apart without colour: solid, dashed, dotted, dash-dot and long dashes. `edge.dashed` still means
 * "dashed". `edge.arrow === false` draws no arrowhead (an undirected relation). Returns the SVG
 * dash pattern (undefined for solid), whether to draw the arrowhead, and the line cap.
 */
export const LINE_DASH = { solid: undefined, dashed: "6 4", dotted: "1.5 4", dashdot: "9 3 1.5 3", long: "14 5" };
export function edgeLine(edge) {
  const line = edge.line ?? (edge.dashed ? "dashed" : "solid");
  return { dash: LINE_DASH[line], arrow: edge.arrow !== false, cap: line === "dotted" || line === "dashdot" ? "round" : undefined };
}

/**
 * Graphs this big get ELK's fast node placement. A real 127-box, 246-link plan with NETWORK_SIMPLEX threw
 * "Maximum call stack size exceeded" with wrapping and held the page's only thread for about 100 seconds
 * without it; with BRANDES_KOEPF and thoroughness 1 each layout took about 2 seconds. Its link words show only for
 * the selected box or link (as the lanes view does).
 */
export const LARGE_GRAPH = { nodes: 60, edges: 120 };
export function isLargeGraph(graph) {
  return graph.nodes.length > LARGE_GRAPH.nodes || (graph.edges?.length ?? 0) > LARGE_GRAPH.edges;
}

/**
 * ELK request from measured node sizes ({id: {width, height}}). Edge labels get
 * their measured size too (labelSizes, by edge id), so ELK reserves room for them
 * and no label sits on a box or on another label.
 */
export function toElkGraph(graph, sizes, { direction = graph.layout?.direction ?? "RIGHT", aspectRatio = 1.6, labelSizes = {}, wrap = true } = {}) {
  const large = isLargeGraph(graph);
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
      // NETWORK_SIMPLEX on a large graph overflows the stack when wrapping and takes minutes without (see isLargeGraph).
      "elk.layered.nodePlacement.strategy": large ? "BRANDES_KOEPF" : "NETWORK_SIMPLEX",
      ...(large ? { "elk.layered.thoroughness": "1" } : {}),
      "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
      "elk.edgeLabels.placement": "CENTER",
      "elk.spacing.edgeLabel": "4",
    },
    children: graph.nodes.map((node) => ({ id: node.id, width: sizes[node.id]?.width ?? 160, height: sizes[node.id]?.height ?? 48 })),
    edges: graph.edges.map((edge) => ({
      id: edge.id, sources: [edge.source], targets: [edge.target],
      // A large graph reserves no room for link words: they doubled the drawing and made ELK route 40 of 246 links outside it.
      ...(edge.label && !large ? { labels: [{ id: `${edge.id}::label`, text: edge.label, width: labelSizes[edge.id]?.width ?? edge.label.length * 7 + 12, height: labelSizes[edge.id]?.height ?? 20 }] } : {}),
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

/**
 * Viewport for a drawing in a frame (0.14.0). Fits the whole drawing and centres it, never past 100%.
 * With `readable` set (full-page mode), the zoom never drops below it: a drawing too big to fit at a
 * readable size opens at that size from its top-left corner (centred on any axis that still fits),
 * and the reader pans to the rest, instead of every word shrinking to a speck.
 *
 * Returns null when there is nothing to fit into (0.14.2): a frame with no width or height (the
 * viewer or a panel holding it is hidden) or a drawing whose size is not a number. Fitting a hidden
 * frame gave zoom 0, and React Flow measures each box's link handles as (screen offset / zoom): when
 * the panel was shown again every handle measured 0/0 = NaN, so every link drew "MNaN,NaN" while the
 * boxes drew fine (world-substrate#316). The caller keeps the current view and fits again once the
 * frame has a size.
 */
export function fitViewport(drawing, frame, { readable = 0, margin = 24 } = {}) {
  if (!(frame?.width > 0 && frame?.height > 0)) return null;
  if (!Number.isFinite(drawing?.width ?? 1) || !Number.isFinite(drawing?.height ?? 1)) return null;
  const w = Math.max(drawing.width ?? 1, 1), h = Math.max(drawing.height ?? 1, 1);
  const zoom = Math.max(Math.min(fitScale({ width: w, height: h }, frame), 1), Math.min(readable, 1));
  const axis = (size, room) => (size * zoom <= room ? (room - size * zoom) / 2 : margin);
  return { x: axis(w, frame.width), y: axis(h, frame.height), zoom };
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

/** Positions ({id: {x, y}}) from an ELK result. A coordinate that is not a finite number becomes 0, so no box or link is ever placed at NaN. */
export function positionsFromElk(layout) {
  const at = (v) => (Number.isFinite(v) ? v : 0);
  return Object.fromEntries((layout.children ?? []).map((child) => [child.id, { x: at(child.x), y: at(child.y) }]));
}

/**
 * A box size safe to lay out (0.14.2): a measured width or height that is missing, zero, negative or
 * not a number gets the default (160 × 48). One NaN size made d3-force return NaN for every box in the
 * graph, since the links and the drawing's left edge spread it to all of them.
 */
export function layoutSize(size) {
  const ok = (v) => Number.isFinite(v) && v > 0;
  return { width: ok(size?.width) ? size.width : 160, height: ok(size?.height) ? size.height : 48 };
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
    const s = layoutSize(sizes[n.id]);
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

// ---- Whole documents: containment, closed nodes, lanes (0.9.0) -------------------------------
// A node may sit inside another (node.parent): a hearing holds its speaker turns, a turn holds its
// claims. A closed node hides what it holds and counts it, so the page shows a readable overview
// and nothing is dropped: one click opens the node, one button opens a whole level.

/** Children of each node in document order ({parentId: [childId...]}); roots under "". */
export function childrenOf(graph) {
  const index = new Map(graph.nodes.map((n, i) => [n.id, i]));
  const out = new Map();
  for (const n of graph.nodes) {
    const key = n.parent ?? "";
    if (!out.has(key)) out.set(key, []);
    out.get(key).push(n);
  }
  for (const list of out.values()) list.sort((a, b) => (a.order ?? index.get(a.id)) - (b.order ?? index.get(b.id)) || index.get(a.id) - index.get(b.id));
  return new Map([...out].map(([k, list]) => [k, list.map((n) => n.id)]));
}

/** Ids of nodes that hold others and start open (node.collapsed, else kinds[kind].collapsed, else open). */
export function defaultOpen(graph) {
  const kinds = graph.kinds ?? {};
  const kids = childrenOf(graph);
  return new Set(graph.nodes.filter((n) => kids.has(n.id) && !(n.collapsed ?? kinds[n.kind]?.collapsed ?? false)).map((n) => n.id));
}

/** The chain of containers above a node, nearest first. */
export function ancestorsOf(graph, id) {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const out = [];
  for (let p = byId.get(id)?.parent; p !== undefined; p = byId.get(p)?.parent) out.push(p);
  return out;
}

/** Open every container above the nodes of one kind, so that whole level shows. */
export function openToKind(graph, kind, open) {
  const next = new Set(open);
  for (const n of graph.nodes) if (n.kind === kind) for (const a of ancestorsOf(graph, n.id)) next.add(a);
  return next;
}

/**
 * What the reader sees with the given open set: visible nodes (each closed container carries
 * `hidden`, the count of everything inside it by kind), edges whose ends are hidden moved to the
 * nearest visible container and merged (label gets "×n"), plus one containment link from each
 * open container to each child. `counts` gives, per kind, how many are shown and how many exist.
 */
export function visibleGraph(graph, open) {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const kids = childrenOf(graph);
  const visible = new Set();
  const walk = (id) => { visible.add(id); if (open.has(id)) for (const c of kids.get(id) ?? []) walk(c); };
  for (const r of kids.get("") ?? []) walk(r);
  const shownAs = (id) => { let cur = id; while (cur !== undefined && !visible.has(cur)) cur = byId.get(cur)?.parent; return cur; };
  const hiddenInside = (id) => {
    const tally = {};
    const stack = [...(kids.get(id) ?? [])];
    while (stack.length) { const c = stack.pop(); const k = byId.get(c).kind ?? ""; tally[k] = (tally[k] ?? 0) + 1; stack.push(...(kids.get(c) ?? [])); }
    return tally;
  };
  const nodes = graph.nodes.filter((n) => visible.has(n.id)).map((n) => {
    const hasKids = kids.has(n.id);
    const isOpen = hasKids && open.has(n.id);
    return { ...n, ...(hasKids ? { container: true, open: isOpen, ...(isOpen ? {} : { hidden: hiddenInside(n.id) }) } : {}) };
  });
  const merged = new Map();
  for (const e of graph.edges) {
    const s = shownAs(e.source), t = shownAs(e.target);
    if (s === undefined || t === undefined || s === t) continue;
    if (s === e.source && t === e.target) { merged.set(e.id, { ...e, count: 1 }); continue; }
    const key = `${s}->${t}::${e.label ?? ""}`;
    const prev = merged.get(key);
    if (prev) { prev.count += 1; prev.quiet = prev.quiet && Boolean(e.quiet); prev.members.push(e.id); }
    else merged.set(key, { ...e, id: key, source: s, target: t, count: 1, merged: true, members: [e.id], quiet: Boolean(e.quiet) });
  }
  const edges = [...merged.values()].map(({ count, members, ...e }) => ({ ...e, ...(e.merged && count > 1 ? { label: e.label ? `${e.label} ×${count}` : `×${count}` } : {}), ...(members ? { members } : {}) }));
  for (const n of nodes) if (n.open) for (const c of kids.get(n.id) ?? []) edges.push({ id: `contains::${c}`, source: n.id, target: c, containment: true });
  const counts = {};
  for (const n of graph.nodes) { const k = n.kind ?? ""; counts[k] ??= { shown: 0, total: 0 }; counts[k].total += 1; if (visible.has(n.id)) counts[k].shown += 1; }
  return { ...graph, nodes, edges, counts };
}

/** Lines a label takes in a box of this width (at most `max`; the full text is in the tooltip and panel). */
export function labelLines(label, { width = 250, charWidth = 7, max = 4 } = {}) {
  const perLine = Math.max(8, Math.floor((width - 24) / charWidth));
  return Math.min(max, Math.max(1, Math.ceil((label ?? "").length / perLine)));
}

/**
 * Box size for the lanes layout, from the text (no DOM): fixed width, the label on up to 4 lines,
 * and room for the whole open/close button text (`toggleText`), which is never cut off.
 */
export function estimateSize(node, { width = 250, kindLabel = "", charWidth = 7, toggleText = "" } = {}) {
  const lines = labelLines(node.label, { width, charWidth });
  let toggle = 0;
  if (node.container) {
    const text = node.open ? "▾ Close" : `▸ Open: ${toggleText}`;
    const perLine = Math.max(8, Math.floor((width - 40) / 6.6));
    toggle = 8 + 17 * Math.max(1, Math.ceil(text.length / perLine));
  }
  return { width, height: Math.round(17 + (kindLabel ? 15 : 0) + lines * 16.5 + toggle) };
}

/**
 * Lanes layout (layout.algorithm "lanes"): one column per lane, left to right; nodes without a lane
 * go to a shared column (by default in the middle, so links reach every lane). In a column each
 * top-level node is followed by its visible children, indented, in document order: an outline.
 * Containment links run down the left edge and across to each child; other links run between box
 * sides. Returns the ELK-like shape {width, height, children, routes, lanes}.
 */
export function laneLayout(graph, sizes, { indent = 26, gap = 8, rootGap = 18, laneGap = 110, header = 52, pad = 20 } = {}) {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const kids = childrenOf(graph);
  const declared = graph.layout?.lanes ?? [];
  const roots = kids.get("") ?? [];
  const sharedRoots = roots.filter((id) => !declared.some((l) => l.id === byId.get(id).lane));
  const lanes = declared.map((l) => ({ ...l }));
  if (sharedRoots.length) {
    const shared = graph.layout?.sharedLane ?? {};
    lanes.splice(Math.min(shared.index ?? Math.floor(lanes.length / 2), lanes.length), 0, { id: "", label: shared.label ?? "Shared", explain: shared.explain, shared: true });
  }
  const pos = {}, depth = {};
  let x = pad, height = 0;
  for (const lane of lanes) {
    let y = pad + header, width = 0;
    const laneRoots = lane.shared ? sharedRoots : roots.filter((id) => byId.get(id).lane === lane.id);
    const place = (id, d) => {
      const s = sizes[id] ?? { width: 250, height: 48 };
      pos[id] = { x: x + d * indent, y, width: s.width, height: s.height };
      depth[id] = d;
      width = Math.max(width, d * indent + s.width);
      y += s.height + gap;
      for (const c of kids.get(id) ?? []) place(c, d + 1);
    };
    laneRoots.forEach((id, i) => { if (i) y += rootGap; place(id, 0); });
    lane.x = x; lane.width = Math.max(width, 200);
    x += lane.width + laneGap;
    height = Math.max(height, y);
  }
  const routes = {};
  const mid = (p) => ({ x: p.x + p.width / 2, y: p.y + p.height / 2 });
  for (const e of graph.edges) {
    const a = pos[e.source], b = pos[e.target];
    if (!a || !b) continue;
    if (e.containment) {
      const cx = a.x + Math.min(indent / 2, 13), cy = b.y + b.height / 2;
      routes[e.id] = [{ x: cx, y: a.y + a.height }, { x: cx, y: cy }, { x: b.x, y: cy }];
      continue;
    }
    const ma = mid(a), mb = mid(b);
    if (Math.abs(ma.x - mb.x) < 1) {  // same column: loop out to the right
      const rx = Math.max(a.x + a.width, b.x + b.width) + 18;
      routes[e.id] = [{ x: a.x + a.width, y: ma.y }, { x: rx, y: ma.y }, { x: rx, y: mb.y }, { x: b.x + b.width, y: mb.y }];
      continue;
    }
    const rightward = ma.x < mb.x;
    const start = { x: rightward ? a.x + a.width : a.x, y: ma.y }, end = { x: rightward ? b.x : b.x + b.width, y: mb.y };
    const mx = (start.x + end.x) / 2;
    routes[e.id] = Math.abs(start.y - end.y) < 1 ? [start, end] : [start, { x: mx, y: start.y }, { x: mx, y: end.y }, end];
  }
  return {
    width: Math.max(x - laneGap + pad, 0), height: height + pad,
    children: Object.entries(pos).map(([id, p]) => ({ id, ...p, depth: depth[id] })),
    routes, lanes: lanes.map(({ id, label, explain, shared, x: lx, width }) => ({ id, label, explain, shared: Boolean(shared), x: lx, width })),
  };
}

/** The text to show for a node's source ({text, start, end, title, ref}), following source.from. */
export function resolveSource(graph, node) {
  const src = node?.source;
  if (!src) return null;
  let text = src.text;
  if (text === undefined && src.from !== undefined) text = graph.nodes.find((n) => n.id === src.from)?.source?.text;
  if (text === undefined) return null;
  const start = Math.max(0, Math.min(src.start ?? 0, text.length)), end = Math.max(start, Math.min(src.end ?? (src.start === undefined ? 0 : text.length), text.length));
  return { text, start, end, title: src.title, ref: src.ref };
}

// ---- Arc layout (0.13.0) ----------------------------------------------------------------------
// For a small network a person must read whole on a phone: the main nodes stand in one column,
// each link between them is an arc on the left (nested so arcs do not cross), with its words
// written along the arc; "side" nodes (node.side or kinds[kind].side, for example claims about
// several main nodes) stand in a narrow column on the right, level with the nodes they touch.
// The drawing stays about one column wide, so it fits a phone at close to full size. Arc diagrams:
// Wattenberg, "Arc Diagrams: Visualizing Structure in Strings" (InfoVis 2002).

/** Order main nodes to keep linked nodes close (fewest rows spanned in total); unlinked nodes stay first, in their order. */
export function arcOrder(ids, edges) {
  const linked = new Set(edges.flatMap((e) => [e.source, e.target]));
  const fixed = ids.filter((id) => !linked.has(id)), free = ids.filter((id) => linked.has(id));
  const cost = (order) => { const at = new Map(order.map((id, i) => [id, i])); return edges.reduce((t, e) => t + Math.abs(at.get(e.source) - at.get(e.target)), 0); };
  let best = free, bestCost = cost(free);
  if (free.length <= 8) {
    const permute = (rest, done) => {
      if (!rest.length) { const c = cost(done); if (c < bestCost) { best = done; bestCost = c; } return; }
      rest.forEach((id, i) => permute([...rest.slice(0, i), ...rest.slice(i + 1)], [...done, id]));
    };
    permute(free, []);
  }
  return [...fixed, ...best];
}

/**
 * Nest arcs: each arc ({id, a, b} with row a < b) gets a level one above every arc it overlaps
 * that was placed before it (shorter spans first), so inner arcs stay inside outer ones. Arcs that
 * only meet at a shared row may share a level.
 */
export function arcLevels(arcs) {
  const placed = [], level = {};
  for (const arc of [...arcs].sort((x, y) => (x.b - x.a) - (y.b - y.a) || x.a - y.a)) {
    const over = placed.filter((p) => p.a < arc.b && arc.a < p.b);
    level[arc.id] = Math.max(-1, ...over.map((p) => level[p.id])) + 1;
    placed.push(arc);
  }
  return level;
}

export function arcLayout(graph, sizes, { pad = 8, levelStep = 20, rowGap = 22, sideGap = 22, sideRowGap = 8 } = {}) {
  const isSide = (n) => Boolean(n.side ?? graph.kinds?.[n.kind]?.side);
  const size = (id) => sizes[id] ?? { width: 160, height: 48 };
  const mainIds = graph.nodes.filter((n) => !isSide(n)).map((n) => n.id);
  const mainSet = new Set(mainIds);
  const mainEdges = graph.edges.filter((e) => mainSet.has(e.source) && mainSet.has(e.target) && e.source !== e.target);
  const ordered = graph.nodes.some((n) => !isSide(n) && n.order !== undefined)
    ? [...mainIds].sort((a, b) => (graph.nodes.find((n) => n.id === a).order ?? Infinity) - (graph.nodes.find((n) => n.id === b).order ?? Infinity))
    : arcOrder(mainIds, mainEdges);
  const row = new Map(ordered.map((id, i) => [id, i]));
  const arcs = mainEdges.map((e) => ({ id: e.id, a: Math.min(row.get(e.source), row.get(e.target)), b: Math.max(row.get(e.source), row.get(e.target)) }));
  const level = arcLevels(arcs);
  const levels = arcs.length ? Math.max(...Object.values(level)) + 1 : 0;
  const x0 = pad + levels * levelStep + (levels ? 8 : 0);
  const mainWidth = Math.max(0, ...ordered.map((id) => size(id).width));
  const pos = {};
  let y = pad;
  for (const id of ordered) { const s = size(id); pos[id] = { x: x0, y, width: s.width, height: s.height }; y += s.height + rowGap; }
  // Side nodes: level with the mean centre of the main nodes they touch, pushed down to avoid overlap.
  const sideIds = graph.nodes.filter(isSide).map((n) => n.id);
  const sx = x0 + mainWidth + sideGap;
  const want = sideIds.map((id) => {
    const ends = graph.edges.filter((e) => e.source === id || e.target === id).map((e) => (e.source === id ? e.target : e.source)).filter((o) => pos[o]);
    const c = ends.length ? ends.reduce((t, o) => t + pos[o].y + pos[o].height / 2, 0) / ends.length : pad;
    return { id, c };
  }).sort((p, q) => p.c - q.c);
  let floor = pad;
  for (const { id, c } of want) { const s = size(id); const top = Math.max(floor, c - s.height / 2); pos[id] = { x: sx, y: top, width: s.width, height: s.height }; floor = top + s.height + sideRowGap; }
  // Ports: arcs meet each main node's left side, spread over its height; links to side nodes meet its right side.
  const routes = {}, labelAt = {};
  const leftPorts = new Map(), rightPorts = new Map();
  const add = (map, id, item) => { if (!map.has(id)) map.set(id, []); map.get(id).push(item); };
  for (const arc of arcs) {
    const e = mainEdges.find((m) => m.id === arc.id);
    for (const end of [e.source, e.target]) {
      const other = end === e.source ? e.target : e.source;
      const up = row.get(other) < row.get(end);
      add(leftPorts, end, { key: up ? -1000 - level[arc.id] : 1000 + level[arc.id], edge: e.id, end });
    }
  }
  const portY = (map, id, edgeId, end) => {
    const list = (map.get(id) ?? []).sort((p, q) => p.key - q.key);
    const i = list.findIndex((p) => p.edge === edgeId && p.end === end);
    const p = pos[id];
    return p.y + (p.height * (i + 1)) / (list.length + 1);
  };
  for (const e of graph.edges) {
    const s = pos[e.source], t = pos[e.target];
    if (!s || !t) continue;
    if (mainSet.has(e.source) && mainSet.has(e.target) && e.source !== e.target) {
      const xv = x0 - (level[e.id] + 1) * levelStep;
      const ys = portY(leftPorts, e.source, e.id, e.source), yt = portY(leftPorts, e.target, e.id, e.target);
      routes[e.id] = [{ x: x0, y: ys }, { x: xv, y: ys }, { x: xv, y: yt }, { x: x0, y: yt }];
      labelAt[e.id] = { x: xv, y: (ys + yt) / 2, rotate: -90, lo: Math.min(ys, yt), hi: Math.max(ys, yt), length: labelLength(e.label) };
      continue;
    }
    const mainEnd = mainSet.has(e.source) ? e.source : mainSet.has(e.target) ? e.target : null;
    if (mainEnd) add(rightPorts, mainEnd, { key: 0, edge: e.id, end: mainEnd });
  }
  for (const [id, list] of rightPorts) {
    // Spread side links over the right side in the order of the side node's height, so they do not cross there.
    list.forEach((p) => { const e = graph.edges.find((x) => x.id === p.edge); const o = pos[e.source === id ? e.target : e.source]; p.key = o.y + o.height / 2; });
  }
  for (const e of graph.edges) {
    if (routes[e.id]) continue;
    const s = pos[e.source], t = pos[e.target];
    if (!s || !t) continue;
    const mid = (p) => ({ x: p.x, y: p.y + p.height / 2 });
    if (mainSet.has(e.source) !== mainSet.has(e.target)) {
      const m = mainSet.has(e.source) ? e.source : e.target, o = m === e.source ? e.target : e.source;
      const at = { x: pos[m].x + pos[m].width, y: portY(rightPorts, m, e.id, m) }, far = mid(pos[o]);
      routes[e.id] = m === e.source ? [at, far] : [far, at];
    } else routes[e.id] = [mid(s), mid(t)];
  }
  separateArcLabels(labelAt, levelStep);
  const all = Object.values(pos);
  return {
    width: Math.max(...all.map((p) => p.x + p.width)) + pad,
    height: Math.max(...all.map((p) => p.y + p.height)) + pad,
    children: Object.entries(pos).map(([id, p]) => ({ id, ...p })),
    edges: [], routes, labelAt,
  };
}

/** Length in pixels of a link's words at the viewer's 11-11.5px label size, with its padding. */
export function labelLength(text) { return (text ?? "").length * 6.4 + 12; }

/**
 * Arc words run along their arcs; neighbouring arcs are one level apart, so words on arcs that
 * share rows would overlap. Slide each word along its own arc (inner arcs first) to the nearest
 * spot that clears the words already placed; a word that fits nowhere stays at its arc's middle.
 */
export function separateArcLabels(labelAt, levelStep, gap = 4, thickness = 20) {
  // A word with its background is about 18-19px thick, wider than one arc level (16px), so words on
  // neighbouring arcs clash too (measured on the qc theory, 2026-11-06: 2px overlap at level spacing).
  const placed = [];
  const clash = (a, b) => Math.abs(a.x - b.x) < Math.max(thickness, levelStep - 1) && Math.abs(a.y - b.y) < (a.length + b.length) / 2 + gap;
  for (const id of Object.keys(labelAt).sort((p, q) => labelAt[q].x - labelAt[p].x)) {
    const l = labelAt[id];
    if (l.lo === undefined) continue;
    const mid = (l.lo + l.hi) / 2, room = Math.max(0, (l.hi - l.lo - l.length) / 2);
    let best = mid;
    for (let step = 0; step <= room; step += 4) {
      const hit = [mid - step, mid + step].find((y) => !placed.some((p) => clash({ ...l, y }, p)));
      if (hit !== undefined) { best = hit; break; }
    }
    l.y = best;
    placed.push(l);
  }
  for (const l of Object.values(labelAt)) { delete l.lo; delete l.hi; delete l.length; }
  return labelAt;
}
