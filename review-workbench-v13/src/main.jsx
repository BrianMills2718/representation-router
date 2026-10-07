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
import featurePath from "../../review-workbench/saved-layout-feature-v1.3.json";
import { clearLayout, loadLayout, saveLayout } from "../../src/layout-persistence.mjs";

const WORKBENCH_ID = "representation-router-build-feature-v1.3";
const SUBJECT_REVISION = baseModel.subject.mergeRevision;

const TABS = [
  ["build", "Build this feature"],
  ["component", "System map"],
  ["state", "What happens next"],
  ["verification", "Tests & evidence"],
  ["review", "Review"]
];

const COMPONENT_LABELS = {
  domain: ["Source of truth", "The system that owns the real meaning and state."],
  viewspec: ["One focused view", "A focused way to answer one question about the software."],
  surfacespec: ["Combined working view", "A workspace that coordinates several views and sources."],
  product: ["The app people use", "The actual interface where people inspect or act."],
  evidence: ["Checks and evidence", "Tests and execution results that support technical claims."],
  human: ["Person reviewing or operating", "The person using or judging the software."]
};

const COMPONENT_EDGE_LABELS = {
  "domain-view": "defines what is true here",
  "view-surface": "joins this view into the workspace",
  "surface-product": "guides what the app shows",
  "product-human": "shows information / takes input",
  "evidence-surface": "supports the claims",
  "human-product": "acts through the app"
};

const STATE_LABELS = {
  planned: "Planned",
  implemented: "Built",
  verified: "Automated checks passed",
  merged: "Integrated and reviewable",
  "human-review": "Human review",
  accepted: "Accepted",
  changes: "Changes requested"
};

const STATE_EDGE_LABELS = {
  "st-1": "build the change",
  "st-2": "run automated checks",
  "st-3": "integrate the change",
  "st-4": "present it for review",
  "st-5": "accept",
  "st-6": "request changes",
  "st-7": "revise"
};

const FEATURE_REQUIREMENTS = [
  { id: "F1", title: "Remember a moved box", question: "Does the same browser restore a moved node for the exact same reviewed revision?", evidence: "save → load persistence unit test + v1.3 product behavior" },
  { id: "F2", title: "Reset safely", question: "Does Reset positions delete the saved arrangement and restore deterministic defaults?", evidence: "clear/remove regression test" },
  { id: "F3", title: "Do not cross revisions", question: "Can a layout from another subject revision be silently applied?", evidence: "stale revision rejection test" },
  { id: "F4", title: "Save presentation only", question: "Does the saved record contain coordinates without semantic relationships, evidence, or authority?", evidence: "positions-only record test" },
  { id: "F5", title: "Fail honestly", question: "If browser storage is unavailable, does the diagram still work and say it will not remember positions?", evidence: "storage-failure fallback test" }
];

function cloneNodes(nodes) {
  return nodes.map((node) => ({ ...node, position: { ...node.position }, data: node.data ? { ...node.data } : node.data }));
}

