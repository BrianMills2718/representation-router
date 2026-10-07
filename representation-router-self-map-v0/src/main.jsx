import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import model from "../model.json";
import snapshot from "../generated/snapshot.json";
import "./styles.css";

const TABS = [
  ["start", "Start here"],
  ["roadmap", "Roadmap"],
  ["architecture", "How RR works"],
  ["capabilities", "Capability map"],
  ["evidence", "Evidence"],
  ["plans", "Plans / next"]
];

const POSITIONS = {
  "a-domain": { x: 20, y: 230 },
  "a-router": { x: 280, y: 20 },
  "a-recommendation": { x: 550, y: 20 },
  "a-surface": { x: 820, y: 20 },
  "a-home": { x: 1090, y: 20 },
  "a-human": { x: 1370, y: 20 },
  "a-architecture-candidate": { x: 280, y: 220 },
  "a-architecture-provider": { x: 550, y: 220 },
  "a-diagnosis": { x: 280, y: 460 },
  "a-authoring": { x: 550, y: 420 },
  "a-implementation": { x: 820, y: 420 },
  "a-ci": { x: 1090, y: 420 },
  "a-release": { x: 1370, y: 420 }
};

function sourceById(id) {
  return model.sources.find((source) => source.id === id) ?? null;
}

function milestoneById(id) {
  return model.milestones.find((item) => item.id === id) ?? null;
}

function statusLabel(status) {
  return ({
    complete: "Complete",
    "technical-complete-human-pending": "Built · review pending",
    "current-review": "Current review",
    next: "Next",
    later: "Later"
  })[status] ?? status;
}

function repoLink(path) {
  const revision = snapshot.sourceRevision && snapshot.sourceRevision !== "local" ? snapshot.sourceRevision : snapshot.branch;
  return `https://github.com/brianmills-spec/representation-router/blob/${revision}/${path}`;
}

function SourceLinks({ ids = [] }) {
  if (!ids.length) return null;
  return <div className="source-links">
    {ids.map((id) => {
      const source = sourceById(id);
      if (!source) return null;
      return <a key={id} href={repoLink(source.path)} target="_blank" rel="noreferrer">
        <span>{source.label}</span><code>{source.path}</code>
      </a>;
    })}
  </div>;
}

function Badge({ state }) {
  const label = state === "ready" ? "Ready" : state === "partial" ? "Partial" : state === "unavailable" ? "Unavailable" : statusLabel(state);
  return <span className={`badge ${state}`}>{label}</span>;
}

function StartView({ focus }) {
  return <div className="view-stack">
    <section className="hero-card">
      <span className="eyebrow">Representation Router applied to itself</span>
      <h2>What is Representation Router?</h2>
      <p className="lead">{model.mission}</p>
      <div className="rule">{model.coreRule}</div>
    </section>

    <section className="three-up">
      <button className="summary-card current" onClick={() => focus(model.currentCheckpoint.id)}>
        <span className="eyebrow">Where we are now</span>
        <strong>{model.currentCheckpoint.label}</strong>
        <p>{model.currentCheckpoint.question}</p>
      </button>
      <button className="summary-card" onClick={() => focus(model.previousCheckpoint.id)}>
        <span className="eyebrow">Latest technically complete step</span>
        <strong>{model.previousCheckpoint.label}</strong>
        <p>{milestoneById(model.previousCheckpoint.id)?.proved}</p>
      </button>
      <button className="summary-card next" onClick={() => focus(model.nextCheckpoint.id)}>
        <span className="eyebrow">Next meaningful step</span>
        <strong>{model.nextCheckpoint.label}</strong>
        <p>{model.nextCheckpoint.why}</p>
      </button>
    </section>

    <section className="two-up">
      <article className="panel">
        <span className="eyebrow">The product thesis</span>
        <h3>Start from the engineering job</h3>
        <p>{model.productThesis}</p>
        <div className="simple-flow">
          <span>Human job</span><b>→</b><span>semantic view</span><b>→</b><span>representation</span><b>→</b><span>working surface</span><b>→</b><span>implementation + evidence</span>
        </div>
      </article>
      <article className="panel">
        <span className="eyebrow">Important distinction</span>
        <h3>RR core vs RR product</h3>
        <div className="compare-row"><strong>Core</strong><p>Routing, ViewSpecs, working-surface contracts, interaction/implementation guidance, adapter boundaries, provenance.</p></div>
        <div className="compare-row"><strong>Product / proving surfaces</strong><p>Review Workbench, Engineering Studio, Engineering Home, Implementation Runner UI, Release/Operate, this Self Map.</p></div>
        <p className="muted">The proving surfaces exercise the thesis. They are not automatically all part of the minimal reusable core.</p>
      </article>
    </section>

    <section className="panel">
      <span className="eyebrow">How to use this</span>
      <h3>One project, several questions</h3>
      <div className="question-grid">
        <div><strong>Why did we build this?</strong><span>Roadmap</span></div>
        <div><strong>How do the pieces fit?</strong><span>How RR works</span></div>
        <div><strong>What can it actually do?</strong><span>Capability map</span></div>
        <div><strong>What is really proven?</strong><span>Evidence</span></div>
        <div><strong>What are we doing next?</strong><span>Plans / next</span></div>
      </div>
    </section>
  </div>;
}

