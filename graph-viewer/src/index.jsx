// Shared graph viewer: one reusable renderer for typed graphs (typed-graph/v1).
// React Flow draws nodes and labels as DOM, so text stays crisp at any zoom;
// ELK lays out the real measured node sizes. The whole graph opens fitted to
// its frame and the reader zooms and pans inside it, like a map. Boxes and hubs
// can be dragged; links follow them.
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ReactFlow, ReactFlowProvider, Background, Controls, MiniMap, Handle, Position, MarkerType,
  useNodesInitialized, useReactFlow, useNodesState, useEdgesState, BaseEdge, EdgeLabelRenderer,
} from "@xyflow/react";
import ELK from "elkjs/lib/elk.bundled.js";
import flowCss from "@xyflow/react/dist/style.css?inline";
import { arcLayout, edgeLine, isLargeGraph, validateTypedGraph, expandHyperedges, forceLayout, toElkGraph, positionsFromElk, routesFromElk, labelsFromElk, routePath, layoutCandidates, pickLayout, fitScale, fitViewport, litSet, relatedTo, dropRoutesTouching, defaultOpen, openToKind, ancestorsOf, visibleGraph, laneLayout, estimateSize, labelLines, resolveSource } from "./model.mjs";

const elk = new ELK();
// Full-page mode never fits below this zoom: 13px labels stay about 11px or larger on screen.
const READABLE_ZOOM = 0.85;
const VIEWER_CSS = `
.gv-root{position:relative;width:100%;height:100%;font-family:inherit}
/* Shield React Flow's SVGs from host-page rules such as svg{width:100%;height:auto},
   which squeeze each edge's SVG to zero size so no line paints. */
.gv-root svg{display:inline;width:auto;height:auto;max-width:none;max-height:none}
.gv-root .react-flow{--xy-background-color:transparent;--xy-background-color-default:transparent;background:transparent}
.gv-root .react-flow__attribution{display:none}
.gv-node{min-width:96px;max-width:220px;padding:7px 11px 8px;border-radius:10px;border:1.5px solid var(--gv-accent);background:color-mix(in srgb,var(--gv-accent) var(--gv-node-tint,0%),var(--gv-node-bg,#0f1d2a));color:var(--gv-ink,#e8eef4);box-shadow:0 6px 18px rgba(0,0,0,.28);line-height:1.25;transition:opacity .15s,box-shadow .15s}
.gv-node.gv-dashed{border-style:dashed}
.gv-node.gv-hub{min-width:0;padding:4px 10px 5px;border-radius:999px;background:color-mix(in srgb,var(--gv-accent) 16%,var(--gv-node-bg,#0f1d2a))}
.gv-node.gv-hub .gv-label{font-size:12px}
/* 0.12.0: diamond nodes (a claim, decision or proposition) and a heavy border for the one node a drawing is about */
.gv-node.gv-diamond{min-width:0;max-width:170px;border:0;background:none;box-shadow:none;padding:20px 30px;text-align:center}
.gv-node.gv-diamond::before,.gv-node.gv-diamond::after{content:"";position:absolute;clip-path:polygon(50% 0,100% 50%,50% 100%,0 50%);pointer-events:none}
.gv-node.gv-diamond::before{inset:0;background:var(--gv-accent)}
.gv-node.gv-diamond::after{inset:2.5px;background:color-mix(in srgb,var(--gv-accent) var(--gv-diamond-tint,18%),var(--gv-node-bg,#0f1d2a))}
.gv-node.gv-diamond.gv-strong::after{inset:5px}
.gv-node.gv-diamond>.gv-kind,.gv-node.gv-diamond>.gv-label{position:relative;z-index:1}
.gv-node.gv-diamond.gv-selected,.gv-node.gv-diamond.gv-lit{box-shadow:none;filter:drop-shadow(0 0 3px var(--gv-focus,#f2c86b)) drop-shadow(0 0 1px var(--gv-focus,#f2c86b))}
.gv-node.gv-strong{border-width:4px}
.gv-node .gv-kind{display:block;font-size:10.5px;font-weight:600;letter-spacing:.02em;color:color-mix(in srgb,var(--gv-accent) 65%,var(--gv-ink,#e8eef4));margin-bottom:2px}
.gv-node .gv-label{display:block;font-size:13px;font-weight:600}
.gv-node.gv-lit{box-shadow:0 0 0 2px var(--gv-focus,#f2c86b)}
.gv-node.gv-selected{box-shadow:0 0 0 3px var(--gv-focus,#f2c86b),0 8px 22px rgba(0,0,0,.4)}
.gv-dim{opacity:.28}
.gv-root .react-flow__node.dragging .gv-node{cursor:grabbing;box-shadow:0 10px 26px rgba(0,0,0,.45)}
.gv-root .react-flow__node{cursor:grab}
.gv-root .react-flow__handle{opacity:0;width:6px;height:6px;border:0;min-width:0;min-height:0}
.gv-edge-label{position:absolute;pointer-events:all;padding:1px 5px;border-radius:4px;background:var(--gv-bg,#07111a);color:var(--gv-edge-text,#b9c9d5);font-size:11.5px;white-space:nowrap}
.gv-root .react-flow__edge-textbg{fill:var(--gv-bg,#07111a)}
.gv-root .react-flow__edge-text{fill:var(--gv-edge-text,#b9c9d5);font-size:11.5px}
.gv-root .react-flow__controls button{background:var(--gv-node-bg,#0f1d2a);color:var(--gv-ink,#e8eef4);border-color:var(--gv-line,#1e3346)}
.gv-root .react-flow__controls button svg{fill:currentColor}
.gv-node{position:relative}.gv-tip{visibility:hidden;opacity:0;position:absolute;left:50%;bottom:calc(100% + 8px);transform:translateX(-50%);width:max-content;max-width:280px;white-space:normal;background:var(--gv-ink,#e8eef4);color:var(--gv-bg,#07111a);padding:6px 9px;border-radius:6px;font-size:12.5px;line-height:1.35;font-weight:400;text-align:left;z-index:20;pointer-events:none;transition:opacity .08s}.gv-node:hover .gv-tip,.gv-node:focus .gv-tip,.gv-selected .gv-tip{visibility:visible;opacity:1}.gv-root .react-flow__node:hover,.gv-root .react-flow__node:focus-within{z-index:1000!important}.gv-root .react-flow__minimap{background:var(--gv-bg,#07111a);border:1px solid var(--gv-line,#1e3346);border-radius:8px}
/* 0.9.0: whole documents (lanes, closed containers, details panel, toolbar) */
.gv-lanes-root{display:flex;flex-direction:column;width:100%;height:100%}
.gv-lanes-root>.gv-canvas{position:relative;flex:1;min-height:0}
.gv-toolbar{display:flex;flex-wrap:wrap;align-items:center;gap:4px 6px;padding:6px 8px;border-bottom:1px solid var(--gv-line,#1e3346);background:var(--gv-bg,#07111a);color:var(--gv-ink,#e8eef4);font-size:12.5px}
.gv-toolbar .gv-summary{font-weight:600;margin-right:4px}
.gv-kinds{display:contents}.gv-kinds>summary{cursor:pointer;font-size:12px;color:var(--gv-edge-text,#b9c9d5)}
.gv-kinds>summary{margin-right:4px}
@media (max-width:700px){.gv-kinds{display:block;order:9;width:100%}.gv-kinds .gv-chip{margin:2px 4px 0 0}}
.gv-chip{display:inline-flex;align-items:center;gap:5px;padding:1px 3px 1px 7px;font-size:12px;border:1px solid var(--gv-line,#1e3346);border-radius:999px;background:var(--gv-node-bg,#0f1d2a);white-space:nowrap}
.gv-chip .gv-swatch{width:10px;height:10px;border-radius:3px;border:2px solid var(--gv-accent);background:color-mix(in srgb,var(--gv-accent) 35%,transparent)}
.gv-chip .gv-swatch.gv-dashed{border-style:dashed}
.gv-chip .gv-n{color:var(--gv-edge-text,#b9c9d5)}
.gv-btn{font:inherit;font-size:11.5px;padding:1px 8px;border-radius:999px;border:1px solid var(--gv-line,#1e3346);background:var(--gv-bg,#07111a);color:var(--gv-ink,#e8eef4);cursor:pointer}
.gv-btn:hover,.gv-btn:focus-visible{border-color:var(--gv-focus,#f2c86b);outline:none}
.gv-node.gv-fixed{box-sizing:border-box;max-width:none;min-width:0;display:flex;flex-direction:column;overflow:visible}
.gv-node.gv-fixed .gv-label{display:-webkit-box;-webkit-box-orient:vertical;overflow:hidden;font-size:12.5px;font-weight:500}
.gv-node.gv-fixed .gv-kind{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gv-toggle{margin-top:auto;align-self:flex-start;max-width:100%;display:block;white-space:normal;overflow-wrap:anywhere;text-align:left;font:inherit;font-size:11.5px;padding:1px 8px;border-radius:9px;border:1px solid var(--gv-accent);background:var(--gv-bg,#07111a);color:var(--gv-ink,#e8eef4);cursor:pointer}
.gv-toggle:hover,.gv-toggle:focus-visible{border-color:var(--gv-focus,#f2c86b);outline:none}
.gv-lane{font-size:15px;font-weight:700;color:var(--gv-ink,#e8eef4);border-bottom:2px solid var(--gv-line,#1e3346);padding:4px 2px 6px;cursor:help;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gv-lane.gv-shared{color:var(--gv-shared,#4c8ed9)}
.gv-root .react-flow__node-lane{cursor:help}
.gv-panel{position:absolute;top:0;right:0;bottom:0;width:min(400px,46%);overflow:auto;z-index:5;padding:14px 16px 24px;background:var(--gv-bg,#07111a);color:var(--gv-ink,#e8eef4);border-left:1px solid var(--gv-line,#1e3346);box-shadow:-10px 0 24px rgba(0,0,0,.3);font-size:13px;line-height:1.45}
.gv-panel h3{margin:2px 28px 8px 0;font-size:15px;line-height:1.35}
.gv-panel h4{margin:14px 0 4px;font-size:12.5px;color:var(--gv-edge-text,#b9c9d5)}
.gv-panel .gv-kind{font-size:11.5px;font-weight:700}
.gv-panel .gv-explain{margin:0 0 8px;color:var(--gv-edge-text,#b9c9d5)}
.gv-panel dl{display:grid;grid-template-columns:fit-content(45%) minmax(0,1fr);gap:3px 10px;margin:6px 0}
.gv-panel dt{color:var(--gv-edge-text,#b9c9d5)}.gv-panel dd{margin:0;overflow-wrap:anywhere}
.gv-panel .gv-ref{font-size:11.5px;color:var(--gv-edge-text,#b9c9d5);margin-bottom:4px;overflow-wrap:anywhere}
.gv-source{white-space:pre-wrap;overflow-wrap:anywhere;font-family:inherit;font-size:13px;margin:0;padding:8px 10px;border:1px solid var(--gv-line,#1e3346);border-radius:6px;background:var(--gv-node-bg,#0f1d2a)}
.gv-source mark{background:var(--gv-focus,#f2c86b);color:#111;border-radius:2px;padding:0 1px}
.gv-panel.gv-wide{width:min(860px,72%)}
.gv-compare{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px}
.gv-compare>section{min-width:0}.gv-compare .gv-source{max-height:46vh;overflow:auto}
.gv-links{display:flex;flex-direction:column;gap:4px;margin:6px 0 10px}
.gv-links .gv-btn{text-align:left;border-radius:6px;padding:4px 8px;border-left:4px solid var(--gv-accent,#5bc0d4)}
.gv-linkword{font-weight:700}
@media (max-width:700px){.gv-panel.gv-wide{width:auto}.gv-compare{grid-template-columns:1fr}}
.gv-close{position:absolute;top:8px;right:10px;font-size:18px;line-height:1;padding:2px 8px}
/* 0.14.0: full-page mode. The host element covers the whole window; Esc or the button closes it. */
.gv-shell{position:relative;width:100%;height:100%}
.gv-fullbtn{position:absolute;top:8px;left:8px;z-index:6;display:inline-flex;align-items:center;gap:6px;padding:6px 11px;font:600 13px/1.2 inherit;font-family:inherit;color:var(--gv-ink,#e8eef4);background:var(--gv-node-bg,#0f1d2a);border:1px solid var(--gv-line-strong,#3a5266);border-radius:8px;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.3)}
.gv-fullbtn:hover,.gv-fullbtn:focus-visible{border-color:var(--gv-focus,#f2c86b);outline:none}
.gv-shell-lanes>.gv-fullbtn{top:auto;bottom:12px;left:auto;right:12px}
.gv-fullpage{position:fixed!important;top:0!important;left:0!important;right:0!important;bottom:0!important;width:100vw!important;height:100vh!important;height:100dvh!important;max-width:none!important;max-height:none!important;margin:0!important;border:0!important;border-radius:0!important;z-index:2147483000!important;background:var(--gv-bg,#07111a)!important}
html.gv-noscroll,html.gv-noscroll body{overflow:hidden!important}
@media (max-width:700px){.gv-panel{top:auto;left:0;width:auto;height:55%;border-left:0;border-top:1px solid var(--gv-line,#1e3346)}}
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
  const fixed = data.box ? { width: data.box.width, height: data.box.height } : undefined;
  return (
    <div className={`gv-node${data.hub ? " gv-hub" : ""}${data.dashed ? " gv-dashed" : ""}${data.shape === "diamond" ? " gv-diamond" : ""}${data.strong ? " gv-strong" : ""}${data.box ? " gv-fixed" : ""}${data.selected ? " gv-selected" : ""}${data.lit ? " gv-lit" : ""}${data.dim ? " gv-dim" : ""}`}
      style={{ "--gv-accent": data.color, ...fixed }} tabIndex={0} aria-label={data.explain ? `${data.label}: ${data.explain}` : data.label}>
      {data.explain ? <span className="gv-tip" role="tooltip">{data.explain}</span> : null}
      <Handle type="target" position={vertical ? Position.Top : Position.Left} isConnectable={false} />
      {data.kindLabel ? <span className="gv-kind">{data.kindLabel}</span> : null}
      <span className="gv-label" style={data.lines ? { WebkitLineClamp: data.lines } : undefined}>{data.label}</span>
      {data.container ? (
        <button type="button" className="gv-toggle nodrag" title={data.open ? "Hide what this holds (it stays counted)" : `Show what this holds: ${data.hiddenText}`}
          onClick={(ev) => { ev.stopPropagation(); data.onToggle?.(); }}>
          {data.open ? "▾ Close" : `▸ Open: ${data.hiddenText}`}
        </button>
      ) : null}
      <Handle type="source" position={vertical ? Position.Bottom : Position.Right} isConnectable={false} />
    </div>
  );
}
function LaneHeader({ data }) {
  return <div className={`gv-lane${data.shared ? " gv-shared" : ""}`} style={{ width: data.width }} title={data.explain ?? data.label}>{data.label}</div>;
}
const nodeTypes = { typed: TypedNode, lane: LaneHeader };

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
          <div className="gv-edge-label nodrag nopan" style={{ transform: `translate(-50%,-50%) translate(${labelX}px,${labelY}px)${data?.labelAt?.rotate ? ` rotate(${data.labelAt.rotate}deg)` : ""}`, ...labelStyle }}>{label}</div>
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
        shape: node.shape ?? kind.shape, strong: Boolean(node.strong ?? kind.strong),
        selected: selected === node.id, dim: Boolean(related) && !related.has(node.id),
      },
    };
  });
}

function buildEdges(graph, selected, related, routes = {}, labelAt = {}) {
  const large = isLargeGraph(graph);
  return graph.edges.map((edge) => {
    const on = selected === edge.id || (Boolean(related) && related.has(edge.id));
    const dim = Boolean(related) && !on;
    const color = on ? "var(--gv-focus,#f2c86b)" : edge.color ?? (edge.dashed ? "var(--gv-ext,#6f8394)" : "var(--gv-edge,#5bc0d4)");
    const line = edgeLine(edge), width = edge.width ?? 1.6;
    return {
      id: edge.id, source: edge.source, target: edge.target, label: large && !on ? undefined : edge.label, type: routes[edge.id] ? "elk" : "default", data: { points: routes[edge.id], labelAt: labelAt[edge.id] },
      ...(line.arrow ? { markerEnd: { type: MarkerType.ArrowClosed, color, width: 16, height: 16 } } : {}),
      style: { stroke: color, strokeWidth: on ? width + 1 : width, strokeDasharray: line.dash, strokeLinecap: line.cap, opacity: dim ? 0.25 : 1 },
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

function Viewer({ graph, onSelect, onLayout, api, panel = true }) {
  const [selected, setSelected] = useState(null);
  const [highlight, setHighlight] = useState(null);
  const related = useMemo(() => litSet(graph, selected, highlight), [graph, selected, highlight]);
  const byId = useMemo(() => new Map(graph.nodes.map((n) => [n.id, n])), [graph]);
  const edgeById = useMemo(() => new Map(graph.edges.map((e) => [e.id, e])), [graph]);
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
    // Full page (0.14.0): never shrink words below a readable size; the reader pans to the rest.
    const vp = fitViewport(d, frame, { readable: api.fullPage ? READABLE_ZOOM : 0 });
    flow.setViewport(vp, { duration });
    setFitZoom(vp.zoom);
  }, [flow, api]);
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
    const runs = graph.layout?.algorithm === "arc"
      ? [Promise.resolve(arcLayout(graph, sizes))]
      : graph.layout?.algorithm === "force"
      ? [Promise.resolve(forceLayout(graph, sizes))]
      : layoutCandidates(graph).map((c) => elk.layout(toElkGraph(graph, sizes, { aspectRatio, labelSizes, ...c })).catch((err) => {
          console.error(`graph-viewer: ELK layout failed for ${JSON.stringify(c)}: ${err?.message ?? err}`);
          return null;
        }));
    Promise.all(runs)
      // One failed candidate must not leave every box on one spot: use the rest, and the force layout if none is left.
      .then((layouts) => { const usable = layouts.filter(Boolean); return usable.length ? pickLayout(usable, frame) : forceLayout(graph, sizes); })
      .then((layout) => {
      if (cancelled) return;
      const pos = positionsFromElk(layout);
      drawing.current = { width: layout.width ?? 0, height: layout.height ?? 0 };
      setNodes((current) => current.map((n) => ({ ...n, position: pos[n.id] ?? n.position, style: {} })));
      setRoutes(layout.routes ?? routesFromElk(layout));
      setLabelAt(layout.labelAt ?? labelsFromElk(layout));
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
  // Dragging a box or hub: its links follow. Stored ELK routes for links touching it would
  // still point at the old place, so drop them and let those links draw straight.
  const dragged = useRef(false);
  const onNodeDragStart = useCallback((_, node, moving) => {
    dragged.current = true;
    const ids = (moving?.length ? moving : [node]).map((n) => n.id);
    const next = dropRoutesTouching(graph, routes, labelAt, ids);
    if (next.dropped.length) { setRoutes(next.routes); setLabelAt(next.labelAt); }
  }, [graph, routes, labelAt]);
  // A drag is not a click: ignore the click the browser may send when the drag ends.
  const onNodeDragStop = useCallback(() => { setTimeout(() => { dragged.current = false; }, 0); }, []);
  const onNodeClick = useCallback((_, n) => { if (dragged.current) return; pick("node", n.id); }, [pick]);
  return (
    <div className="gv-root" ref={wrap}>
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes} onNodesChange={onNodesChange}
        // A tap on a phone moves a pixel or two; counting that as a drag dropped the link routes and
        // scrambled the drawing (0.14.1). Drags start after 6px, and arc layouts, whose places carry
        // meaning, do not drag at all; a tap that moves up to 8px still counts as a click.
        nodesDraggable={graph.layout?.algorithm !== "arc"} nodeDragThreshold={6} nodeClickDistance={8} paneClickDistance={8} nodesConnectable={false} elementsSelectable={false} minZoom={0.05} maxZoom={2.5}
        onNodeDragStart={onNodeDragStart} onNodeDragStop={onNodeDragStop}
        onNodeClick={onNodeClick} onEdgeClick={(_, e) => pick("edge", e.id)} onPaneClick={() => { setSelected(null); onSelect?.(null); }} onMove={(_, vp) => setZoom(vp.zoom)}
        proOptions={{ hideAttribution: true }} colorMode="dark" fitView>
        <Background gap={18} size={1} color="var(--gv-dots,#1c3042)" />
        <Controls showInteractive={false} position="top-right" onFitView={fit} />
        {zoom > fitZoom * 1.15 ? <MiniMap pannable zoomable position="bottom-right" style={{ width: 150, height: 96 }} nodeColor={(n) => n.data?.color ?? "#5bc0d4"} maskColor="rgba(7,13,20,.6)" /> : null}
      </ReactFlow>
      {panel ? <DetailsPanel graph={graph} byId={byId} edgeById={edgeById} id={selected && (byId.has(selected) || edgeById.has(selected)) ? selected : null} onLink={(eid) => setSelected(eid)} onGo={(nid) => setSelected(nid)} onClose={() => { setSelected(null); onSelect?.(null); }} /> : null}
    </div>
  );
}


// Details of the selected node: what it is, its rows, and the exact source text with the span
// it rests on highlighted (scrolled into view). Shown for any node with details or a source.
function SourceText({ src, markRef, title }) {
  return (
    <section>
      <h4>{title ?? src.title ?? "Source text"}{src.end > src.start ? " (highlighted: the words this rests on)" : ""}</h4>
      {src.ref ? <div className="gv-ref">{src.ref}</div> : null}
      <pre className="gv-source">{src.text.slice(0, src.start)}{src.end > src.start ? <mark ref={markRef}>{src.text.slice(src.start, src.end)}</mark> : null}{src.text.slice(src.end)}</pre>
    </section>
  );
}

// Links listed on a node: one button per link that names it in `node.links` (0.11.0).
function LinkButtons({ graph, byId, edgeById, node, onLink }) {
  const ids = (node.links ?? []).filter((e) => edgeById.has(e));
  if (!ids.length) return null;
  return (
    <>
      <h4>Links to other documents ({ids.length})</h4>
      <div className="gv-links">
        {ids.map((eid) => {
          const e = edgeById.get(eid);
          const outward = e.source === node.id || !(e.target === node.id);
          const other = byId.get(outward ? e.target : e.source);
          const where = other?.details?.find(([k]) => k === "Where")?.[1] ?? other?.explain ?? other?.label ?? "";
          return (
            <button key={eid} type="button" className="gv-btn" style={{ "--gv-accent": e.color ?? "#5bc0d4" }} onClick={() => onLink(eid)}
              title="Open this link: both places side by side, and the far end highlighted in the graph">
              <span className="gv-linkword">{outward ? e.label : `${e.label} (from)`}</span> → {where}
            </button>
          );
        })}
      </div>
    </>
  );
}

function DetailsPanel({ graph, byId, edgeById, id, onClose, onLink, onGo }) {
  const panel = useRef(null), mark = useRef(null);
  const node = id ? byId.get(id) : null;
  const edge = !node && id ? edgeById.get(id) : null;
  const src = useMemo(() => (node ? resolveSource(graph, node) : null), [graph, node]);
  useEffect(() => {
    const p = panel.current, m = mark.current;
    if (p) p.scrollTop = m && !edge ? Math.max(0, m.offsetTop - p.clientHeight / 3) : 0;
    if (edge) for (const el of p?.querySelectorAll(".gv-compare .gv-source") ?? []) { const mk = el.querySelector("mark"); el.scrollTop = mk ? Math.max(0, mk.offsetTop - el.offsetTop - 40) : 0; }
  }, [id, edge]);
  if (edge) {
    return (
      <aside className="gv-panel gv-wide nowheel" ref={panel} aria-label="Details of the selected link">
        <button type="button" className="gv-btn gv-close" onClick={onClose} title="Close the details">×</button>
        <div className="gv-kind" style={{ color: edge.color ?? "var(--gv-edge-text,#b9c9d5)" }}>Link</div>
        <h3>{edge.label}</h3>
        {edge.explain ? <p className="gv-explain">{edge.explain}</p> : null}
        {edge.details?.length ? <dl>{edge.details.map(([k, v], i) => <React.Fragment key={i}><dt>{k}</dt><dd>{v}</dd></React.Fragment>)}</dl> : null}
        {edge.compare?.length ? (
          <div className="gv-compare">
            {edge.compare.map((side, i) => {
              const s = resolveSource(graph, { source: side.source });
              return (
                <div key={i}>
                  <h4>{side.title}</h4>
                  {side.node && byId.has(side.node) ? <button type="button" className="gv-btn" onClick={() => onGo(side.node)} title="Select this place in the graph">Go to this place</button> : null}
                  {s ? <SourceText src={s} title={s.title} /> : null}
                </div>
              );
            })}
          </div>
        ) : null}
      </aside>
    );
  }
  if (!node || !(node.details?.length || src || node.explain || node.links?.length)) return null;
  const kind = graph.kinds?.[node.kind] ?? {};
  return (
    <aside className="gv-panel nowheel" ref={panel} aria-label="Details of the selected item">
      <button type="button" className="gv-btn gv-close" onClick={onClose} title="Close the details">×</button>
      {kind.label ? <div className="gv-kind" style={{ color: kind.color }}>{kind.label}</div> : null}
      <h3>{node.label}</h3>
      {node.explain ?? kind.explain ? <p className="gv-explain">{node.explain ?? kind.explain}</p> : null}
      <LinkButtons graph={graph} byId={byId} edgeById={edgeById} node={node} onLink={onLink} />
      {node.details?.length ? <dl>{node.details.map(([k, v], i) => <React.Fragment key={i}><dt>{k}</dt><dd>{v}</dd></React.Fragment>)}</dl> : null}
      {src ? <SourceText src={src} markRef={mark} /> : null}
    </aside>
  );
}

const plural = (kind, n) => (n === 1 ? kind.label : kind.plural ?? kind.label);

// Several ordered documents side by side (layout.algorithm "lanes"). Containers start closed or
// open per kind, closed ones count what they hold, the toolbar counts every kind (shown / total)
// and opens a whole level in one click. Sizes come from the text, so opening is instant.
function LanesViewer({ graph, onSelect, onLayout, api, panel = true }) {
  const kinds = graph.kinds ?? {};
  const byId = useMemo(() => new Map(graph.nodes.map((n) => [n.id, n])), [graph]);
  const edgeById = useMemo(() => new Map(graph.edges.map((e) => [e.id, e])), [graph]);
  const [open, setOpen] = useState(() => defaultOpen(graph));
  const [selected, setSelected] = useState(null);
  const [highlight, setHighlight] = useState(null);
  const flow = useReactFlow();
  const wrap = useRef(null);
  const anchor = useRef(null);
  const center = useRef(null);
  const fitted = useRef(false);
  useEffect(() => { setOpen(defaultOpen(graph)); setSelected(null); fitted.current = false; }, [graph]);

  const view = useMemo(() => visibleGraph(graph, open), [graph, open]);
  const boxWidth = graph.layout?.nodeWidth ?? 250;
  const hiddenTexts = useMemo(() => Object.fromEntries(view.nodes.filter((n) => n.hidden).map((n) => [n.id, Object.entries(n.hidden).map(([k, c]) => `${c.toLocaleString()} ${plural(kinds[k] ?? { label: k }, c).toLowerCase()}`).join(", ")])), [view, kinds]);
  const sizes = useMemo(() => Object.fromEntries(view.nodes.map((n) => [n.id, estimateSize(n, { width: boxWidth, kindLabel: kinds[n.kind]?.label ?? n.kind, toggleText: hiddenTexts[n.id] ?? "" })])), [view, boxWidth, kinds, hiddenTexts]);
  const layout = useMemo(() => laneLayout(view, sizes), [view, sizes]);
  const at = useMemo(() => Object.fromEntries(layout.children.map((c) => [c.id, c])), [layout]);
  const drawn = useMemo(() => view.edges.filter((e) => !e.quiet || (selected && (e.source === selected || e.target === selected))), [view, selected]);
  const related = useMemo(() => (selected ? relatedTo({ edges: drawn }, selected) : highlight), [selected, highlight, drawn]);
  // A merged edge (an end hidden inside a closed box) stands for its member links: show the first.
  const panelId = useMemo(() => {
    if (!selected) return null;
    if (byId.has(selected) || edgeById.has(selected)) return selected;
    const merged = view.edges.find((e) => e.id === selected);
    return merged?.members?.find((m) => edgeById.has(m)) ?? null;
  }, [selected, byId, edgeById, view]);

  const toggle = useCallback((id) => {
    anchor.current = at[id] ? { id, x: at[id].x, y: at[id].y } : null;
    setOpen((cur) => { const next = new Set(cur); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }, [at]);
  const pick = useCallback((id) => {
    setSelected(id);
    onSelect?.(id ? { type: "node", id } : null);
    const n = view.nodes.find((x) => x.id === id);
    if (n?.container && !n.open) toggle(id);
  }, [view, onSelect, toggle]);
  const showKind = useCallback((kind) => { anchor.current = selected && at[selected] ? { id: selected, x: at[selected].x, y: at[selected].y } : null; setOpen((cur) => openToKind(graph, kind, cur)); }, [graph, selected, at]);
  const reset = useCallback(() => { anchor.current = null; fitted.current = false; setSelected(null); setOpen(defaultOpen(graph)); }, [graph]);
  // Follow a link: open everything above both ends, select the link and bring its far end into view.
  const selectLink = useCallback((eid) => {
    const e = edgeById.get(eid);
    if (!e) return;
    center.current = e.target;
    setOpen((cur) => { const next = new Set(cur); for (const end of [e.source, e.target]) for (const a of ancestorsOf(graph, end)) next.add(a); return next; });
    setSelected(eid);
    onSelect?.({ type: "edge", id: eid });
  }, [edgeById, graph, onSelect]);

  const nodes = useMemo(() => [
    ...layout.lanes.map((l) => ({ id: `lane::${l.id}`, type: "lane", position: { x: l.x, y: 20 }, draggable: false, selectable: false, data: l })),
    ...view.nodes.map((n) => {
      const kind = kinds[n.kind] ?? {}, p = at[n.id];
      const hiddenText = hiddenTexts[n.id] ?? "";
      return {
        id: n.id, type: "typed", position: { x: p.x, y: p.y }, width: p.width, height: p.height, draggable: false,
        data: {
          label: n.label, kindLabel: kind.label ?? n.kind ?? "", color: kind.color ?? "#5bc0d4", dashed: n.dashed ?? kind.dashed ?? false, shape: n.shape ?? kind.shape, strong: Boolean(n.strong ?? kind.strong),
          explain: n.explain ?? kind.explain, box: { width: p.width, height: p.height }, lines: labelLines(n.label, { width: boxWidth }),
          container: Boolean(n.container), open: Boolean(n.open), hiddenText, onToggle: () => toggle(n.id),
          selected: selected === n.id, lit: !selected && Boolean(highlight?.has(n.id)), dim: Boolean(related) && !related.has(n.id),
        },
      };
    }),
  ], [layout, view, at, kinds, boxWidth, hiddenTexts, selected, highlight, related, toggle]);
  const edges = useMemo(() => drawn.map((e) => {
    const on = selected === e.id || (Boolean(related) && related.has(e.id) && (e.source === selected || e.target === selected));
    const dim = Boolean(related) && !related.has(e.id);
    const color = on ? "var(--gv-focus,#f2c86b)" : e.containment ? "var(--gv-line-strong,#3a5266)" : e.color ?? "var(--gv-edge,#5bc0d4)";
    return {
      id: e.id, source: e.source, target: e.target, type: "elk", label: e.containment || !on ? undefined : e.label,  // link words show for the selection only
      data: { points: layout.routes[e.id] },
      ...(e.containment || !edgeLine(e).arrow ? {} : { markerEnd: { type: MarkerType.ArrowClosed, color, width: 14, height: 14 } }),
      style: { stroke: color, strokeWidth: on ? 2.4 : e.containment ? 1.2 : 1.5, strokeDasharray: e.line ? edgeLine(e).dash : e.quiet || e.dashed ? "5 4" : undefined, strokeLinecap: edgeLine(e).cap, opacity: dim ? 0.18 : 1 },
    };
  }), [drawn, selected, related, layout]);

  const fitNow = useCallback((duration = 0) => {
    const el = wrap.current;
    if (!el) return;
    const frame = { width: el.clientWidth, height: el.clientHeight };
    // Fit the width (lanes are read top to bottom, so the reader scrolls down, not squints).
    // On a narrow screen the whole width would be unreadable: fit the first lane and let the reader pan sideways.
    const first = layout.lanes[0];
    if (frame.width < 700 && first && layout.lanes.length > 1) {
      const zoom = Math.min((frame.width * 0.96) / (first.width + 24), 1);
      flow.setViewport({ x: -(first.x - 12) * zoom, y: 0, zoom }, { duration });
      return;
    }
    const zoom = Math.max(Math.min((frame.width * 0.97) / Math.max(layout.width, 1), 1), api.fullPage ? READABLE_ZOOM : 0);
    flow.setViewport({ x: Math.max((frame.width - layout.width * zoom) / 2, 0), y: 0, zoom }, { duration });
  }, [flow, layout, api]);
  // First drawing: fit it. After opening or closing: keep the clicked node where it was on screen.
  useEffect(() => {
    if (!fitted.current) { fitted.current = true; onLayout?.({ width: layout.width, height: layout.height }); requestAnimationFrame(() => fitNow()); return; }
    const c = center.current && at[center.current];
    if (c) {
      center.current = null; anchor.current = null;
      const el = wrap.current, vp = flow.getViewport();
      flow.setViewport({ x: (el?.clientWidth ?? 800) / 2 - (c.x + c.width / 2) * vp.zoom, y: (el?.clientHeight ?? 600) / 3 - c.y * vp.zoom, zoom: vp.zoom }, { duration: 200 });
      return;
    }
    const a = anchor.current; anchor.current = null;
    const now = a && at[a.id];
    if (now && (now.x !== a.x || now.y !== a.y)) {
      const vp = flow.getViewport();
      flow.setViewport({ x: vp.x - (now.x - a.x) * vp.zoom, y: vp.y - (now.y - a.y) * vp.zoom, zoom: vp.zoom });
    }
  }, [layout, at, flow, fitNow, onLayout]);

  useEffect(() => {
    api.fit = () => fitNow(200);
    // Select from the page: open everything above it, select it, and bring it into view.
    api.select = (id) => {
      if (!id) { setSelected(null); return; }
      center.current = id;
      setOpen((cur) => { const next = new Set(cur); for (const a of ancestorsOf(graph, id)) next.add(a); return next; });
      setSelected(id);
    };
    api.highlight = (ids) => { setSelected(null); setHighlight(ids && ids.length ? new Set(ids) : null); };
    api.open = (ids) => setOpen((cur) => { const next = new Set(cur); for (const id of ids ?? []) next.add(id); return next; });
    api.showKind = showKind;
    api.reset = reset;
    api.selectLink = selectLink;
  }, [api, graph, fitNow, showKind, reset, selectLink]);

  const present = Object.entries(view.counts).filter(([, c]) => c.total > 0);
  const shownAll = present.reduce((n, [, c]) => n + c.shown, 0), totalAll = present.reduce((n, [, c]) => n + c.total, 0);
  const order = Object.keys(kinds);
  present.sort((a, b) => (order.indexOf(a[0]) + 1 || 999) - (order.indexOf(b[0]) + 1 || 999));
  return (
    <div className="gv-root gv-lanes-root">
      <div className="gv-toolbar" role="toolbar" aria-label="What is shown">
        <span className="gv-summary" title="Everything is kept: closed boxes count what they hold. Open a box with its ▸ button, or a whole level with Show all.">Showing {shownAll.toLocaleString()} of {totalAll.toLocaleString()}</span>
        <details className="gv-kinds">
        <summary title="For each kind of box: how many are shown / how many exist, and a button to show them all">Counts and Show all, by kind</summary>
        {present.map(([k, c]) => {
          const kind = kinds[k] ?? { label: k || "Other" };
          const nested = graph.nodes.some((n) => n.kind === k && n.parent !== undefined);
          return (
            <span key={k} className="gv-chip" style={{ "--gv-accent": kind.color ?? "#5bc0d4" }} title={kind.explain ?? kind.label}>
              <span className={`gv-swatch${kind.dashed ? " gv-dashed" : ""}`} aria-hidden="true" />
              {kind.plural ?? kind.label} <span className="gv-n">{c.shown.toLocaleString()} / {c.total.toLocaleString()}</span>
              {nested && c.shown < c.total ? <button type="button" className="gv-btn" onClick={() => showKind(k)} title={`Open every box that holds ${(kind.plural ?? kind.label).toLowerCase()} (whatever else those boxes hold shows too)`}>Show all</button> : <span style={{ width: 4 }} />}
            </span>
          );
        })}
        </details>
        <button type="button" className="gv-btn" onClick={reset} title="Back to the starting view: groups closed, nothing selected">Reset view</button>
      </div>
      <div className="gv-canvas" ref={wrap}>
        <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes}
          nodesDraggable={false} nodesConnectable={false} elementsSelectable={false} minZoom={0.05} maxZoom={2.5} onlyRenderVisibleElements
          onNodeClick={(_, n) => { if (n.type === "typed") pick(n.id); }} onEdgeClick={(_, e) => { setSelected(e.id); onSelect?.({ type: "edge", id: e.id }); }}
          onPaneClick={() => { setSelected(null); onSelect?.(null); }}
          proOptions={{ hideAttribution: true }} colorMode="dark">
          <Background gap={18} size={1} color="var(--gv-dots,#1c3042)" />
          <Controls showInteractive={false} position="bottom-left" onFitView={() => fitNow(200)} />
        </ReactFlow>
        {panel ? <DetailsPanel graph={graph} byId={byId} edgeById={edgeById} id={panelId} onLink={selectLink} onGo={(nid) => api.select(nid)} onClose={() => { setSelected(null); onSelect?.(null); }} /> : null}
      </div>
    </div>
  );
}

/**
 * Mount a viewer into `element`. `onLayout({width, height})` reports the drawing's
 * natural size once laid out, so a page can size the frame. `panel: false` leaves out the built-in
 * details panel, for a page that shows the selection in its own panel (via onSelect).
 * `fullPage` (default true, 0.14.0) adds a "Full page" button: the viewer then covers the whole
 * window and fits at a readable size (never below 85%), and the reader pans to the rest; the
 * button again or Esc closes it. `onFullPage(on)` reports each change.
 * Returns { update(graph), fit(), select(id), highlight(ids), open(ids), showKind(kind), reset(), fullPage(on?), destroy() }.
 * Throws with the list of problems when the graph does not meet typed-graph/v1.
 */
export function mount(element, { graph, onSelect, onLayout, panel = true, fullPage = true, onFullPage } = {}) {
  injectCss();
  const check = (g) => { const problems = validateTypedGraph(g); if (problems.length) throw new Error(`graph-viewer: invalid typed graph: ${problems.join("; ")}`); };
  check(graph);
  const root = createRoot(element);
  const api = { fit() {}, select() {}, selectLink() {}, highlight() {}, open() {}, showKind() {}, reset() {}, fullPage: false };
  let current = expandHyperedges(graph);
  const onKey = (event) => { if (event.key === "Escape") setFull(false); };
  const setFull = (on) => {
    on = Boolean(on) && fullPage;
    if (on === api.fullPage) return;
    api.fullPage = on;
    element.classList.toggle("gv-fullpage", on);
    document.documentElement.classList.toggle("gv-noscroll", on);
    if (on) document.addEventListener("keydown", onKey); else document.removeEventListener("keydown", onKey);
    render(current);
    requestAnimationFrame(() => api.fit());
    onFullPage?.(on);
  };
  const render = (g) => {
    const lanes = g.layout?.algorithm === "lanes";
    const View = lanes ? LanesViewer : Viewer;
    const full = api.fullPage;
    root.render(
      <div className={`gv-shell${lanes ? " gv-shell-lanes" : ""}`}>
        <ReactFlowProvider><View graph={g} onSelect={onSelect} onLayout={onLayout} api={api} panel={panel} /></ReactFlowProvider>
        {fullPage ? (
          <button type="button" className="gv-fullbtn" aria-pressed={full} onClick={() => setFull(!api.fullPage)}
            title={full ? "Back to the page (Esc)" : "Open this diagram over the whole window at a readable size; drag to pan, scroll to zoom"}>
            {full ? "✕ Close full page" : "⤢ Full page"}
          </button>
        ) : null}
      </div>,
    );
  };
  render(current);
  return {
    update(next) { check(next); current = expandHyperedges(next); render(current); },
    fit: () => api.fit(),
    select: (id) => api.select(id),
    // Lanes layout (0.11.0): follow one link by its edge id, as its button in a node's panel does.
    selectLink: (id) => api.selectLink(id),
    // Light up these node and edge ids and dim the rest; null or [] clears it.
    highlight: (ids) => api.highlight(ids),
    // Lanes layout only: open these containers; open every container above one kind; back to the start.
    open: (ids) => api.open(ids),
    showKind: (kind) => api.showKind(kind),
    reset: () => api.reset(),
    // Full page (0.14.0): fullPage(true) opens it, fullPage(false) closes it, fullPage() reports it.
    fullPage: (on) => { if (on !== undefined) setFull(on); return api.fullPage; },
    destroy: () => { setFull(false); root.unmount(); },
  };
}

export { validateTypedGraph, expandHyperedges };
// Whole documents (claim batches + transcript passages) as one lanes graph, usable from a plain page.
export { documentsToTypedGraph } from "./adapters/claim-batch.mjs";
export const version = "0.14.1";

