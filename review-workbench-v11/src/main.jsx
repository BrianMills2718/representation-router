import React, { useCallback, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Panel,
  Position,
  ReactFlow,
  ReactFlowProvider,
  applyEdgeChanges,
  applyNodeChanges,
  useReactFlow
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "./styles.css";
import baseModel from "../../review-workbench/pr22.model.json";
import architecture from "../../review-workbench/pr22.architecture-v1.json";
import interactions from "../../review-workbench/pr22.interactions-v1.1.json";

const TABS = [
  ["overview", "Overview"],
  ["component", "Component"],
  ["sequence", "Sequence"],
  ["state", "State"],
  ["requirements", "Requirements"],
  ["evidence", "Evidence"],
  ["review", "Review"]
];

const sourceMap = Object.fromEntries(baseModel.sources.map((item) => [item.id, item]));
const requirementMap = Object.fromEntries(baseModel.requirements.map((item) => [item.id, item]));
const evidenceMap = Object.fromEntries(baseModel.evidence.map((item) => [item.id, item]));

function cloneNodes(nodes) {
  return nodes.map((node) => ({ ...node, position: { ...node.position }, data: { ...node.data } }));
}

function graphFromComponent() {
  const nodes = architecture.component.nodes.map((node) => ({
    id: node.id,
    type: "semantic",
    position: { x: node.x, y: node.y },
    data: {
      title: node.title,
      summary: node.summary,
      owner: node.owner,
      tag: node.stereotype,
      semanticKind: "component-node"
    }
  }));
  const edges = architecture.component.edges.map((edge) => ({
    id: edge.id,
    source: edge.from,
    target: edge.to,
    label: edge.label,
    type: "smoothstep",
    interactionWidth: 28,
    markerEnd: { type: MarkerType.ArrowClosed },
    style: {
      strokeWidth: 2,
      strokeDasharray: edge.style === "dashed" ? "7 6" : undefined
    },
    data: { semanticKind: "component-edge" }
  }));
  return { nodes, edges };
}

function graphFromState() {
  const nodes = architecture.state.states.map((state) => ({
    id: state.id,
    type: "semantic",
    position: { x: state.x, y: state.y },
    data: {
      title: state.label,
      summary: state.summary,
      owner: state.kind === "human-gate" || state.kind === "final" ? "Human-owned gate" : "Lifecycle state",
      tag: state.kind,
      semanticKind: "state-node"
    }
  }));
  const edges = architecture.state.transitions.map((transition) => ({
    id: transition.id,
    source: transition.from,
    target: transition.to,
    label: transition.label,
    type: "smoothstep",
    interactionWidth: 28,
    markerEnd: { type: MarkerType.ArrowClosed },
    style: { strokeWidth: 2 },
    data: { semanticKind: "state-edge", authority: transition.authority }
  }));
  return { nodes, edges };
}

function SemanticNode({ data, selected }) {
  return (
    <article className={`semantic-node ${selected ? "is-selected" : ""} ${data.emphasis ?? ""}`}>
      <Handle type="target" position={Position.Left} />
      <span className="node-tag">{data.tag}</span>
      <strong>{data.title}</strong>
      <p>{data.summary}</p>
      <small>{data.owner}</small>
      <Handle type="source" position={Position.Right} />
    </article>
  );
}

const nodeTypes = { semantic: SemanticNode };

function graphEmphasis(nodes, edges, selection, lens, enabled) {
  if (!enabled || !selection || selection.lens !== lens || !["node", "edge"].includes(selection.type)) {
    return {
      nodes: nodes.map((node) => ({ ...node, data: { ...node.data, emphasis: "" }, style: { ...node.style, opacity: 1 } })),
      edges: edges.map((edge) => ({ ...edge, style: { ...edge.style, opacity: 1 } }))
    };
  }
  const nodeIds = new Set();
  const edgeIds = new Set();
  if (selection.type === "node") {
    nodeIds.add(selection.id);
    for (const edge of edges) {
      if (edge.source === selection.id || edge.target === selection.id) {
        edgeIds.add(edge.id);
        nodeIds.add(edge.source);
        nodeIds.add(edge.target);
      }
    }
  } else {
    const selectedEdge = edges.find((edge) => edge.id === selection.id);
    if (selectedEdge) {
      edgeIds.add(selectedEdge.id);
      nodeIds.add(selectedEdge.source);
      nodeIds.add(selectedEdge.target);
    }
  }
  return {
    nodes: nodes.map((node) => ({
      ...node,
      data: { ...node.data, emphasis: nodeIds.has(node.id) ? "is-neighborhood" : "is-muted" },
      style: { ...node.style, opacity: nodeIds.has(node.id) ? 1 : 0.23 }
    })),
    edges: edges.map((edge) => ({
      ...edge,
      style: { ...edge.style, opacity: edgeIds.has(edge.id) ? 1 : 0.18, strokeWidth: edgeIds.has(edge.id) ? 3 : 2 }
    }))
  };
}

function GraphCanvasInner({ lens, title, concern, nodes, setNodes, edges, setEdges, initialNodes, selection, onSelect }) {
  const { fitView } = useReactFlow();
  const [locked, setLocked] = useState(false);
  const [neighbors, setNeighbors] = useState(true);
  const [layoutDirty, setLayoutDirty] = useState(false);
  const emphasized = useMemo(() => graphEmphasis(nodes, edges, selection, lens, neighbors), [nodes, edges, selection, lens, neighbors]);

  const resetLayout = useCallback(() => {
    setNodes(cloneNodes(initialNodes));
    setLayoutDirty(false);
    requestAnimationFrame(() => fitView({ padding: 0.18, duration: 250 }));
  }, [initialNodes, setNodes, fitView]);

  return (
    <section className="graph-lens">
      <header className="lens-heading">
        <div><span className="eyebrow">Interactive architecture</span><h2>{title}</h2></div>
        <p>{concern}</p>
      </header>
      <div className="graph-note" role="note">
        <strong>Layout is surface-local.</strong> Dragging a node changes only this working view; semantic identity, edge direction, evidence, and source truth do not change.
      </div>
      <div className="flow-shell">
        <ReactFlow
          nodes={emphasized.nodes}
          edges={emphasized.edges}
          nodeTypes={nodeTypes}
          onNodesChange={(changes) => setNodes((current) => applyNodeChanges(changes, current))}
          onEdgesChange={(changes) => setEdges((current) => applyEdgeChanges(changes, current))}
          onNodeClick={(_, node) => onSelect({ lens, type: "node", id: node.id })}
          onEdgeClick={(_, edge) => onSelect({ lens, type: "edge", id: edge.id })}
          onNodeDragStop={() => setLayoutDirty(true)}
          nodesDraggable={!locked}
          nodesConnectable={false}
          edgesFocusable
          nodesFocusable
          elementsSelectable
          fitView
          minZoom={0.25}
          maxZoom={2.5}
          attributionPosition="bottom-left"
        >
          <Background gap={22} size={1} />
          <Controls showInteractive={false} />
          <MiniMap pannable zoomable nodeStrokeWidth={2} />
          <Panel position="top-left" className="graph-toolbar">
            <button type="button" onClick={() => fitView({ padding: 0.18, duration: 250 })}>Fit</button>
            <button type="button" onClick={resetLayout} disabled={!layoutDirty}>Reset layout</button>
            <button type="button" aria-pressed={locked} onClick={() => setLocked((value) => !value)}>{locked ? "Unlock" : "Lock"} layout</button>
            <button type="button" aria-pressed={neighbors} onClick={() => setNeighbors((value) => !value)}>{neighbors ? "Neighbors on" : "Neighbors off"}</button>
          </Panel>
        </ReactFlow>
      </div>
    </section>
  );
}

function GraphCanvas(props) {
  return <ReactFlowProvider><GraphCanvasInner {...props} /></ReactFlowProvider>;
}

function SequenceDiagram({ selection, onSelect }) {
  const participants = architecture.sequence.participants;
  const messages = architecture.sequence.messages;
  const width = Math.max(900, participants.length * 185);
  const height = 160 + messages.length * 74;
  const xs = Object.fromEntries(participants.map((item, index) => [item.id, 90 + index * ((width - 180) / Math.max(1, participants.length - 1))]));
  return (
    <section>
      <header className="lens-heading">
        <div><span className="eyebrow">Ordered interaction</span><h2>{architecture.sequence.title}</h2></div>
        <p>{architecture.sequence.concern}</p>
      </header>
      <div className="sequence-scroll">
        <svg className="sequence-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={architecture.sequence.title}>
          <defs><marker id="sequence-arrow-v11" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" /></marker></defs>
          {participants.map((participant) => {
            const x = xs[participant.id];
            const selected = selection?.lens === "sequence" && selection?.type === "participant" && selection.id === participant.id;
            return <g key={participant.id} role="button" tabIndex="0" className={`sequence-participant ${selected ? "is-selected" : ""}`} onClick={() => onSelect({ lens: "sequence", type: "participant", id: participant.id })} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onSelect({ lens: "sequence", type: "participant", id: participant.id }); }}>
              <rect x={x - 70} y="22" width="140" height="58" rx="10" />
              <text x={x} y="48" textAnchor="middle">{participant.label}</text>
              <text className="sequence-kind" x={x} y="66" textAnchor="middle">{participant.kind}</text>
              <line className="lifeline" x1={x} y1="80" x2={x} y2={height - 24} />
            </g>;
          })}
          {messages.map((message, index) => {
            const y = 122 + index * 74;
            const x1 = xs[message.from];
            const x2 = xs[message.to];
            const mid = (x1 + x2) / 2;
            const selected = selection?.lens === "sequence" && selection?.type === "message" && selection.id === message.id;
            const labelWidth = Math.min(300, Math.max(150, message.label.length * 6.2));
            return <g key={message.id} role="button" tabIndex="0" className={`sequence-message ${selected ? "is-selected" : ""}`} onClick={() => onSelect({ lens: "sequence", type: "message", id: message.id })} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onSelect({ lens: "sequence", type: "message", id: message.id }); }}>
              <line className="message-hit" x1={x1} y1={y} x2={x2} y2={y} />
              <line className="message-line" x1={x1} y1={y} x2={x2} y2={y} markerEnd="url(#sequence-arrow-v11)" />
              <rect className="message-label-bg" x={mid - labelWidth / 2} y={y - 28} width={labelWidth} height="22" rx="8" />
              <text className="message-label" x={mid} y={y - 13} textAnchor="middle">{message.label}</text>
            </g>;
          })}
        </svg>
      </div>
    </section>
  );
}