function RoadmapView({ focusId, focus }) {
  return <div className="view-stack">
    <section className="section-intro">
      <span className="eyebrow">Project progression</span>
      <h2>Why the project grew in this order</h2>
      <p>Each milestone exists because the previous one exposed a concrete gap. Click a milestone to see its purpose, proof, sources, and nonclaim in the inspector.</p>
    </section>
    {model.phases.map((phase) => {
      const milestones = model.milestones.filter((item) => item.phaseId === phase.id).sort((a, b) => a.sequence - b.sequence);
      if (!milestones.length) return null;
      return <section className="phase" key={phase.id}>
        <header><div><span className="eyebrow">{phase.label}</span><p>{phase.summary}</p></div></header>
        <div className="milestone-grid">
          {milestones.map((item) => <button key={item.id} className={`milestone ${focusId === item.id ? "selected" : ""}`} onClick={() => focus(item.id)}>
            <Badge state={item.status} />
            <strong>{item.label}</strong>
            <p>{item.why}</p>
            <small>{item.status === "next" ? "Not started" : item.status === "later" ? "Later" : "Inspect →"}</small>
          </button>)}
        </div>
      </section>;
    })}
  </div>;
}

function nodeClass(kind) {
  return `arch-node ${kind}`;
}

function ArchitectureCanvas({ focusId, focus }) {
  const initialNodes = useMemo(() => model.architecture.nodes.map((node) => ({
    id: node.id,
    position: { ...(POSITIONS[node.id] ?? { x: 0, y: 0 }) },
    data: { label: <div><small>{node.kind.replaceAll("-", " ")}</small><strong>{node.label}</strong></div> },
    className: nodeClass(node.kind),
    sourcePosition: "right",
    targetPosition: "left"
  })), []);
  const initialEdges = useMemo(() => model.architecture.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label,
    markerEnd: { type: MarkerType.ArrowClosed },
    interactionWidth: 28
  })), []);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const { fitView } = useReactFlow();

  const selectedNode = model.architecture.nodes.find((node) => node.id === focusId);
  const selectedEdge = model.architecture.edges.find((edge) => edge.id === focusId);
  const neighborhood = useMemo(() => {
    if (!selectedNode) return new Set();
    const ids = new Set([selectedNode.id]);
    model.architecture.edges.forEach((edge) => {
      if (edge.source === selectedNode.id) ids.add(edge.target);
      if (edge.target === selectedNode.id) ids.add(edge.source);
    });
    return ids;
  }, [selectedNode]);

  const displayNodes = nodes.map((node) => ({
    ...node,
    style: {
      opacity: selectedNode && !neighborhood.has(node.id) ? 0.28 : 1,
      outline: focusId === node.id ? "3px solid #2563eb" : undefined
    }
  }));
  const displayEdges = edges.map((edge) => {
    const active = focusId === edge.id || (selectedNode && (edge.source === selectedNode.id || edge.target === selectedNode.id));
    const dim = selectedNode && !active;
    return { ...edge, animated: focusId === edge.id, style: { opacity: dim ? 0.16 : 1, strokeWidth: active ? 3 : 1.5 } };
  });

  function resetPositions() {
    setNodes(initialNodes.map((node) => ({ ...node, position: { ...node.position } })));
    requestAnimationFrame(() => fitView({ padding: 0.14, duration: 300 }));
  }

  return <div className="architecture-shell">
    <div className="graph-toolbar">
      <span>Drag boxes to rearrange. Click a box or line to understand it.</span>
      <div><button onClick={() => fitView({ padding: 0.14, duration: 300 })}>Show whole diagram</button><button onClick={resetPositions}>Reset positions</button></div>
    </div>
    <div className="graph-canvas">
      <ReactFlow
        nodes={displayNodes}
        edges={displayEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={(_, node) => focus(node.id)}
        onEdgeClick={(_, edge) => focus(edge.id)}
        nodesConnectable={false}
        fitView
        minZoom={0.35}
        maxZoom={1.6}
      >
        <Background gap={24} size={1} />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable />
      </ReactFlow>
    </div>
  </div>;
}

