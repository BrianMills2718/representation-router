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
import brief from "../../examples/implementation-brief-explicit-save-v0.json";
import { loadLayout } from "../../src/layout-persistence.mjs";
import {
  applyUnsavedMove,
  confirmCandidateReset,
  persistExplicitLayout,
  validateImplementationBrief
} from "../../src/implementation-loop.mjs";

validateImplementationBrief(brief);

const WORKBENCH_ID = "representation-router-explicit-save-v1.4";
const SUBJECT_REVISION = baseModel.subject.mergeRevision;

const TABS = [
  ["brief", "Why this candidate exists"],
  ["component", "System map"],
  ["state", "Lifecycle map"],
  ["review", "Review candidate"]
];

const COMPONENT_LABELS = {
  domain: ["Source of truth", "The system that owns real meaning and state."],
  viewspec: ["One focused view", "A focused answer to one software question."],
  surfacespec: ["Combined working view", "Several focused views coordinated into one workspace."],
  product: ["The app people use", "The product interface that renders the working view."],
  evidence: ["Checks and evidence", "Tests and execution records that support claims."],
  human: ["Person reviewing or operating", "The person using or judging the software."]
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

function browserStorage() {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function cloneNodes(nodes) {
  return nodes.map((node) => ({ ...node, position: { ...node.position }, data: node.data ? { ...node.data } : node.data }));
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
      label: edge.label,
      type: "smoothstep",
      interactionWidth: 32,
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { strokeWidth: 2, strokeDasharray: edge.style === "dashed" ? "7 6" : undefined }
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
      label: transition.label,
      type: "smoothstep",
      interactionWidth: 32,
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { strokeWidth: 2 }
    }))
  };
}

function SemanticNode({ data, selected }) {
  return <article className={`semantic-node ${selected ? "is-selected" : ""}`}>
    <Handle type="target" position={Position.Left} />
    <span className="node-tag">{data.tag}</span>
    <strong>{data.title}</strong>
    <p>{data.summary}</p>
    <small>{data.owner}</small>
    <Handle type="source" position={Position.Right} />
  </article>;
}

const nodeTypes = { semantic: SemanticNode };

function useExplicitSaveGraph(lens, initialGraph) {
  const storage = useMemo(() => browserStorage(), []);
  const identity = useMemo(() => ({ workbenchId: WORKBENCH_ID, subjectRevision: SUBJECT_REVISION, lens }), [lens]);
  const initialLoad = useMemo(() => loadLayout(storage, { ...identity, defaultNodes: initialGraph.nodes }), [storage, identity, initialGraph]);
  const [nodes, setNodes] = useState(() => initialLoad.nodes);
  const [edges, setEdges] = useState(() => initialGraph.edges.map((edge) => ({ ...edge })));
  const [status, setStatus] = useState(initialLoad.status === "restored" ? "restored" : initialLoad.status === "unavailable" ? "unavailable" : "idle");
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState(initialLoad.record?.savedAt ?? null);
  const [confirmReset, setConfirmReset] = useState(false);

  const move = useCallback((nodeId, position) => {
    setNodes((current) => applyUnsavedMove(current, nodeId, position));
    setDirty(true);
    setStatus(storage ? "unsaved" : "unavailable");
  }, [storage]);

  const save = useCallback(() => {
    const result = persistExplicitLayout(storage, identity, nodes);
    setStatus(result.status);
    setSavedAt(result.record?.savedAt ?? null);
    if (result.status === "saved") setDirty(false);
    return result;
  }, [storage, identity, nodes]);

  const requestReset = useCallback(() => setConfirmReset(true), []);
  const cancelReset = useCallback(() => setConfirmReset(false), []);
  const confirm = useCallback(() => {
    const result = confirmCandidateReset(storage, identity, initialGraph.nodes);
    setNodes(result.nodes);
    setStatus(result.status === "cleared" ? "cleared" : result.status);
    setDirty(false);
    setSavedAt(null);
    setConfirmReset(false);
    return result;
  }, [storage, identity, initialGraph]);

  return {
    nodes,
    setNodes,
    edges,
    setEdges,
    dirty,
    status,
    savedAt,
    confirmReset,
    move,
    save,
    requestReset,
    cancelReset,
    confirm
  };
}

