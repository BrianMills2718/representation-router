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
  applyNodeChanges,
  useReactFlow
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "./styles.css";
import architecture from "../../review-workbench/pr22.architecture-v1.json";
import candidateSpec from "../generated/candidate-spec.json";
import { clearLayout, loadLayout, saveLayout } from "../../src/layout-persistence.mjs";

const WORKBENCH_ID = `implementation-runner-v0:${candidateSpec.adapterId}:${candidateSpec.adapterVersion}`;
const SUBJECT_REVISION = candidateSpec.subjectRevision;

const TABS = [
  ["intent", "What was requested"],
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
      style: { strokeWidth: 2, strokeDasharray: edge.style === "dashed" ? "7 6" : undefined },
      data: { exactLabel: edge.label }
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
      style: { strokeWidth: 2 },
      data: { exactLabel: transition.label, authority: transition.authority }
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

function useGeneratedGraph(lens, initialGraph) {
  const storage = useMemo(() => browserStorage(), []);
  const identity = useMemo(() => ({ workbenchId: WORKBENCH_ID, subjectRevision: SUBJECT_REVISION, lens }), [lens]);
  const initialLoad = useMemo(() => loadLayout(storage, { ...identity, defaultNodes: initialGraph.nodes }), [storage, identity, initialGraph]);
  const [nodes, setNodes] = useState(() => initialLoad.nodes);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState(initialLoad.status === "restored" ? "restored" : initialLoad.status === "unavailable" ? "unavailable" : "idle");
  const [savedAt, setSavedAt] = useState(initialLoad.record?.savedAt ?? null);
  const [confirmReset, setConfirmReset] = useState(false);

  const persist = useCallback((nextNodes) => {
    const result = saveLayout(storage, { ...identity, nodes: nextNodes });
    setStatus(result.status);
    setSavedAt(result.record?.savedAt ?? null);
    if (result.status === "saved") setDirty(false);
    return result;
  }, [storage, identity]);

  const move = useCallback((nodeId, position) => {
    const nextNodes = nodes.map((node) => node.id === nodeId
      ? { ...node, position: { x: position.x, y: position.y } }
      : { ...node, position: { ...node.position } });
    setNodes(nextNodes);

    if (candidateSpec.decisions.rememberMode === "automatic-after-drag") {
      persist(nextNodes);
    } else {
      setDirty(true);
      setStatus(storage ? "unsaved" : "unavailable");
    }
  }, [nodes, persist, storage]);

  const save = useCallback(() => persist(nodes), [persist, nodes]);

  const performReset = useCallback(() => {
    const cleared = clearLayout(storage, identity);
    setNodes(cloneNodes(initialGraph.nodes));
    setDirty(false);
    setSavedAt(null);
    setStatus(cleared.status === "cleared" ? "cleared" : cleared.status);
    setConfirmReset(false);
  }, [storage, identity, initialGraph]);

  const requestReset = useCallback(() => {
    if (candidateSpec.decisions.resetMode === "confirm-before-reset") setConfirmReset(true);
    else performReset();
  }, [performReset]);

  return {
    nodes,
    setNodes,
    edges: initialGraph.edges,
    dirty,
    status,
    savedAt,
    confirmReset,
    move,
    save,
    requestReset,
    cancelReset: () => setConfirmReset(false),
    confirm: performReset
  };
}

function statusCopy(graph) {
  if (graph.status === "restored") return ["Saved arrangement restored", "The last saved arrangement for this exact revision was restored."];
  if (graph.status === "saved") return ["Arrangement saved", graph.savedAt ? `Saved ${new Date(graph.savedAt).toLocaleString()}.` : "The current arrangement is now the saved version."];
  if (graph.status === "unsaved") return ["You have unsaved changes", "The boxes moved, but this arrangement has not been saved yet."];
  if (graph.status === "cleared") return ["Saved arrangement cleared", "The deterministic default positions are active again."];
  if (graph.status === "unavailable") return ["Saving is unavailable in this browser", "You can still rearrange the diagram, but this browser cannot remember it."];
  return ["Ready", candidateSpec.decisions.rememberMode === "explicit-save" ? "Move boxes, then choose Save arrangement when you want to remember the result." : "Move boxes; the arrangement saves automatically after each move."];
}

function shouldShowReceipt(status) {
  if (status === "unavailable" || status === "unsaved" || status === "restored" || status === "cleared") return true;
  if (status === "saved") return candidateSpec.decisions.saveReceipt === "visible-after-save";
  return true;
}

function GraphViewInner({ lens, title, graph, selection, onSelect }) {
  const { fitView } = useReactFlow();
  const [statusTitle, statusDetail] = statusCopy(graph);
  const explicitSave = candidateSpec.decisions.rememberMode === "explicit-save";

  return <section className="graph-page">
    <header className="page-heading">
      <span className="eyebrow">Generated candidate · {candidateSpec.adapterId}</span>
      <h2>{title}</h2>
      <p>{explicitSave ? "Drag boxes freely. The arrangement is remembered only when you choose Save arrangement." : "Drag boxes freely. The arrangement is remembered automatically after each move."}</p>
    </header>

    {shouldShowReceipt(graph.status) && <div className={`save-status state-${graph.status}`} role="status">
      <div><strong>{statusTitle}</strong><span>{statusDetail}</span></div>
      <small>Generated from the implementation brief; storage remains browser-local and revision-bound.</small>
    </div>}

    <div className="flow-shell">
      <ReactFlow
        nodes={graph.nodes}
        edges={graph.edges}
        nodeTypes={nodeTypes}
        onNodesChange={(changes) => graph.setNodes((current) => applyNodeChanges(changes, current))}
        onNodeDragStop={(_, node) => graph.move(node.id, node.position)}
        onNodeClick={(_, node) => onSelect({ lens, type: "node", id: node.id, data: node.data })}
        onEdgeClick={(_, edge) => onSelect({ lens, type: "edge", id: edge.id, source: edge.source, target: edge.target, data: edge.data })}
        nodesConnectable={false}
        edgesFocusable
        nodesFocusable
        fitView
        minZoom={0.25}
        maxZoom={2.5}
      >
        <Background gap={22} size={1} />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable nodeStrokeWidth={2} />
        <Panel position="top-left" className="graph-toolbar">
          <button type="button" onClick={() => fitView({ padding: 0.18, duration: 250 })}>Show whole diagram</button>
          {explicitSave && <button type="button" className="primary" onClick={graph.save} disabled={!graph.dirty || graph.status === "unavailable"}>Save arrangement</button>}
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

    {selection?.lens === lens && <aside className="selection-card">
      <span className="eyebrow">Selected {selection.type}</span>
      {selection.type === "node" ? <><h3>{selection.data.title}</h3><p>{selection.data.summary}</p><code>{selection.id}</code></> : <><h3>{selection.data?.exactLabel ?? selection.id}</h3><p>{selection.source} → {selection.target}</p><code>{selection.id}</code></>}
    </aside>}
  </section>;
}

function GraphView(props) {
  return <ReactFlowProvider><GraphViewInner {...props} /></ReactFlowProvider>;
}

function IntentPage() {
  const rows = [
    ["When to remember", candidateSpec.decisions.rememberMode],
    ["Save confirmation", candidateSpec.decisions.saveReceipt],
    ["Reset behavior", candidateSpec.decisions.resetMode],
    ["Where saved", candidateSpec.decisions.storageScope],
    ["Revision rule", candidateSpec.decisions.revisionPolicy],
    ["What is saved", candidateSpec.decisions.recordContents]
  ];
  return <section className="intent-page">
    <div className="hero-card">
      <span className="eyebrow">Generated from a supported implementation brief</span>
      <h2>{candidateSpec.outcome}</h2>
      <p>{candidateSpec.successCriterion}</p>
    </div>
    <div className="decision-grid">
      {rows.map(([label, value]) => <article key={label}><span>{label}</span><strong>{value}</strong></article>)}
    </div>
    <section className="boundary-card">
      <h3>What the runner was allowed to change</h3>
      <p>Only supported saved-layout interaction choices. The generated browser candidate still cannot edit Git, planning authority, product authority, or semantic graph relationships.</p>
      <details><summary>Technical details</summary><p>Adapter <code>{candidateSpec.adapterId}</code> v{candidateSpec.adapterVersion}; brief baseline <code>{candidateSpec.briefBaselineRevision}</code>; represented software revision <code>{candidateSpec.subjectRevision}</code>.</p></details>
    </section>
  </section>;
}

function ReviewPage() {
  return <section className="review-page">
    <header className="page-heading">
      <span className="eyebrow">Human checkpoint</span>
      <h2>Does the generated candidate match the authored intent?</h2>
      <p>The runner can prove that it routed and built a supported candidate. You still decide whether the resulting interaction is the right product behavior.</p>
    </header>
    <div className="scenario-grid">
      {candidateSpec.acceptanceScenarios.map((scenario) => <article key={scenario.id}><strong>{scenario.title}</strong><p><b>Given</b> {scenario.given}</p><p><b>When</b> {scenario.when}</p><p><b>Then</b> {scenario.then}</p></article>)}
    </div>
  </section>;
}

function App() {
  const componentInitial = useMemo(() => componentGraph(), []);
  const stateInitial = useMemo(() => stateGraph(), []);
  const component = useGeneratedGraph("component", componentInitial);
  const state = useGeneratedGraph("state", stateInitial);
  const [tab, setTab] = useState("intent");
  const [selection, setSelection] = useState(null);

  return <main className="app-shell">
    <header className="topbar">
      <div><span className="eyebrow">Representation Router · Implementation Runner v0</span><h1>Candidate generated from the brief</h1><p>The implementation adapter interpreted supported engineering decisions and built this candidate without hand-authoring a new candidate source tree.</p></div>
      <details><summary>Exact runner subject</summary><code>{candidateSpec.briefBaselineRevision}</code><span>{candidateSpec.featureId}</span></details>
    </header>

    <nav className="tabs" aria-label="Generated candidate views">{TABS.map(([id, label]) => <button type="button" key={id} aria-selected={tab === id} onClick={() => setTab(id)}>{label}</button>)}</nav>

    <section className="main-panel">
      {tab === "intent" && <IntentPage />}
      {tab === "component" && <GraphView lens="component" title="System map" graph={component} selection={selection} onSelect={setSelection} />}
      {tab === "state" && <GraphView lens="state" title="Lifecycle map" graph={state} selection={selection} onSelect={setSelection} />}
      {tab === "review" && <ReviewPage />}
    </section>

    <footer><span>Generated candidate workspace · no browser Git authority.</span><span>Runner/build success ≠ human acceptance.</span></footer>
  </main>;
}

createRoot(document.getElementById("root")).render(<App />);