function ArchitectureView({ focusId, focus }) {
  return <div className="view-stack">
    <section className="section-intro">
      <span className="eyebrow">RR architecture</span>
      <h2>How Representation Router works</h2>
      <p>This graph separates external truth, source-neutral semantic boundaries, reusable RR routing, provider adapters, supported authoring/implementation extensions, product/proving surfaces, repository evidence, release evidence, and human judgment.</p>
    </section>
    <ArchitectureCanvas focusId={focusId} focus={focus} />
    <div className="legend">
      <span><i className="dot external-authority" />External authority</span>
      <span><i className="dot core" />Core representation intelligence</span>
      <span><i className="dot extended-core" />Supported E2E extensions</span>
      <span><i className="dot product" />Product / proving surface</span>
      <span><i className="dot repository-authority" />Repository execution authority</span>
      <span><i className="dot human-authority" />Human judgment</span>
    </div>
  </div>;
}

function CapabilityView({ focusId, focus }) {
  return <div className="view-stack">
    <section className="section-intro">
      <span className="eyebrow">Current capability truth</span>
      <h2>What RR can actually do today</h2>
      <p>No global completion percentage. Each engineering job has a different maturity and authority boundary.</p>
    </section>
    <div className="cap-grid">
      {model.capabilities.map((capability) => <button key={capability.id} onClick={() => focus(capability.id)} className={`cap-card ${focusId === capability.id ? "selected" : ""}`}>
        <Badge state={capability.state} />
        <strong>{capability.label}</strong>
        <p>{capability.summary}</p>
        <small>{capability.limit}</small>
      </button>)}
    </div>
    <div className="truth-strip"><strong>Most important open boundary:</strong> real product / production deployment and observability are not connected. CI staging is real evidence for its own sandbox, not a substitute for that missing integration.</div>
  </div>;
}

function EvidenceView({ focusId, focus }) {
  return <div className="view-stack">
    <section className="section-intro">
      <span className="eyebrow">Evidence model</span>
      <h2>What is designed vs what actually ran</h2>
      <div className="evidence-chain"><span>Claim</span><b>→</b><span>Source / implementation</span><b>→</b><span>Check definition</span><b>→</b><span>Executed CI</span><b>→</b><span>Artifact</span><b>→</b><span>Human review</span></div>
    </section>
    <div className="evidence-list">
      {model.evidence.map((item) => <button key={item.id} onClick={() => focus(item.id)} className={`evidence-card ${focusId === item.id ? "selected" : ""}`}>
        <span className={`evidence-kind ${item.kind}`}>{item.kind === "executed-proof" ? "Executed proof" : "Check defined · execution pending"}</span>
        <strong>{item.label}</strong>
        <p>{item.claim}</p>
        <div><b>Proof:</b> {item.proof}</div>
        <div className="nonclaim"><b>Does not prove:</b> {item.doesNotProve}</div>
      </button>)}
    </div>
  </div>;
}