function statusCopy(graph) {
  if (graph.status === "restored") return ["Saved arrangement restored", "Only the last explicitly saved arrangement was restored."];
  if (graph.status === "saved") return ["Arrangement saved", graph.savedAt ? `Saved ${new Date(graph.savedAt).toLocaleString()}.` : "This is now the arrangement that will be restored."];
  if (graph.status === "unsaved") return ["You have unsaved changes", "Dragging changes the working layout only. Choose Save arrangement if you want this version remembered."];
  if (graph.status === "cleared") return ["Saved arrangement cleared", "The deterministic default positions are active again."];
  if (graph.status === "unavailable") return ["Saving is unavailable in this browser", "You can still rearrange the diagram, but the arrangement cannot be remembered here."];
  return ["Nothing saved yet", "Move boxes freely. Saving happens only when you choose Save arrangement."];
}

function GraphWorkspaceInner({ lens, title, subtitle, graph }) {
  const { fitView } = useReactFlow();
  const [statusTitle, statusDetail] = statusCopy(graph);

  return <section className="graph-page">
    <header className="page-heading">
      <span className="eyebrow">Implementation candidate</span>
      <h2>{title}</h2>
      <p>{subtitle}</p>
    </header>

    <div className={`save-status state-${graph.status}`} role="status">
      <div><strong>{statusTitle}</strong><span>{statusDetail}</span></div>
      <small>Candidate decision: explicit save · confirmed reset</small>
    </div>

    <div className="flow-shell">
      <ReactFlow
        nodes={graph.nodes}
        edges={graph.edges}
        nodeTypes={nodeTypes}
        onNodesChange={(changes) => graph.setNodes((current) => applyNodeChanges(changes, current))}
        onEdgesChange={(changes) => graph.setEdges((current) => applyEdgeChanges(changes, current))}
        onNodeDragStop={(_, node) => graph.move(node.id, node.position)}
        nodesConnectable={false}
        fitView
        minZoom={0.25}
        maxZoom={2.5}
      >
        <Background gap={22} size={1} />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable nodeStrokeWidth={2} />
        <Panel position="top-left" className="graph-toolbar">
          <button type="button" onClick={() => fitView({ padding: 0.18, duration: 250 })}>Show whole diagram</button>
          <button type="button" className="primary" onClick={graph.save} disabled={!graph.dirty || graph.status === "unavailable"}>Save arrangement</button>
          <button type="button" onClick={graph.requestReset}>Reset positions</button>
        </Panel>
      </ReactFlow>
    </div>

    {graph.confirmReset && <div className="reset-dialog" role="dialog" aria-modal="true" aria-labelledby={`${lens}-reset-title`}>
      <div>
        <span className="eyebrow">Confirm reset</span>
        <h3 id={`${lens}-reset-title`}>Delete the saved arrangement and return to default positions?</h3>
        <p>This clears only browser-local layout state. It does not change the software model.</p>
        <div className="dialog-actions">
          <button type="button" onClick={graph.cancelReset}>Keep my arrangement</button>
          <button type="button" className="danger" onClick={graph.confirm}>Reset positions</button>
        </div>
      </div>
    </div>}

    <details className="technical-details">
      <summary>Technical details</summary>
      <p>The candidate still stores only node IDs and x/y coordinates, scoped to this browser, diagram, and represented source revision <code>{SUBJECT_REVISION.slice(0, 12)}…</code>.</p>
      <p>Dragging calls <code>applyUnsavedMove()</code>; only <code>persistExplicitLayout()</code> writes storage. Confirmed reset calls <code>confirmCandidateReset()</code>.</p>
    </details>
  </section>;
}

function GraphWorkspace(props) {
  return <ReactFlowProvider><GraphWorkspaceInner {...props} /></ReactFlowProvider>;
}

