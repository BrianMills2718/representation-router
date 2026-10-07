// Shared graph viewer: one reusable renderer for typed graphs (typed-graph/v1).
// React Flow draws nodes and labels as DOM, so text stays crisp at any zoom;
// ELK lays out the real measured node sizes. The whole graph opens fitted to
// its frame and the reader zooms and pans inside it, like a map.
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ReactFlow, ReactFlowProvider, Background, Controls, MiniMap, Handle, Position, MarkerType,
  useNodesInitialized, useReactFlow, useNodesState, useEdgesState, BaseEdge, EdgeLabelRenderer,
} from "@xyflow/react";
import ELK from "elkjs/lib/elk.bundled.js";
import flowCss from "@xyflow/react/dist/style.css?inline";
import { validateTypedGraph, expandHyperedges, forceLayout, toElkGraph, positionsFromElk, routesFromElk, labelsFromElk, routePath, layoutCandidates, pickLayout, fitScale, litSet } from "./model.mjs";

const elk = new ELK();
const VIEWER_CSS = `
.gv-root{width:100%;height:100%;font-family:inherit}
/* Shield React Flow's SVGs from host-page rules such as svg{width:100%;height:auto},
   which squeeze each edge's SVG to zero size so no line paints. */
.gv-root svg{display:inline;width:auto;height:auto;max-width:none;max-height:none}
.gv-root .react-flow{--xy-background-color:transparent;--xy-background-color-default:transparent;background:transparent}
.gv-root .react-flow__attribution{display:none}
.gv-node{min-width:96px;max-width:220px;padding:7px 11px 8px;border-radius:10px;border:1.5px solid var(--gv-accent);background:var(--gv-node-bg,#0f1d2a);color:var(--gv-ink,#e8eef4);box-shadow:0 6px 18px rgba(0,0,0,.28);line-height:1.25;transition:opacity .15s,box-shadow .15s}
.gv-node.gv-dashed{border-style:dashed}
.gv-node.gv-hub{min-width:0;padding:4px 10px 5px;border-radius:999px;background:color-mix(in srgb,var(--gv-accent) 16%,var(--gv-node-bg,#0f1d2a))}
.gv-node.gv-hub .gv-label{font-size:12px}
.gv-node .gv-kind{display:block;font-size:10.5px;font-weight:600;letter-spacing:.02em;color:var(--gv-accent);margin-bottom:2px}
.gv-node .gv-label{display:block;font-size:13px;font-weight:600}
.gv-node.gv-lit{box-shadow:0 0 0 2px var(--gv-focus,#f2c86b)}
.gv-node.gv-selected{box-shadow:0 0 0 3px var(--gv-focus,#f2c86b),0 8px 22px rgba(0,0,0,.4)}
.gv-dim{opacity:.28}
.gv-root .react-flow__handle{opacity:0;width:6px;height:6px;border:0;min-width:0;min-height:0}
.gv-edge-label{position:absolute;pointer-events:all;padding:1px 5px;border-radius:4px;background:var(--gv-bg,#07111a);color:var(--gv-edge-text,#b9c9d5);font-size:11.5px;white-space:nowrap}
.gv-root .react-flow__edge-textbg{fill:var(--gv-bg,#07111a)}
.gv-root .react-flow__edge-text{fill:var(--gv-edge-text,#b9c9d5);font-size:11.5px}
.gv-root .react-flow__controls button{background:var(--gv-node-bg,#0f1d2a);color:var(--gv-ink,#e8eef4);border-color:var(--gv-line,#1e3346)}
.gv-root .react-flow__controls button svg{fill:currentColor}
.gv-node{position:relative}.gv-tip{visibility:hidden;opacity:0;position:absolute;left:50%;bottom:calc(100% + 8px);transform:translateX(-50%);width:max-content;max-width:280px;white-space:normal;background:var(--gv-ink,#e8eef4);color:var(--gv-bg,#07111a);padding:6px 9px;border-radius:6px;font-size:12.5px;line-height:1.35;font-weight:400;text-align:left;z-index:20;pointer-events:none;transition:opacity .08s}.gv-node:hover .gv-tip,.gv-node:focus .gv-tip,.gv-selected .gv-tip{visibility:visible;opacity:1}.gv-root .react-flow__node:hover,.gv-root .react-flow__node:focus-within{z-index:1000!important}.gv-root .react-flow__minimap{background:var(--gv-bg,#07111a);border:1px solid var(--gv-line,#1e3346);border-radius:8px}
`;