function PlansView({ focus }) {
  const current = milestoneById(model.currentCheckpoint.id);
  const previous = milestoneById(model.previousCheckpoint.id);
  const next = milestoneById(model.nextCheckpoint.id);
  const later = model.milestones.filter((item) => item.status === "later");
  return <div className="view-stack">
    <section className="section-intro">
      <span className="eyebrow">Current work</span>
      <h2>What we are doing now and what comes next</h2>
      <p>This view is intentionally more conservative than the product roadmap: technical completion, human review, and blocked external dependencies stay separate.</p>
    </section>
    <div className="plan-lane">
      <button onClick={() => focus(previous.id)}><span className="eyebrow">Previous technical checkpoint</span><strong>{previous.label}</strong><Badge state={previous.status} /><p>{previous.proved}</p></button>
      <button className="current" onClick={() => focus(current.id)}><span className="eyebrow">Current human checkpoint</span><strong>{current.label}</strong><Badge state={current.status} /><p>{current.why}</p></button>
      <button className="next" onClick={() => focus(next.id)}><span className="eyebrow">Next</span><strong>{next.label}</strong><Badge state={next.status} /><p>{model.nextCheckpoint.why}</p></button>
    </div>
    <section className="two-up">
      <article className="panel">
        <span className="eyebrow">Why we stop before the next tranche</span>
        <h3>We need a real external authority</h3>
        <p>{model.nextCheckpoint.why}</p>
        <p className="muted">Another CI/local sandbox could exercise more mechanics, but it would not establish product-owned deployment credentials, approval policy, telemetry provenance, or rollback authority.</p>
      </article>
      <article className="panel">
        <span className="eyebrow">Later</span>
        <h3>{later.map((item) => item.label).join(" · ")}</h3>
        <p>{later.map((item) => item.why).join(" ")}</p>
      </article>
    </section>
    <section className="panel">
      <span className="eyebrow">Authority boundaries we are preserving</span>
      <div className="boundary-grid">{model.authorityBoundaries.map((item) => <div key={item}>{item}</div>)}</div>
    </section>
    <section className="panel project-facts">
      <span className="eyebrow">This exact Self Map build</span>
      <h3>Repository snapshot</h3>
      <dl>
        <div><dt>Branch</dt><dd><code>{snapshot.branch}</code></dd></div>
        <div><dt>Source revision</dt><dd><code>{snapshot.sourceRevision}</code></dd></div>
        <div><dt>PR</dt><dd><code>#{snapshot.pullRequest}</code></dd></div>
        <div><dt>CI run</dt><dd><code>{snapshot.runId}</code></dd></div>
      </dl>
    </section>
  </div>;
}