function BriefPage() {
  return <section className="brief-page">
    <div className="hero-card">
      <span className="eyebrow">Intent from Feature Studio</span>
      <h2>Build an explicit-save candidate</h2>
      <p>{brief.outcome}</p>
    </div>

    <div className="decision-grid">
      <article><span>1</span><h3>When do we save?</h3><strong>Only when the person chooses Save arrangement.</strong><p>Dragging may change the working layout without becoming the saved version.</p></article>
      <article><span>2</span><h3>How does reset work?</h3><strong>Ask first.</strong><p>Reset positions requires confirmation before deleting browser-local saved state.</p></article>
      <article><span>3</span><h3>What stays fixed?</h3><strong>Browser-local · exact revision · positions only.</strong><p>No semantic relationships, evidence, permissions, or workflow state enter the saved layout.</p></article>
    </div>

    <section className="scenario-section">
      <span className="eyebrow">Acceptance scenarios from the brief</span>
      <h3>What the candidate must prove</h3>
      <div className="scenario-grid">{brief.acceptanceScenarios.map((scenario) => <article key={scenario.id}><strong>{scenario.title}</strong><p><b>Given</b> {scenario.given}</p><p><b>When</b> {scenario.when}</p><p><b>Then</b> {scenario.then}</p></article>)}</div>
    </section>

    <section className="boundary-card">
      <h3>Important boundary</h3>
      <p>This brief was handoff-only. The repository/branch implementation workflow—not the browser Feature Studio—created this candidate source.</p>
      <code>{brief.baselineRevision}</code>
    </section>
  </section>;
}

function ReviewPage() {
  return <section className="review-page">
    <header className="page-heading"><span className="eyebrow">Human review</span><h2>Does the candidate match the authored intent?</h2><p>Automated checks can establish the tested mechanics. You still decide whether this interaction is better.</p></header>
    <div className="review-grid">
      <article><h3>Try unsaved movement</h3><ol><li>Save an arrangement.</li><li>Move a box again.</li><li>Do not press Save arrangement.</li><li>Reload the artifact.</li><li>The earlier saved arrangement should return.</li></ol></article>
      <article><h3>Try explicit save</h3><ol><li>Move a box.</li><li>Press Save arrangement.</li><li>Reload.</li><li>The new arrangement should return.</li></ol></article>
      <article><h3>Try confirmed reset</h3><ol><li>Press Reset positions.</li><li>Cancel once and confirm nothing changes.</li><li>Press Reset positions again.</li><li>Confirm reset and verify defaults return.</li></ol></article>
    </div>
  </section>;
}

function App() {
  const componentInitial = useMemo(() => componentGraph(), []);
  const stateInitial = useMemo(() => stateGraph(), []);
  const component = useExplicitSaveGraph("component", componentInitial);
  const state = useExplicitSaveGraph("state", stateInitial);
  const [tab, setTab] = useState("brief");

  return <main className="app-shell">
    <header className="topbar">
      <div><span className="eyebrow">Representation Router · implementation candidate</span><h1>From authored intent to candidate product</h1><p>This v1.4 artifact implements one Feature Studio brief without changing the reviewed v1.3 baseline.</p></div>
      <details><summary>Exact proving brief</summary><code>{brief.baselineRevision}</code><span>{brief.featureId}</span></details>
    </header>

    <nav className="tabs" aria-label="Candidate views">{TABS.map(([id, label]) => <button type="button" key={id} aria-selected={tab === id} onClick={() => setTab(id)}>{label}</button>)}</nav>

    <section className="main-panel">
      {tab === "brief" && <BriefPage />}
      {tab === "component" && <GraphWorkspace lens="component" title="System map — explicit save candidate" subtitle="Move boxes freely. Nothing is persisted until you choose Save arrangement." graph={component} />}
      {tab === "state" && <GraphWorkspace lens="state" title="Lifecycle map — explicit save candidate" subtitle="The same explicit-save behavior applies while lifecycle relationships remain source-owned." graph={state} />}
      {tab === "review" && <ReviewPage />}
    </section>

    <footer><span>Candidate implementation from a handoff-only brief.</span><span>Executed checks ≠ human acceptance.</span></footer>
  </main>;
}

createRoot(document.getElementById("root")).render(<App />);