function injectCss() {
  if (document.getElementById("graph-viewer-css")) return;
  const style = document.createElement("style");
  style.id = "graph-viewer-css";
  style.textContent = flowCss + VIEWER_CSS;
  document.head.append(style);
}

function TypedNode({ data }) {
  const vertical = data.direction === "DOWN";
  return (
    <div className={`gv-node${data.hub ? " gv-hub" : ""}${data.dashed ? " gv-dashed" : ""}${data.selected ? " gv-selected" : ""}${data.lit ? " gv-lit" : ""}${data.dim ? " gv-dim" : ""}`}
      style={{ "--gv-accent": data.color }} tabIndex={0} aria-label={data.explain ? `${data.label}: ${data.explain}` : data.label}>
      {data.explain ? <span className="gv-tip" role="tooltip">{data.explain}</span> : null}
      <Handle type="target" position={vertical ? Position.Top : Position.Left} isConnectable={false} />
      {data.kindLabel ? <span className="gv-kind">{data.kindLabel}</span> : null}
      <span className="gv-label">{data.label}</span>
      <Handle type="source" position={vertical ? Position.Bottom : Position.Right} isConnectable={false} />
    </div>
  );
}
const nodeTypes = { typed: TypedNode };

// Draws the route ELK computed (orthogonal, rounded corners), so wrapped rows
// and long links never loop back across boxes.
function ElkEdge({ id, data, markerEnd, style, label, labelStyle }) {
  const route = routePath(data?.points ?? []);
  const d = route.d, labelX = data?.labelAt?.x ?? route.labelX, labelY = data?.labelAt?.y ?? route.labelY;
  if (!d) return null;
  return (
    <>
      <BaseEdge id={id} path={d} markerEnd={markerEnd} style={style} />
      {label ? (
        <EdgeLabelRenderer>
          <div className="gv-edge-label nodrag nopan" style={{ transform: `translate(-50%,-50%) translate(${labelX}px,${labelY}px)`, ...labelStyle }}>{label}</div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}
const edgeTypes = { elk: ElkEdge };

function buildNodes(graph, selected, related) {
  const kinds = graph.kinds ?? {};
  const direction = graph.layout?.direction ?? "RIGHT";
  return graph.nodes.map((node) => {
    const kind = kinds[node.kind] ?? {};
    return {
      id: node.id,
      type: "typed",
      position: { x: 0, y: 0 },
      style: { visibility: "hidden" },
      data: {
        label: node.label, kindLabel: kind.label ?? node.kind ?? "", color: kind.color ?? "#5bc0d4",
        dashed: node.dashed ?? kind.dashed ?? false, explain: node.explain ?? kind.explain, direction, hub: Boolean(node.hub),
        selected: selected === node.id, dim: Boolean(related) && !related.has(node.id),
      },
    };
  });
}

function buildEdges(graph, selected, related, routes = {}, labelAt = {}) {
  return graph.edges.map((edge) => {
    const on = selected === edge.id || (Boolean(related) && related.has(edge.id));
    const dim = Boolean(related) && !on;
    const color = on ? "var(--gv-focus,#f2c86b)" : edge.dashed ? "var(--gv-ext,#6f8394)" : "var(--gv-edge,#5bc0d4)";
    return {
      id: edge.id, source: edge.source, target: edge.target, label: edge.label, type: routes[edge.id] ? "elk" : "default", data: { points: routes[edge.id], labelAt: labelAt[edge.id] },
      markerEnd: { type: MarkerType.ArrowClosed, color, width: 16, height: 16 },
      style: { stroke: color, strokeWidth: on ? 2.6 : 1.6, strokeDasharray: edge.dashed ? "6 4" : undefined, opacity: dim ? 0.25 : 1 },
      labelStyle: { opacity: dim ? 0.3 : 1 }, labelBgPadding: [4, 2], labelBgBorderRadius: 4,
    };
  });
}

// Measures edge-label text in the page's font so ELK can reserve the right room.
function measureLabels(graph, el) {
  const ctx = document.createElement("canvas").getContext("2d");
  const family = el ? getComputedStyle(el).fontFamily : "sans-serif";
  ctx.font = `11.5px ${family}`;
  return Object.fromEntries(graph.edges.filter((e) => e.label).map((e) => [e.id, { width: Math.ceil(ctx.measureText(e.label).width) + 12, height: 20 }]));
}

function Viewer({ graph, onSelect, onLayout, api }) {
  const [selected, setSelected] = useState(null);
  const [highlight, setHighlight] = useState(null);
  const related = useMemo(() => litSet(graph, selected, highlight), [graph, selected, highlight]);
  const [nodes, setNodes, onNodesChange] = useNodesState(buildNodes(graph, null, null));
  const [edges, setEdges] = useEdgesState(buildEdges(graph, null, null));
  const [laidOut, setLaidOut] = useState(false);
  const [routes, setRoutes] = useState({});
  const [labelAt, setLabelAt] = useState({});
  const [zoom, setZoom] = useState(1);
  const [fitZoom, setFitZoom] = useState(1);
  const initialized = useNodesInitialized();
  const flow = useReactFlow();
  const wrap = useRef(null);
  const drawing = useRef(null);
  // Fit the whole drawing ELK produced, routes included (React Flow's own fitView
  // sees only the boxes, so wrapped routes below the last box were cut off). Never
  // enlarge past 100%. Remember the fitted zoom: the minimap appears only past it.
  const fitNow = useCallback((duration = 0) => {
    const el = wrap.current, d = drawing.current;
    if (!el || !d) return;
    const frame = { width: el.clientWidth, height: el.clientHeight };
    const zoom = Math.min(fitScale(d, frame), 1);
    flow.setViewport({ x: (frame.width - d.width * zoom) / 2, y: (frame.height - d.height * zoom) / 2, zoom }, { duration });
    setFitZoom(zoom);
  }, [flow]);
  const fit = useCallback(() => fitNow(200), [fitNow]);

  useEffect(() => { setLaidOut(false); setSelected(null); setNodes(buildNodes(graph, null, null)); setEdges(buildEdges(graph, null, null)); }, [graph, setNodes, setEdges]);

  // Lay out real measured sizes once the DOM nodes exist, then fit.
  useEffect(() => {
    if (!initialized || laidOut) return;
    const sizes = Object.fromEntries(flow.getNodes().map((n) => [n.id, { width: n.measured?.width ?? 160, height: n.measured?.height ?? 48 }]));
    const box = wrap.current?.getBoundingClientRect();
    const aspectRatio = box && box.height > 0 ? Math.max(box.width / box.height, 0.5) : 1.6;
    let cancelled = false;
    const labelSizes = measureLabels(graph, wrap.current);
    const frame = { width: box?.width || 800, height: box?.height || 500 };
    const runs = graph.layout?.algorithm === "force"
      ? [Promise.resolve(forceLayout(graph, sizes))]
      : layoutCandidates(graph).map((c) => elk.layout(toElkGraph(graph, sizes, { aspectRatio, labelSizes, ...c })));
    Promise.all(runs)
      .then((layouts) => pickLayout(layouts, frame))
      .then((layout) => {
      if (cancelled) return;
      const pos = positionsFromElk(layout);
      drawing.current = { width: layout.width ?? 0, height: layout.height ?? 0 };
      setNodes((current) => current.map((n) => ({ ...n, position: pos[n.id] ?? n.position, style: {} })));
      setRoutes(routesFromElk(layout));
      setLabelAt(labelsFromElk(layout));
      setLaidOut(true);
      // Lets the page size its frame to the drawing before the fit.
      onLayout?.({ width: layout.width ?? 0, height: layout.height ?? 0 });
      requestAnimationFrame(() => fitNow());
    });
    return () => { cancelled = true; };
  }, [initialized, laidOut, graph, flow, fitNow, setNodes]);

  useEffect(() => {
    if (!laidOut) return;
    setNodes((current) => current.map((n) => ({ ...n, data: { ...n.data, selected: selected === n.id, lit: !selected && Boolean(highlight?.has(n.id)), dim: Boolean(related) && !related.has(n.id) } })));
    setEdges(buildEdges(graph, selected, related, routes, labelAt));
  }, [selected, highlight, related, laidOut, graph, routes, labelAt, setNodes, setEdges]);

  useEffect(() => {
    const el = wrap.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => { if (laidOut) fitNow(); });
    observer.observe(el);
    return () => observer.disconnect();
  }, [laidOut, fitNow]);

  useEffect(() => {
    api.fit = fit;
    api.select = (id) => setSelected(id ?? null);
    api.highlight = (ids) => { setSelected(null); setHighlight(ids && ids.length ? new Set(ids) : null); };
  }, [api, fit]);

  const pick = (type, id) => { setSelected(id); onSelect?.({ type, id }); };
  return (
    <div className="gv-root" ref={wrap}>
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes} onNodesChange={onNodesChange}
        nodesDraggable={false} nodesConnectable={false} elementsSelectable={false} minZoom={0.05} maxZoom={2.5}
        onNodeClick={(_, n) => pick("node", n.id)} onEdgeClick={(_, e) => pick("edge", e.id)} onPaneClick={() => { setSelected(null); onSelect?.(null); }} onMove={(_, vp) => setZoom(vp.zoom)}
        proOptions={{ hideAttribution: true }} colorMode="dark" fitView>
        <Background gap={18} size={1} color="var(--gv-dots,#1c3042)" />
        <Controls showInteractive={false} position="top-right" onFitView={fit} />
        {zoom > fitZoom * 1.15 ? <MiniMap pannable zoomable position="bottom-right" style={{ width: 150, height: 96 }} nodeColor={(n) => n.data?.color ?? "#5bc0d4"} maskColor="rgba(7,13,20,.6)" /> : null}
      </ReactFlow>
    </div>
  );
}

/**
 * Mount a viewer into `element`. `onLayout({width, height})` reports the drawing's
 * natural size once laid out, so a page can size the frame. Returns { update(graph), fit(), select(id), destroy() }.
 * Throws with the list of problems when the graph does not meet typed-graph/v1.
 */
export function mount(element, { graph, onSelect, onLayout } = {}) {
  injectCss();
  const check = (g) => { const problems = validateTypedGraph(g); if (problems.length) throw new Error(`graph-viewer: invalid typed graph: ${problems.join("; ")}`); };
  check(graph);
  const root = createRoot(element);
  const api = { fit() {}, select() {}, highlight() {} };
  const render = (g) => root.render(<ReactFlowProvider><Viewer graph={g} onSelect={onSelect} onLayout={onLayout} api={api} /></ReactFlowProvider>);
  render(expandHyperedges(graph));
  return {
    update(next) { check(next); render(expandHyperedges(next)); },
    fit: () => api.fit(),
    select: (id) => api.select(id),
    // Light up these node and edge ids and dim the rest; null or [] clears it.
    highlight: (ids) => api.highlight(ids),
    destroy: () => root.unmount(),
  };
}

export { validateTypedGraph, expandHyperedges };
export const version = "0.7.0";