function Inspector({ focusId, setTab }) {
  if (!focusId) return <aside className="inspector"><span className="eyebrow">Inspector</span><h3>Select something</h3><p>Click a roadmap milestone, architecture box/line, capability, or evidence card. Your focus stays here when you move between views.</p></aside>;
  const milestone = model.milestones.find((item) => item.id === focusId);
  if (milestone) return <aside className="inspector"><Badge state={milestone.status} /><h3>{milestone.label}</h3><label>Why it exists</label><p>{milestone.why}</p><label>What it proved</label><p>{milestone.proved}</p><label>Key lesson / boundary</label><p>{milestone.lesson}</p><SourceLinks ids={milestone.sourceIds} /><div className="inspector-actions"><button onClick={() => setTab("roadmap")}>See in roadmap</button></div></aside>;

  const node = model.architecture.nodes.find((item) => item.id === focusId);
  if (node) return <aside className="inspector"><span className={`badge ${node.kind}`}>{node.kind.replaceAll("-", " ")}</span><h3>{node.label}</h3><label>What this is</label><p>{node.plain}</p><details><summary>Technical details</summary><p>{node.technical}</p></details><SourceLinks ids={node.sourceIds} /><div className="related"><label>Related milestones</label>{node.milestoneIds.map((id) => <button key={id} onClick={() => setTab("roadmap") || null}>{milestoneById(id)?.label}</button>)}</div></aside>;

  const edge = model.architecture.edges.find((item) => item.id === focusId);
  if (edge) {
    const source = model.architecture.nodes.find((item) => item.id === edge.source);
    const target = model.architecture.nodes.find((item) => item.id === edge.target);
    return <aside className="inspector"><span className="eyebrow">Relationship</span><h3>{source?.label} → {target?.label}</h3><label>Why this connection exists</label><p>{edge.meaning}</p><label>What this does not mean</label><p className="warning-copy">{edge.nonclaim}</p><SourceLinks ids={edge.sourceIds} /></aside>;
  }

  const capability = model.capabilities.find((item) => item.id === focusId);
  if (capability) return <aside className="inspector"><Badge state={capability.state} /><h3>{capability.label}</h3><label>What works now</label><p>{capability.summary}</p><label>Current limit</label><p className="warning-copy">{capability.limit}</p><div className="related"><label>Established by</label>{capability.milestoneIds.map((id) => <button key={id} onClick={() => setTab("roadmap")}>{milestoneById(id)?.label}</button>)}</div></aside>;

  const evidence = model.evidence.find((item) => item.id === focusId);
  if (evidence) return <aside className="inspector"><span className={`evidence-kind ${evidence.kind}`}>{evidence.kind === "executed-proof" ? "Executed proof" : "Definition / pending execution"}</span><h3>{evidence.label}</h3><label>Claim</label><p>{evidence.claim}</p><label>Proof</label><p>{evidence.proof}</p><label>What this does not prove</label><p className="warning-copy">{evidence.doesNotProve}</p><SourceLinks ids={evidence.sourceIds} /></aside>;

  return <aside className="inspector"><h3>Not represented here</h3><p>The selected semantic ID is not represented in this inspector.</p></aside>;
}

function App() {
  const [tab, setTab] = useState("start");
  const [focusId, setFocusId] = useState(model.currentCheckpoint.id);
  const focus = (id) => setFocusId(id);

  return <div className="app-shell">
    <header className="topbar">
      <div><span className="eyebrow">Representation Router · Self Map v0</span><h1>Understand the project we are building</h1><p>RR applied to RR: mission, architecture, roadmap, capability, evidence, current work, and next step.</p></div>
      <div className="snapshot"><span>Current checkpoint</span><strong>{model.currentCheckpoint.label}</strong><small>{snapshot.branch} · {snapshot.sourceRevision.slice(0, 10)}</small></div>
    </header>
    <nav className="tabs" aria-label="Self map views">
      {TABS.map(([id, label]) => <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>{label}</button>)}
    </nav>
    <main className="workspace">
      <section className="main-view">
        {tab === "start" && <StartView focus={focus} />}
        {tab === "roadmap" && <RoadmapView focusId={focusId} focus={focus} />}
        {tab === "architecture" && <ArchitectureView focusId={focusId} focus={focus} />}
        {tab === "capabilities" && <CapabilityView focusId={focusId} focus={focus} />}
        {tab === "evidence" && <EvidenceView focusId={focusId} focus={focus} />}
        {tab === "plans" && <PlansView focus={focus} />}
      </section>
      <Inspector focusId={focusId} setTab={setTab} />
    </main>
    <footer><span>Self Map is a read-only projection over repository/planning/evidence truth.</span><span>Representation ≠ authority.</span></footer>
  </div>;
}

createRoot(document.getElementById("root")).render(<ReactFlowProvider><App /></ReactFlowProvider>);