function Overview({ onSelect }) {
  return (
    <section>
      <header className="lens-heading">
        <div><span className="eyebrow">Review story</span><h2>What changed and why?</h2></div>
        <p>{baseModel.outcome}</p>
      </header>
      <div className="story-grid">
        {baseModel.concepts.map((item, index) => <button type="button" key={item.id} onClick={() => onSelect({ lens: "overview", type: "concept", id: item.id })}>
          <span>{index + 1}</span><small>{item.eyebrow}</small><strong>{item.title}</strong><p>{item.summary}</p>
        </button>)}
      </div>
    </section>
  );
}

function Requirements({ focusId, onSelect }) {
  return (
    <section>
      <header className="lens-heading"><div><span className="eyebrow">Traceability</span><h2>Requirements</h2></div><p>Obligation → implementation → evidence, without flattening human review into a percentage.</p></header>
      <div className="table-wrap"><table><thead><tr><th>Requirement</th><th>Question</th><th>State</th><th>Implementation</th><th>Evidence</th></tr></thead><tbody>
        {baseModel.requirements.map((item) => <tr key={item.id} className={focusId === item.id ? "is-focused" : ""}>
          <td><button type="button" className="text-button" onClick={() => onSelect({ lens: "requirements", type: "requirement", id: item.id })}><strong>{item.id}</strong> {item.title}</button></td>
          <td>{item.question}</td><td><span className={`badge state-${item.state}`}>{item.state}</span></td>
          <td>{item.implementation.map((value) => <code key={value}>{value}</code>)}</td>
          <td>{item.evidence.map((value) => <span className="line-item" key={value}>{value}</span>)}</td>
        </tr>)}
      </tbody></table></div>
    </section>
  );
}

