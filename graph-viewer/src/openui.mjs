// OpenUI custom component for graph-viewer: a model writes nodes and edges in OpenUI Lang,
// this turns them into typed-graph/v1 and mounts the real viewer. React, OpenUI's
// defineComponent, zod and the viewer's mount() are passed in, so this file loads in node
// (for prompts and parsing) and in a page (for drawing) without pulling either side in.

/** Every edge reads as one sentence, source first. Shown to the model in the component's description. */
export const EDGE_DIRECTION_RULE =
  "Each edge reads as a sentence: '<source> <label> <target>', e.g. source checkout, label 'depends on', target payments. " +
  "Use the relationship as the question states it, keep the same direction for every edge, and never reverse an edge to show flow.";

// Blue, orange, grey first (readable with red-green colour blindness), then further distinct hues.
const PALETTE = ["#3b78c4", "#e07b00", "#8a8f98", "#7a5cc2", "#2a9d8f", "#c25c8a"];

/**
 * OpenUI props → typed-graph/v1. Unknown kinds get a palette colour; legend entries name and explain kinds.
 * Edges get ids in order; edges naming a missing node are dropped and reported in `dropped`.
 * With no direction, layout is left unset so the viewer picks the layout that fits its frame.
 */
export function toTypedGraph({ nodes = [], edges = [], legend = [], direction } = {}) {
  const kinds = {};
  const kindOrder = [...new Set([...legend.map((l) => l.kind), ...nodes.map((n) => n.kind).filter(Boolean)])];
  kindOrder.forEach((kind, i) => {
    const entry = legend.find((l) => l.kind === kind);
    kinds[kind] = { label: entry?.label ?? kind, color: PALETTE[i % PALETTE.length], ...(entry?.explain ? { explain: entry.explain } : {}) };
  });
  const seen = new Set();
  const typedNodes = [];
  for (const n of nodes) {
    if (!n?.id || seen.has(n.id)) continue;
    seen.add(n.id);
    typedNodes.push({ id: n.id, label: n.label || n.id, ...(n.kind ? { kind: n.kind } : {}) });
  }
  const typedEdges = [];
  const dropped = [];
  edges.forEach((e, i) => {
    if (!seen.has(e?.source) || !seen.has(e?.target)) { dropped.push(e); return; }
    typedEdges.push({ id: `e${i + 1}`, source: e.source, target: e.target, ...(e.label ? { label: e.label } : {}) });
  });
  const graph = { schema: "typed-graph/v1", kinds, nodes: typedNodes, edges: typedEdges, ...(direction === "DOWN" || direction === "RIGHT" ? { layout: { direction } } : {}) };
  return { graph, dropped };
}

/** Builds the OpenUI `GraphViewer` component. `mount` is graph-viewer's mount (window.GraphViewer.mount from dist). */
export function defineGraphViewerComponent({ React, defineComponent, z, mount, height = 460 }) {
  function GraphViewerView({ props }) {
    const box = React.useRef(null);
    const viewer = React.useRef(null);
    const [problem, setProblem] = React.useState(null);
    // The model cannot see the frame: a fixed left-to-right chain wraps into loops in a narrow card.
    // Narrow frames leave the direction out so the viewer tries its layouts and keeps the best fit.
    const [wide, setWide] = React.useState(false);
    React.useLayoutEffect(() => { setWide((box.current?.clientWidth ?? 0) >= 800); }, []);
    const { graph, dropped } = toTypedGraph({ ...props, direction: wide ? props.direction : undefined });
    const key = JSON.stringify(graph);
    React.useEffect(() => {
      if (!box.current || !mount) return undefined;
      try {
        if (viewer.current) viewer.current.update(graph);
        else viewer.current = mount(box.current, { graph });
        if (props.focus) viewer.current.highlight?.([props.focus]);
        setProblem(null);
      } catch (err) { setProblem(String(err.message ?? err)); }
      return undefined;
    }, [key, props.focus]);
    React.useEffect(() => () => { viewer.current?.destroy(); viewer.current = null; }, []);
    const h = React.createElement;
    return h("div", { "data-component": "GraphViewer", "data-nodes": graph.nodes.length, "data-edges": graph.edges.length },
      props.title ? h("div", { style: { font: "600 13px sans-serif", margin: "0 0 6px" } }, props.title) : null,
      h("div", { ref: box, style: { height, borderRadius: 8, background: "#0b1520", overflow: "hidden" } }),
      problem || dropped.length
        ? h("div", { style: { font: "12px sans-serif", color: "#9a5a00", marginTop: 4 } }, problem ?? `${dropped.length} edge(s) named a node that is not listed and were left out`)
        : null);
  }
  return defineComponent({
    name: "GraphViewer",
    description: `Interactive node-and-link graph (layered layout, zoom, click to highlight neighbours). Use for dependency, propagation and network questions. ${EDGE_DIRECTION_RULE} Give nodes a kind to colour groups (e.g. affected vs unaffected) and explain each kind in legend.`,
    props: z.object({
      title: z.string().optional().describe("Short heading above the graph"),
      nodes: z.array(z.object({ id: z.string(), label: z.string().optional(), kind: z.string().optional() })).describe("Every entity once"),
      edges: z.array(z.object({ source: z.string(), target: z.string(), label: z.string() })).describe(EDGE_DIRECTION_RULE),
      legend: z.array(z.object({ kind: z.string(), label: z.string(), explain: z.string().optional() })).optional().describe("One entry per node kind"),
      focus: z.string().optional().describe("Node id the question starts from; it and its links are highlighted"),
      direction: z.enum(["RIGHT", "DOWN"]).optional().describe("Layout direction on wide frames; leave out to let the viewer pick the best fit")
    }),
    component: GraphViewerView
  });
}