function browserStorage() {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function componentGraph() {
  return {
    nodes: architecture.component.nodes.map((node) => ({
      id: node.id,
      type: "semantic",
      position: { x: node.x, y: node.y },
      data: {
        title: COMPONENT_LABELS[node.id]?.[0] ?? node.title,
        summary: COMPONENT_LABELS[node.id]?.[1] ?? node.summary,
        exactTitle: node.title,
        tag: node.stereotype,
        owner: node.owner
      }
    })),
    edges: architecture.component.edges.map((edge) => ({
      id: edge.id,
      source: edge.from,
      target: edge.to,
      label: COMPONENT_EDGE_LABELS[edge.id] ?? edge.label,
      type: "smoothstep",
      interactionWidth: 32,
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { strokeWidth: 2, strokeDasharray: edge.style === "dashed" ? "7 6" : undefined },
      data: { formalLabel: edge.label }
    }))
  };
}

function stateGraph() {
  return {
    nodes: architecture.state.states.map((state) => ({
      id: state.id,
      type: "semantic",
      position: { x: state.x, y: state.y },
      data: {
        title: STATE_LABELS[state.id] ?? state.label,
        summary: state.summary,
        exactTitle: state.label,
        tag: state.kind,
        owner: state.kind === "human-gate" || state.kind === "final" ? "Human-owned step" : "Software lifecycle"
      }
    })),
    edges: architecture.state.transitions.map((transition) => ({
      id: transition.id,
      source: transition.from,
      target: transition.to,
      label: STATE_EDGE_LABELS[transition.id] ?? transition.label,
      type: "smoothstep",
      interactionWidth: 32,
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { strokeWidth: 2 },
      data: { formalLabel: transition.label, authority: transition.authority }
    }))
  };
}

function usePersistentGraph(lens, initialGraph) {
  const storage = useMemo(() => browserStorage(), []);
  const identity = useMemo(() => ({ workbenchId: WORKBENCH_ID, subjectRevision: SUBJECT_REVISION, lens }), [lens]);
  const initialLoad = useMemo(
    () => loadLayout(storage, { ...identity, defaultNodes: initialGraph.nodes }),
    [storage, identity, initialGraph]
  );
  const [nodes, setNodes] = useState(() => initialLoad.nodes);
  const [edges, setEdges] = useState(() => initialGraph.edges.map((edge) => ({ ...edge, data: edge.data ? { ...edge.data } : edge.data })));
  const [persistenceStatus, setPersistenceStatus] = useState(initialLoad.status);
  const [savedAt, setSavedAt] = useState(initialLoad.record?.savedAt ?? null);

  const persist = useCallback((nextNodes) => {
    const result = saveLayout(storage, { ...identity, nodes: nextNodes });
    setPersistenceStatus(result.status);
    setSavedAt(result.record?.savedAt ?? null);
    return result;
  }, [storage, identity]);

  const reset = useCallback(() => {
    const result = clearLayout(storage, identity);
    setNodes(cloneNodes(initialGraph.nodes));
    setPersistenceStatus(result.status === "cleared" ? "cleared" : result.status);
    setSavedAt(null);
    return result;
  }, [storage, identity, initialGraph]);

  return {
    nodes,
    setNodes,
    edges,
    setEdges,
    persist,
    reset,
    persistenceStatus,
    savedAt,
    hasSavedLayout: persistenceStatus === "saved" || persistenceStatus === "restored"
  };
}

function SemanticNode({ data, selected }) {
  return <article className={`semantic-node ${selected ? "is-selected" : ""} ${data.emphasis ?? ""}`}>
    <Handle type="target" position={Position.Left} />
    <span className="node-tag">{data.tag}</span>
    <strong>{data.title}</strong>
    <p>{data.summary}</p>
    <small>{data.owner}</small>
    <Handle type="source" position={Position.Right} />
  </article>;
}

const nodeTypes = { semantic: SemanticNode };

function emphasizeConnections(nodes, edges, selection, lens) {
  if (!selection || selection.lens !== lens || !["node", "edge"].includes(selection.type)) {
    return {
      nodes: nodes.map((node) => ({ ...node, data: { ...node.data, emphasis: "" }, style: { ...node.style, opacity: 1 } })),
      edges: edges.map((edge) => ({ ...edge, style: { ...edge.style, opacity: 1, strokeWidth: 2 } }))
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
    const edge = edges.find((item) => item.id === selection.id);
    if (edge) {
      edgeIds.add(edge.id);
      nodeIds.add(edge.source);
      nodeIds.add(edge.target);
    }
  }
  return {
    nodes: nodes.map((node) => ({
      ...node,
      data: { ...node.data, emphasis: nodeIds.has(node.id) ? "is-connected" : "is-muted" },
      style: { ...node.style, opacity: nodeIds.has(node.id) ? 1 : 0.2 }
    })),
    edges: edges.map((edge) => ({
      ...edge,
      style: { ...edge.style, opacity: edgeIds.has(edge.id) ? 1 : 0.16, strokeWidth: edgeIds.has(edge.id) ? 3.25 : 2 }
    }))
  };
}

function persistenceCopy(status, savedAt) {
  if (status === "restored") return ["Saved arrangement restored", "This browser remembered your positions for this exact software revision."];
  if (status === "saved") return ["Arrangement saved in this browser", savedAt ? `Saved ${new Date(savedAt).toLocaleString()}.` : "Your positions will be restored when you return to this exact revision."];
  if (status === "unavailable") return ["Positions won't be remembered in this browser", "The diagram still works; browser storage is unavailable or blocked."];
  if (status === "cleared") return ["Saved arrangement cleared", "The deterministic default positions are back."];
  return ["Move a box to remember this arrangement", "Saving is browser-local and tied to this exact software revision."];
}

function GraphCanvasInner({ lens, title, question, graph, selection, onSelect, onClear }) {
  const { fitView } = useReactFlow();
  const [positionsChanged, setPositionsChanged] = useState(false);
  const emphasized = useMemo(() => emphasizeConnections(graph.nodes, graph.edges, selection, lens), [graph.nodes, graph.edges, selection, lens]);
  const [statusTitle, statusDetail] = persistenceCopy(graph.persistenceStatus, graph.savedAt);

  const resetPositions = useCallback(() => {
    graph.reset();
    setPositionsChanged(false);
    requestAnimationFrame(() => fitView({ padding: 0.18, duration: 250 }));
  }, [graph, fitView]);

  return <section className="graph-lens">
    <header className="lens-heading">
      <div><span className="eyebrow">Try the real feature</span><h2>{title}</h2></div>
      <p>{question}</p>
    </header>
    <div className={`save-receipt status-${graph.persistenceStatus}`} role="status">
      <div><strong>{statusTitle}</strong><span>{statusDetail}</span></div>
      <details><summary>How saving works</summary><p>Only box IDs and positions are stored. The saved layout is scoped to this browser, this diagram, and revision <code>{SUBJECT_REVISION.slice(0, 12)}…</code>. It cannot change architecture relationships or software state.</p></details>
    </div>
    <p className="interaction-instruction"><strong>Drag a box and reload this file to test saving.</strong> Click a box or line to understand it. Direct connections highlight automatically.</p>
    <div className="flow-shell">
      <ReactFlow
        nodes={emphasized.nodes}
        edges={emphasized.edges}
        nodeTypes={nodeTypes}
        onNodesChange={(changes) => graph.setNodes((current) => applyNodeChanges(changes, current))}
        onEdgesChange={(changes) => graph.setEdges((current) => applyEdgeChanges(changes, current))}
        onNodeClick={(_, node) => onSelect({ lens, type: "node", id: node.id })}
        onEdgeClick={(_, edge) => onSelect({ lens, type: "edge", id: edge.id })}
        onNodeDragStop={(_, draggedNode) => {
          const nextNodes = graph.nodes.map((node) => node.id === draggedNode.id ? { ...node, position: { ...draggedNode.position } } : node);
          graph.setNodes(nextNodes);
          graph.persist(nextNodes);
          setPositionsChanged(true);
        }}
        nodesDraggable
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
          <button type="button" onClick={() => fitView({ padding: 0.18, duration: 250 })}>Show whole diagram</button>
          <button type="button" onClick={resetPositions} disabled={!positionsChanged && !graph.hasSavedLayout}>Reset positions</button>
          {selection?.lens === lens && <button type="button" onClick={onClear}>Show all</button>}
        </Panel>
      </ReactFlow>
    </div>
  </section>;
}

function GraphCanvas(props) {
  return <ReactFlowProvider><GraphCanvasInner {...props} /></ReactFlowProvider>;
}

function BuildFeature({ setTab }) {
  const [activeStage, setActiveStage] = useState("outcome");
  const stage = featurePath.stages.find((item) => item.id === activeStage) ?? featurePath.stages[0];
  return <section className="build-feature">
    <div className="feature-hero">
      <span className="eyebrow">Build a Feature v0</span>
      <h2>{featurePath.title}</h2>
      <p>{featurePath.outcome}</p>
      <div className="feature-actions">
        <button type="button" onClick={() => setTab("component")}>Try it in the system map</button>
        <button type="button" className="secondary" onClick={() => setTab("state")}>Try it in the lifecycle map</button>
      </div>
    </div>

    <section className="problem-card">
      <span className="eyebrow">The problem</span>
      <h3>{featurePath.problem}</h3>
    </section>

    <div className="engineering-path" aria-label="Feature engineering path">
      {featurePath.stages.map((item, index) => <button type="button" key={item.id} aria-selected={activeStage === item.id} onClick={() => setActiveStage(item.id)}><span>{index + 1}</span><strong>{item.label}</strong></button>)}
    </div>

    <section className="stage-detail">
      <div><span className="eyebrow">{stage.label}</span><h3>{stage.question}</h3><p>{stage.result}</p></div>
      <details className="technical-details"><summary>Technical details for this stage</summary><StageTechnical stageId={stage.id} /></details>
    </section>

    <div className="decision-grid">
      {featurePath.decisions.map((decision) => <article key={decision.id}><span className="eyebrow">Decision</span><h3>{decision.question}</h3><strong>{decision.decision}</strong><p>{decision.reason}</p></article>)}
    </div>

    <div className="feature-lower-grid">
      <section><span className="eyebrow">How we know it worked</span><h3>Success criteria</h3><ul>{featurePath.successCriteria.map((item) => <li key={item}>{item}</li>)}</ul></section>
      <section><span className="eyebrow">What this feature does not do</span><h3>Boundaries</h3><ul>{featurePath.nonclaims.map((item) => <li key={item}>{item}</li>)}</ul></section>
    </div>
  </section>;
}

function StageTechnical({ stageId }) {
  const content = {
    outcome: <><p>Product outcome, not a storage implementation: the arrangement is the user's presentation preference.</p><code>feature: saved-graph-layouts</code></>,
    behavior: <><p>Autosave happens when dragging ends. Reset removes the saved layout. Restore requires the exact subject revision and lens.</p></>,
    design: <><p>The record schema is intentionally narrow:</p><pre>{`schemaVersion\nworkbenchId\nsubjectRevision\nlens\nsavedAt\npositions[] -> { id, x, y }`}</pre></>,
    build: <><code>src/layout-persistence.mjs</code><code>review-workbench-v13/src/main.jsx</code><code>review-workbench/saved-layout-feature-v1.3.json</code></>,
    test: <><code>test/layout-persistence.test.mjs</code><p>Tests cover revision scoping, positions-only records, save/restore, reset, stale layouts, missing/unknown nodes, and storage failure.</p></>,
    release: <><p>CI produces one self-contained <code>review-workbench-v1.3/index.html</code> artifact from the tested branch revision.</p></>,
    use: <><p>Browser storage is <code>localStorage</code>. There is no server, account, cloud sync, or semantic write-back in v0.</p></>
  };
  return content[stageId] ?? null;
}

function Verification() {
  return <section>
    <header className="lens-heading"><div><span className="eyebrow">Prove the behavior</span><h2>Tests & evidence</h2></div><p>The important claim is not just “we used localStorage.” It is that presentation state persists without becoming architecture truth.</p></header>
    <div className="requirement-grid">{FEATURE_REQUIREMENTS.map((item) => <article key={item.id}><span>{item.id}</span><h3>{item.title}</h3><p>{item.question}</p><small>{item.evidence}</small></article>)}</div>
    <section className="evidence-callout"><h3>Executable evidence</h3><p>The repository CI run for this exact v1.3 revision must pass <code>npm test</code> and <code>npm run build:review-workbench:v1.3</code> before this checkpoint is considered verified.</p></section>
  </section>;
}

function Review() {
  return <section>
    <header className="lens-heading"><div><span className="eyebrow">Human checkpoint</span><h2>Did we build the right thing?</h2></div><p>Use the feature first, then judge both the software behavior and whether the engineering path made the implementation understandable.</p></header>
    <div className="review-grid">
      <section><h3>Try the product behavior</h3><ol><li>Open System map.</li><li>Drag a box somewhere obvious.</li><li>Reload or reopen the same artifact.</li><li>Confirm the box comes back in that position.</li><li>Press Reset positions and confirm the default layout returns.</li></ol></section>
      <section><h3>Check the architecture boundary</h3><ul><li>Moving a box must not change an arrow or relationship.</li><li>A saved layout is tied to the exact reviewed revision.</li><li>Only node IDs and coordinates are saved.</li><li>Passing automated checks does not become human acceptance.</li></ul></section>
      <section className="human-question"><span className="eyebrow">Your review</span><h3>Could you follow this feature from problem → behavior → design → build → test → release without starting in the code?</h3><p>That is the larger Representation Router capability being tested here.</p></section>
    </div>
  </section>;
}

function SourceList({ sourceIds = [] }) {
  const sourceMap = Object.fromEntries(baseModel.sources.map((item) => [item.id, item]));
  const sources = sourceIds.map((id) => sourceMap[id]).filter(Boolean);
  if (!sources.length) return <p className="muted">No separate source link is attached.</p>;
  return <ul className="source-list">{sources.map((source) => <li key={source.id}><a href={source.url} target="_blank" rel="noreferrer">{source.label} ↗</a><small>{source.role} · {source.revision}</small></li>)}</ul>;
}

function Inspector({ selection }) {
  if (!selection) return <aside className="inspector is-empty"><span className="eyebrow">Details</span><h2>Click a box or line</h2><p>You can inspect the architecture while your layout is remembered separately from it.</p></aside>;

  if (selection.lens === "component") {
    if (selection.type === "node") {
      const node = architecture.component.nodes.find((item) => item.id === selection.id);
      if (!node) return null;
      return <aside className="inspector"><span className="eyebrow">Selected part</span><h2>{COMPONENT_LABELS[node.id]?.[0] ?? node.title}</h2><section><h4>What this is</h4><p>{COMPONENT_LABELS[node.id]?.[1] ?? node.summary}</p></section><section><h4>Source</h4><SourceList sourceIds={node.sourceIds} /></section><details><summary>Technical details</summary><dl><div><dt>Exact name</dt><dd>{node.title}</dd></div><div><dt>Stable ID</dt><dd><code>{node.id}</code></dd></div><div><dt>Owner</dt><dd>{node.owner}</dd></div></dl></details></aside>;
    }
    const edge = architecture.component.edges.find((item) => item.id === selection.id);
    if (!edge) return null;
    const meta = interactions.component.edges[edge.id] ?? {};
    return <aside className="inspector"><span className="eyebrow">Selected relationship</span><h2>{COMPONENT_EDGE_LABELS[edge.id] ?? edge.label}</h2><section><h4>Connects</h4><p><strong>{COMPONENT_LABELS[edge.from]?.[0] ?? edge.from}</strong> → <strong>{COMPONENT_LABELS[edge.to]?.[0] ?? edge.to}</strong></p></section><section><h4>What this relationship means</h4><p>{meta.meaning}</p></section><section><h4>What this does not mean</h4><p>{meta.nonclaim}</p></section><section><h4>Source</h4><SourceList sourceIds={meta.sourceIds} /></section><details><summary>Technical details</summary><dl><div><dt>Formal relationship</dt><dd>{edge.label}</dd></div><div><dt>Relationship ID</dt><dd><code>{edge.id}</code></dd></div></dl></details></aside>;
  }

  if (selection.lens === "state") {
    if (selection.type === "node") {
      const state = architecture.state.states.find((item) => item.id === selection.id);
      if (!state) return null;
      return <aside className="inspector"><span className="eyebrow">Selected step</span><h2>{STATE_LABELS[state.id] ?? state.label}</h2><section><h4>What this is</h4><p>{state.summary}</p></section><section><h4>Source</h4><SourceList sourceIds={state.sourceIds} /></section><details><summary>Technical details</summary><dl><div><dt>Exact state</dt><dd>{state.label}</dd></div><div><dt>State ID</dt><dd><code>{state.id}</code></dd></div></dl></details></aside>;
    }
    const transition = architecture.state.transitions.find((item) => item.id === selection.id);
    if (!transition) return null;
    const meta = interactions.state.transitions[transition.id] ?? {};
    return <aside className="inspector"><span className="eyebrow">Selected transition</span><h2>{STATE_EDGE_LABELS[transition.id] ?? transition.label}</h2><section><h4>Connects</h4><p><strong>{STATE_LABELS[transition.from] ?? transition.from}</strong> → <strong>{STATE_LABELS[transition.to] ?? transition.to}</strong></p></section><section><h4>What this relationship means</h4><p>{meta.meaning}</p></section><section><h4>What this does not mean</h4><p>{meta.nonclaim}</p></section><details><summary>Technical details</summary><dl><div><dt>Formal transition</dt><dd>{transition.label}</dd></div><div><dt>Authority</dt><dd>{transition.authority}</dd></div></dl></details></aside>;
  }

  return null;
}

function App() {
  const componentInitial = useMemo(() => componentGraph(), []);
  const stateInitial = useMemo(() => stateGraph(), []);
  const component = usePersistentGraph("component", componentInitial);
  const state = usePersistentGraph("state", stateInitial);
  const [tab, setTab] = useState("build");
  const [selection, setSelection] = useState(null);

  return <main className="app-shell">
    <header className="topbar">
      <div><span className="eyebrow">Representation Router · first build vertical</span><h1>Build a feature end to end</h1><p>Start from a human outcome, follow the engineering decisions, then use the real feature.</p></div>
      <details className="subject-details"><summary>Exact software subject</summary><code>{SUBJECT_REVISION}</code><span>{baseModel.subject.label}</span></details>
    </header>
    <nav className="tabs" aria-label="Feature engineering path">{TABS.map(([id, label]) => <button type="button" key={id} aria-selected={tab === id} onClick={() => setTab(id)}>{label}</button>)}</nav>
    <div className="workspace-grid">
      <section className="main-panel">
        {tab === "build" && <BuildFeature setTab={setTab} />}
        {tab === "component" && <GraphCanvas lens="component" title="System map — arrange it your way" question="Move boxes into an arrangement that helps you think. This browser should remember the positions for this exact revision." graph={component} selection={selection} onSelect={setSelection} onClear={() => setSelection(null)} />}
        {tab === "state" && <GraphCanvas lens="state" title="Lifecycle map — arrange it your way" question="The same saved-layout behavior works here, while the lifecycle relationships remain unchanged." graph={state} selection={selection} onSelect={setSelection} onClear={() => setSelection(null)} />}
        {tab === "verification" && <Verification />}
        {tab === "review" && <Review />}
      </section>
      <Inspector selection={selection} />
    </div>
    <footer><span>Saved layout = browser-local presentation state.</span><span>Architecture relationships and software truth remain source-owned.</span></footer>
  </main>;
}

createRoot(document.getElementById("root")).render(<App />);