function Evidence({ focusId, onSelect }) {
  return (
    <section>
      <header className="lens-heading"><div><span className="eyebrow">Assurance</span><h2>Evidence and nonclaims</h2></div><p>What each artifact proves stays adjacent to what it does not prove.</p></header>
      <div className="evidence-grid">
        {baseModel.evidence.map((item) => <article key={item.id} className={focusId === item.id ? "is-focused" : ""}>
          <button type="button" className="evidence-title" onClick={() => onSelect({ lens: "evidence", type: "evidence", id: item.id })}><span className={`badge state-${item.state}`}>{item.state}</span><strong>{item.title}</strong></button>
          <div><section><h3>Proves</h3><ul>{item.proves.map((value) => <li key={value}>{value}</li>)}</ul></section><section><h3>Does not prove</h3><ul>{item.doesNotProve.map((value) => <li key={value}>{value}</li>)}</ul></section></div>
        </article>)}
      </div>
    </section>
  );
}

function Review() {
  return (
    <section>
      <header className="lens-heading"><div><span className="eyebrow">Human gate</span><h2>{baseModel.review.headline}</h2></div><p>{baseModel.reviewQuestion}</p></header>
      <div className="review-grid">
        <article><h3>Technical status</h3>{baseModel.review.items.map((item) => <div className="review-row" key={item.label}><span>{item.state === "needs-review" ? "?" : "✓"}</span><strong>{item.label}</strong><em>{item.state}</em></div>)}</article>
        <article className="human-card"><h3>Your checkpoint</h3><p>{baseModel.reviewQuestion}</p><strong>Automation cannot answer this.</strong></article>
        <article><h3>Nonclaims</h3><ul>{baseModel.review.nonclaims.map((item) => <li key={item}>{item}</li>)}</ul></article>
      </div>
    </section>
  );
}

function findSelection(selection) {
  if (!selection) return null;
  if (selection.lens === "overview") {
    const item = baseModel.concepts.find((candidate) => candidate.id === selection.id);
    return item ? { title: item.title, eyebrow: item.eyebrow, meaning: item.detail, summary: item.summary, sourceIds: item.sourceIds ?? [] } : null;
  }
  if (selection.lens === "component" && selection.type === "node") {
    const item = architecture.component.nodes.find((candidate) => candidate.id === selection.id);
    const links = interactions.component.nodes[selection.id] ?? {};
    return item ? { title: item.title, eyebrow: item.stereotype, meaning: item.summary, owner: item.owner, sourceIds: item.sourceIds ?? [], ...links } : null;
  }
  if (selection.lens === "component" && selection.type === "edge") {
    const edge = architecture.component.edges.find((candidate) => candidate.id === selection.id);
    const meta = interactions.component.edges[selection.id];
    if (!edge || !meta) return null;
    const source = architecture.component.nodes.find((item) => item.id === edge.from)?.title ?? edge.from;
    const target = architecture.component.nodes.find((item) => item.id === edge.to)?.title ?? edge.to;
    return { title: edge.label, eyebrow: "Relationship", endpoints: `${source} → ${target}`, meaning: meta.meaning, nonclaim: meta.nonclaim, sourceIds: meta.sourceIds, requirementIds: meta.requirementIds, evidenceIds: meta.evidenceIds };
  }
  if (selection.lens === "state" && selection.type === "node") {
    const item = architecture.state.states.find((candidate) => candidate.id === selection.id);
    const links = interactions.state.states[selection.id] ?? {};
    return item ? { title: item.label, eyebrow: item.kind, meaning: item.summary, sourceIds: item.sourceIds ?? [], ...links } : null;
  }
  if (selection.lens === "state" && selection.type === "edge") {
    const edge = architecture.state.transitions.find((candidate) => candidate.id === selection.id);
    const meta = interactions.state.transitions[selection.id];
    if (!edge || !meta) return null;
    const source = architecture.state.states.find((item) => item.id === edge.from)?.label ?? edge.from;
    const target = architecture.state.states.find((item) => item.id === edge.to)?.label ?? edge.to;
    return { title: edge.label, eyebrow: `Transition · ${edge.authority}`, endpoints: `${source} → ${target}`, meaning: meta.meaning, nonclaim: meta.nonclaim, sourceIds: meta.sourceIds, requirementIds: meta.requirementIds, evidenceIds: meta.evidenceIds };
  }
  if (selection.lens === "sequence" && selection.type === "message") {
    const item = architecture.sequence.messages.find((candidate) => candidate.id === selection.id);
    const links = interactions.sequence.messages[selection.id] ?? {};
    if (!item) return null;
    const source = architecture.sequence.participants.find((candidate) => candidate.id === item.from)?.label ?? item.from;
    const target = architecture.sequence.participants.find((candidate) => candidate.id === item.to)?.label ?? item.to;
    return { title: item.label, eyebrow: "Sequence message", endpoints: `${source} → ${target}`, meaning: item.note, nonclaim: "Ordered interaction does not transfer authority beyond the named participants or owning systems.", sourceIds: item.sourceIds ?? [], ...links };
  }
  if (selection.lens === "sequence" && selection.type === "participant") {
    const item = architecture.sequence.participants.find((candidate) => candidate.id === selection.id);
    return item ? { title: item.label, eyebrow: item.kind, meaning: "Participant in the ordered review/build interaction.", sourceIds: item.sourceIds ?? [] } : null;
  }
  if (selection.lens === "requirements") {
    const item = requirementMap[selection.id];
    return item ? { title: `${item.id} · ${item.title}`, eyebrow: item.state, meaning: item.question, summary: item.implementation.join(" · "), sourceIds: item.sourceIds ?? [] } : null;
  }
  if (selection.lens === "evidence") {
    const item = evidenceMap[selection.id];
    return item ? { title: item.title, eyebrow: item.state, meaning: item.proves.join(" "), nonclaim: item.doesNotProve.join(" "), sourceIds: item.sourceIds ?? [] } : null;
  }
  return null;
}

function Inspector({ selection, onOpenRelated }) {
  const item = findSelection(selection);
  if (!item) return <aside className="inspector empty"><span className="eyebrow">Shared inspector</span><h2>Select a node, edge, state, or message</h2><p>Selection persists while you inspect meaning, endpoints, evidence, nonclaims, and source provenance.</p></aside>;
  return (
    <aside className="inspector">
      <span className="eyebrow">{item.eyebrow}</span>
      <h2>{item.title}</h2>
      {item.endpoints && <div className="endpoints">{item.endpoints}</div>}
      {item.owner && <p className="owner-line"><strong>Owner:</strong> {item.owner}</p>}
      {item.summary && <p>{item.summary}</p>}
      <section><h3>Meaning</h3><p>{item.meaning}</p></section>
      {item.nonclaim && <section className="nonclaim"><h3>Does not imply</h3><p>{item.nonclaim}</p></section>}
      {(item.requirementIds?.length > 0 || item.evidenceIds?.length > 0) && <section><h3>Follow across lenses</h3><div className="related-links">
        {(item.requirementIds ?? []).map((id) => <button type="button" key={id} onClick={() => onOpenRelated("requirements", id)}>{id} · {requirementMap[id]?.title ?? "Requirement"}</button>)}
        {(item.evidenceIds ?? []).map((id) => <button type="button" key={id} onClick={() => onOpenRelated("evidence", id)}>{evidenceMap[id]?.title ?? id}</button>)}
      </div></section>}
      <section><h3>Provenance</h3><div className="source-list">{(item.sourceIds ?? []).map((id) => {
        const source = sourceMap[id];
        return source ? <a key={id} href={source.url} target="_blank" rel="noreferrer"><strong>{source.label}</strong><small>{source.role} · {source.revision.slice(0, 12)}</small></a> : null;
      })}</div></section>
    </aside>
  );
}

function App() {
  const componentInitial = useMemo(graphFromComponent, []);
  const stateInitial = useMemo(graphFromState, []);
  const [componentNodes, setComponentNodes] = useState(() => cloneNodes(componentInitial.nodes));
  const [componentEdges, setComponentEdges] = useState(() => componentInitial.edges.map((edge) => ({ ...edge })));
  const [stateNodes, setStateNodes] = useState(() => cloneNodes(stateInitial.nodes));
  const [stateEdges, setStateEdges] = useState(() => stateInitial.edges.map((edge) => ({ ...edge })));
  const [activeTab, setActiveTab] = useState("component");
  const [selection, setSelection] = useState({ lens: "component", type: "node", id: "surfacespec" });
  const [relatedFocus, setRelatedFocus] = useState(null);

  const select = (next) => { setSelection(next); setRelatedFocus(null); };
  const openRelated = (lens, id) => { setActiveTab(lens); setRelatedFocus({ lens, id }); };

  return (
    <div className="app-shell">
      <header className="hero">
        <div><span className="eyebrow">Review Workbench v1.1 · Interactive Architecture</span><h1>{baseModel.title}</h1><p>{baseModel.subtitle}</p></div>
        <div className="subject"><span>Reviewed subject</span><strong>PR #22 · merged</strong><code>{baseModel.subject.mergeRevision}</code></div>
      </header>
      <div className="status-strip">{baseModel.status.map((item) => <div key={item.id} className={`status status-${item.state}`}><span /> <div><strong>{item.label}</strong><small>{item.state}</small></div></div>)}</div>
      <div className="interaction-contract"><strong>Interaction contract:</strong> drag = local layout only · click nodes/edges = semantic selection · fit/zoom = viewport only · no graph operation writes back to source truth.</div>
      <nav className="tabs" aria-label="Workbench lenses">{TABS.map(([id, label]) => <button type="button" key={id} aria-selected={activeTab === id} onClick={() => setActiveTab(id)}>{label}</button>)}</nav>
      <main className="workspace">
        <div className="main-panel">
          {activeTab === "overview" && <Overview onSelect={select} />}
          {activeTab === "component" && <GraphCanvas lens="component" title={architecture.component.title} concern={architecture.component.concern} nodes={componentNodes} setNodes={setComponentNodes} edges={componentEdges} setEdges={setComponentEdges} initialNodes={componentInitial.nodes} selection={selection} onSelect={select} />}
          {activeTab === "sequence" && <SequenceDiagram selection={selection} onSelect={select} />}
          {activeTab === "state" && <GraphCanvas lens="state" title={architecture.state.title} concern={architecture.state.concern} nodes={stateNodes} setNodes={setStateNodes} edges={stateEdges} setEdges={setStateEdges} initialNodes={stateInitial.nodes} selection={selection} onSelect={select} />}
          {activeTab === "requirements" && <Requirements focusId={relatedFocus?.lens === "requirements" ? relatedFocus.id : null} onSelect={select} />}
          {activeTab === "evidence" && <Evidence focusId={relatedFocus?.lens === "evidence" ? relatedFocus.id : null} onSelect={select} />}
          {activeTab === "review" && <Review />}
        </div>
        <Inspector selection={selection} onOpenRelated={openRelated} />
      </main>
      <footer><strong>Current human checkpoint:</strong> {baseModel.reviewQuestion}</footer>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
