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
  ["start", "Start here"],
  ["component", "System map"],
  ["sequence", "How it works"],
  ["state", "What happens next"],
  ["requirements", "Requirements"],
  ["evidence", "Evidence"],
  ["review", "Review"]
];

const sourceMap = Object.fromEntries(baseModel.sources.map((item) => [item.id, item]));
const requirementMap = Object.fromEntries(baseModel.requirements.map((item) => [item.id, item]));
const evidenceMap = Object.fromEntries(baseModel.evidence.map((item) => [item.id, item]));

const COMPONENT_LABELS = {
  domain: {
    title: "Source of truth",
    summary: "The system that owns the real meaning and current state of the work.",
    technical: "Domain / workflow truth",
    category: "source"
  },
  viewspec: {
    title: "One focused view",
    summary: "A focused way to answer one question about the software.",
    technical: "ViewSpec",
    category: "view"
  },
  surfacespec: {
    title: "Combined working view",
    summary: "A workspace that brings several focused views, sources, and actions together.",
    technical: "SurfaceSpec",
    category: "workspace"
  },
  product: {
    title: "The app people use",
    summary: "The actual interface where people inspect information or perform allowed actions.",
    technical: "Product-owned application",
    category: "application"
  },
  evidence: {
    title: "Checks and evidence",
    summary: "Tests and execution results that support technical claims.",
    technical: "Evidence / CI",
    category: "evidence"
  },
  human: {
    title: "Person reviewing or operating",
    summary: "The person using the software, inspecting the change, or making a human-owned decision.",
    technical: "Human reviewer",
    category: "person"
  }
};

const COMPONENT_EDGE_LABELS = {
  "domain-view": "defines what is true here",
  "view-surface": "joins this view into the workspace",
  "surface-product": "guides what the app shows",
  "product-human": "shows information / takes input",
  "evidence-surface": "supports the claims",
  "human-product": "acts through the app"
};

const COMPONENT_EDGE_MEANING = {
  "domain-view": "The source system decides which facts belong in this focused view. The diagram does not decide what is true.",
  "view-surface": "A focused view becomes one part of a larger workspace so the same software change can be understood from more than one angle.",
  "surface-product": "The working-view contract tells the product which views, sources, focus, and action boundaries need to appear together.",
  "product-human": "The product turns those contracts into something a person can inspect or use.",
  "evidence-surface": "Tests and execution records support claims shown in the workspace.",
  "human-product": "A person can act through the product only when the product provides the required authority and behavior."
};

const COMPONENT_WHY = {
  domain: "Keeping the source of truth separate prevents a visual tool from quietly inventing software state.",
  viewspec: "Different questions need different views. One view can focus on architecture, another on evidence, another on state.",
  surfacespec: "This is the new capability introduced by PR #22: several views can now work together as one review or engineering workspace.",
  product: "The product remains responsible for real UI behavior, persistence, authorization, and effects.",
  evidence: "A claim is stronger when you can reopen the exact check or execution record that supports it.",
  human: "Automated checks can support a decision, but they do not replace human-owned review or product judgment."
};

const STATE_LABELS = {
  planned: { title: "Planned", technical: "Planned" },
  implemented: { title: "Built", technical: "Implemented" },
  verified: { title: "Automated checks passed", technical: "Machine verified" },
  merged: { title: "Integrated and reviewable", technical: "Merged / built" },
  "human-review": { title: "Human review", technical: "Human review" },
  accepted: { title: "Accepted", technical: "Accepted" },
  changes: { title: "Changes requested", technical: "Changes requested" }
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

const STATE_EDGE_MEANING = {
  "st-1": "The planned change has been implemented in a concrete revision.",
  "st-2": "The configured automated checks ran and passed for that revision.",
  "st-3": "The verified change was integrated so it can be reviewed as part of the product/repository state.",
  "st-4": "A reviewable representation of the exact change is presented to a person.",
  "st-5": "A person decides the human-owned review criterion is satisfied.",
  "st-6": "A person identifies a concrete change needed before acceptance.",
  "st-7": "A new revision returns the work to implementation and must be reviewed as a changed subject."
};

const PARTICIPANT_LABELS = {
  repo: "Source repository",
  model: "Review data",
  renderer: "Review workbench",
  ci: "Automated checks",
  reviewer: "Human reviewer"
};

const SEQUENCE_LABELS = {
  "seq-1": "use the exact merged change",
  "seq-2": "provide the change, requirements, evidence, and sources",
  "seq-3": "build the workbench",
  "seq-4": "produce a self-contained review file",
  "seq-5": "publish the tested artifact",
  "seq-6": "explore the change",
  "seq-7": "show explanation, source, and limits"
};

const STATUS_LABELS = {
  implemented: "Built",
  verified: "Automated checks passed",
  merged: "Merged",
  "human-review": "Needs your review"
};

const REQUIREMENT_STATE = {
  covered: "Supported",
  "needs-human-review": "Needs human review",
  partial: "Partial"
};

function cloneNodes(nodes) {
  return nodes.map((node) => ({ ...node, position: { ...node.position }, data: { ...node.data } }));
}

function componentGraph() {
  const nodes = architecture.component.nodes.map((node) => {
    const plain = COMPONENT_LABELS[node.id] ?? { title: node.title, summary: node.summary, technical: node.title, category: node.stereotype };
    return {
      id: node.id,
      type: "semantic",
      position: { x: node.x, y: node.y },
      data: {
        title: plain.title,
        summary: plain.summary,
        technicalTitle: plain.technical,
        owner: node.owner,
        tag: plain.category,
        semanticKind: "component-node"
      }
    };
  });
  const edges = architecture.component.edges.map((edge) => ({
    id: edge.id,
    source: edge.from,
    target: edge.to,
    label: COMPONENT_EDGE_LABELS[edge.id] ?? edge.label,
    type: "smoothstep",
    interactionWidth: 32,
    markerEnd: { type: MarkerType.ArrowClosed },
    style: {
      strokeWidth: 2,
      strokeDasharray: edge.style === "dashed" ? "7 6" : undefined
    },
    data: { semanticKind: "component-edge", formalLabel: edge.label }
  }));
  return { nodes, edges };
}

function stateGraph() {
  const nodes = architecture.state.states.map((state) => ({
    id: state.id,
    type: "semantic",
    position: { x: state.x, y: state.y },
    data: {
      title: STATE_LABELS[state.id]?.title ?? state.label,
      summary: state.summary,
      technicalTitle: STATE_LABELS[state.id]?.technical ?? state.label,
      owner: state.kind === "human-gate" || state.kind === "final" ? "Human-owned step" : "Software lifecycle",
      tag: state.kind === "human-gate" ? "person decides" : state.kind === "machine" ? "automated" : "state",
      semanticKind: "state-node"
    }
  }));
  const edges = architecture.state.transitions.map((transition) => ({
    id: transition.id,
    source: transition.from,
    target: transition.to,
    label: STATE_EDGE_LABELS[transition.id] ?? transition.label,
    type: "smoothstep",
    interactionWidth: 32,
    markerEnd: { type: MarkerType.ArrowClosed },
    style: { strokeWidth: 2 },
    data: { semanticKind: "state-edge", formalLabel: transition.label, authority: transition.authority }
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

function GraphCanvasInner({ lens, title, question, nodes, setNodes, edges, setEdges, initialNodes, selection, onSelect, onClear }) {
  const { fitView } = useReactFlow();
  const [positionsChanged, setPositionsChanged] = useState(false);
  const emphasized = useMemo(() => emphasizeConnections(nodes, edges, selection, lens), [nodes, edges, selection, lens]);

  const resetPositions = useCallback(() => {
    setNodes(cloneNodes(initialNodes));
    setPositionsChanged(false);
    requestAnimationFrame(() => fitView({ padding: 0.18, duration: 250 }));
  }, [initialNodes, setNodes, fitView]);

  return (
    <section className="graph-lens">
      <header className="lens-heading">
        <div><span className="eyebrow">Explore the software</span><h2>{title}</h2></div>
        <p>{question}</p>
      </header>
      <p className="interaction-instruction"><strong>Drag boxes to rearrange.</strong> Click a box or line to understand it. Selecting something automatically highlights its direct connections.</p>
      <div className="flow-shell">
        <ReactFlow
          nodes={emphasized.nodes}
          edges={emphasized.edges}
          nodeTypes={nodeTypes}
          onNodesChange={(changes) => setNodes((current) => applyNodeChanges(changes, current))}
          onEdgesChange={(changes) => setEdges((current) => applyEdgeChanges(changes, current))}
          onNodeClick={(_, node) => onSelect({ lens, type: "node", id: node.id })}
          onEdgeClick={(_, edge) => onSelect({ lens, type: "edge", id: edge.id })}
          onNodeDragStop={() => setPositionsChanged(true)}
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
            <button type="button" onClick={resetPositions} disabled={!positionsChanged}>Reset positions</button>
            {selection?.lens === lens && <button type="button" onClick={onClear}>Show all</button>}
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
        <div><span className="eyebrow">Follow the interaction</span><h2>How does this change move from source to human review?</h2></div>
        <p>Read from top to bottom. Click a person/system or an arrow to see what that step means and where it came from.</p>
      </header>
      <div className="sequence-scroll">
        <svg className="sequence-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="How the reviewed change moves from repository to human review">
          <defs><marker id="sequence-arrow-v12" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" /></marker></defs>
          {participants.map((participant) => {
            const x = xs[participant.id];
            const selected = selection?.lens === "sequence" && selection?.type === "participant" && selection.id === participant.id;
            return <g key={participant.id} role="button" tabIndex="0" className={`sequence-participant ${selected ? "is-selected" : ""}`} onClick={() => onSelect({ lens: "sequence", type: "participant", id: participant.id })} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onSelect({ lens: "sequence", type: "participant", id: participant.id }); }}>
              <rect x={x - 72} y="22" width="144" height="58" rx="10" />
              <text x={x} y="48" textAnchor="middle">{PARTICIPANT_LABELS[participant.id] ?? participant.label}</text>
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
            const label = SEQUENCE_LABELS[message.id] ?? message.label;
            const labelWidth = Math.min(330, Math.max(165, label.length * 6.2));
            return <g key={message.id} role="button" tabIndex="0" className={`sequence-message ${selected ? "is-selected" : ""}`} onClick={() => onSelect({ lens: "sequence", type: "message", id: message.id })} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onSelect({ lens: "sequence", type: "message", id: message.id }); }}>
              <line className="message-hit" x1={x1} y1={y} x2={x2} y2={y} />
              <line className="message-line" x1={x1} y1={y} x2={x2} y2={y} markerEnd="url(#sequence-arrow-v12)" />
              <rect className="message-label-bg" x={mid - labelWidth / 2} y={y - 28} width={labelWidth} height="22" rx="8" />
              <text className="message-label" x={mid} y={y - 13} textAnchor="middle">{label}</text>
            </g>;
          })}
        </svg>
      </div>
    </section>
  );
}

function StartHere({ setTab, onSelect }) {
  return (
    <section className="start-here">
      <div className="start-hero">
        <span className="eyebrow">What changed?</span>
        <h2>This change lets several views of the same software work together in one workspace.</h2>
        <p>Before PR #22, Representation Router could describe individual views. Now it can coordinate architecture, requirements, evidence, review state, and exact source links without becoming the source of truth itself.</p>
      </div>
      <div className="why-card">
        <span className="eyebrow">Why this matters</span>
        <h3>You should be able to understand and review a software change without starting in raw code.</h3>
        <p>The technical detail is still here when you need it. The first step is understanding the work: what changed, how the pieces fit, what proves it, and what still needs a person.</p>
      </div>
      <div className="task-grid" aria-label="Choose what you want to understand">
        <button type="button" onClick={() => setTab("component")}><span>1</span><strong>See the parts</strong><p>Explore the system map, move boxes, and click the lines between them.</p></button>
        <button type="button" onClick={() => setTab("sequence")}><span>2</span><strong>Follow how it works</strong><p>See the handoffs from repository data through automated checks to human review.</p></button>
        <button type="button" onClick={() => setTab("state")}><span>3</span><strong>See what happens next</strong><p>Follow the lifecycle from plan to build, automated checks, review, and acceptance.</p></button>
        <button type="button" onClick={() => setTab("requirements")}><span>4</span><strong>Check what supports the change</strong><p>Trace what needed to be true to the implementation and evidence that support it.</p></button>
      </div>
      <div className="start-columns">
        <section>
          <span className="eyebrow">What you can do here</span>
          <ul>
            <li>Drag boxes to create a layout that makes sense to you.</li>
            <li>Click boxes and arrows to understand what they mean.</li>
            <li>Jump from architecture to the requirements and evidence behind it.</li>
            <li>Open exact source links when you want the technical details.</li>
          </ul>
        </section>
        <section className="human-question">
          <span className="eyebrow">What still needs a person</span>
          <h3>{baseModel.reviewQuestion}</h3>
          <button type="button" onClick={() => setTab("review")}>Go to review</button>
        </section>
      </div>
      <details className="technical-details intro-details">
        <summary>Technical details: what do the internal terms mean?</summary>
        <dl>
          <div><dt>ViewSpec</dt><dd>One focused view that answers one concern, such as architecture, state, or evidence.</dd></div>
          <div><dt>SurfaceSpec</dt><dd>The contract that coordinates several focused views into one working interface.</dd></div>
          <div><dt>Semantic identity</dt><dd>A stable identity for the same real subject as you move between different views.</dd></div>
          <div><dt>Provenance</dt><dd>The exact source, evidence, and revision behind a visible claim.</dd></div>
        </dl>
        <p><strong>Design rule:</strong> you should not need these terms to begin. They become useful when you want to reason more precisely or inspect the implementation.</p>
      </details>
      <details className="technical-details">
        <summary>Exact change record</summary>
        <p>{baseModel.outcome}</p>
        <button type="button" className="text-button" onClick={() => onSelect({ lens: "start", type: "concept", id: "contract" })}>Inspect the underlying contract change</button>
      </details>
    </section>
  );
}

function Requirements({ focusId, onSelect }) {
  return (
    <section>
      <header className="lens-heading"><div><span className="eyebrow">What needs to be true?</span><h2>Requirements</h2></div><p>Each row connects a need to where it is implemented and what supports the claim.</p></header>
      <div className="table-wrap"><table><thead><tr><th>Need</th><th>Question</th><th>Status</th><th>Where it is implemented</th><th>What supports it</th></tr></thead><tbody>
        {baseModel.requirements.map((item) => <tr key={item.id} className={focusId === item.id ? "is-focused" : ""}>
          <td><button type="button" className="text-button" onClick={() => onSelect({ lens: "requirements", type: "requirement", id: item.id })}><strong>{item.id}</strong> {item.title}</button></td>
          <td>{item.question}</td><td><span className={`badge state-${item.state}`}>{REQUIREMENT_STATE[item.state] ?? item.state}</span></td>
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
      <header className="lens-heading"><div><span className="eyebrow">What do we know?</span><h2>Evidence</h2></div><p>Every claim stays next to the limit of what that evidence can actually show.</p></header>
      <div className="evidence-grid">
        {baseModel.evidence.map((item) => <article key={item.id} className={focusId === item.id ? "is-focused" : ""}>
          <button type="button" className="evidence-title" onClick={() => onSelect({ lens: "evidence", type: "evidence", id: item.id })}><span className={`badge state-${item.state}`}>{item.state}</span><strong>{item.title}</strong></button>
          <div><section><h3>What this shows</h3><ul>{item.proves.map((value) => <li key={value}>{value}</li>)}</ul></section><section><h3>What this does not show</h3><ul>{item.doesNotProve.map((value) => <li key={value}>{value}</li>)}</ul></section></div>
        </article>)}
      </div>
    </section>
  );
}

function Review() {
  return (
    <section>
      <header className="lens-heading"><div><span className="eyebrow">Human checkpoint</span><h2>What still needs your judgment?</h2></div><p>Automated checks can support this review, but they cannot answer whether the representation is actually understandable and useful.</p></header>
      <div className="review-grid">
        <section className="review-card">
          <h3>Technical delivery</h3>
          <div className="review-list">{baseModel.review.items.map((item, index) => <div key={`${item.label}-${index}`}><span className={`check state-${item.state}`}>{item.state === "needs-review" ? "?" : "✓"}</span><span>{item.label}</span><small>{item.state === "needs-review" ? "Needs human review" : "Complete"}</small></div>)}</div>
        </section>
        <section className="review-question">
          <span className="eyebrow">Your review question</span>
          <h3>{baseModel.reviewQuestion}</h3>
          <p>This is evidence that automated tests cannot produce.</p>
        </section>
        <section className="review-card">
          <h3>What this workbench is not claiming</h3>
          <ul>{baseModel.review.nonclaims.map((item) => <li key={item}>{item}</li>)}</ul>
        </section>
      </div>
    </section>
  );
}

function SourceList({ sourceIds = [] }) {
  const sources = sourceIds.map((id) => sourceMap[id]).filter(Boolean);
  if (!sources.length) return <p className="muted">No separate source link is attached to this item.</p>;
  return <ul className="source-list">{sources.map((source) => <li key={source.id}><a href={source.url} target="_blank" rel="noreferrer">{source.label} ↗</a><small>{source.role} · {source.revision}</small></li>)}</ul>;
}

function RelatedButtons({ requirementIds = [], evidenceIds = [], onOpenRelated }) {
  if (!requirementIds.length && !evidenceIds.length) return null;
  return (
    <section>
      <h4>See related</h4>
      <div className="related-buttons">
        {requirementIds.map((id) => requirementMap[id] && <button type="button" key={id} onClick={() => onOpenRelated("requirements", id)}>Requirement {id}: {requirementMap[id].title}</button>)}
        {evidenceIds.map((id) => evidenceMap[id] && <button type="button" key={id} onClick={() => onOpenRelated("evidence", id)}>Evidence: {evidenceMap[id].title}</button>)}
      </div>
    </section>
  );
}

function ComponentInspector({ selection, onSelect, onOpenRelated }) {
  if (selection.type === "node") {
    const node = architecture.component.nodes.find((item) => item.id === selection.id);
    if (!node) return null;
    const plain = COMPONENT_LABELS[node.id] ?? { title: node.title, technical: node.title, summary: node.summary };
    const meta = interactions.component.nodes[node.id] ?? {};
    const connections = architecture.component.edges.filter((edge) => edge.from === node.id || edge.to === node.id);
    return <>
      <span className="eyebrow">Selected part</span><h2>{plain.title}</h2>
      <section><h4>What this is</h4><p>{plain.summary}</p></section>
      <section><h4>Why it matters</h4><p>{COMPONENT_WHY[node.id] ?? node.summary}</p></section>
      <section><h4>Connections</h4><div className="connection-list">{connections.map((edge) => {
        const otherId = edge.from === node.id ? edge.to : edge.from;
        return <button type="button" key={edge.id} onClick={() => onSelect({ lens: "component", type: "edge", id: edge.id })}><strong>{COMPONENT_EDGE_LABELS[edge.id] ?? edge.label}</strong><small>{COMPONENT_LABELS[otherId]?.title ?? otherId}</small></button>;
      })}</div></section>
      <RelatedButtons requirementIds={meta.requirementIds} evidenceIds={meta.evidenceIds} onOpenRelated={onOpenRelated} />
      <section><h4>Source</h4><SourceList sourceIds={node.sourceIds} /></section>
      <details className="technical-details"><summary>Technical details</summary><dl><div><dt>Exact name</dt><dd>{node.title}</dd></div><div><dt>Stable ID</dt><dd><code>{node.id}</code></dd></div><div><dt>Formal type</dt><dd>{node.stereotype}</dd></div><div><dt>Owner</dt><dd>{node.owner}</dd></div></dl></details>
    </>;
  }
  const edge = architecture.component.edges.find((item) => item.id === selection.id);
  if (!edge) return null;
  const meta = interactions.component.edges[edge.id] ?? {};
  return <>
    <span className="eyebrow">Selected relationship</span><h2>{COMPONENT_EDGE_LABELS[edge.id] ?? edge.label}</h2>
    <section><h4>Connects</h4><p><strong>{COMPONENT_LABELS[edge.from]?.title ?? edge.from}</strong> → <strong>{COMPONENT_LABELS[edge.to]?.title ?? edge.to}</strong></p></section>
    <section><h4>What this relationship means</h4><p>{COMPONENT_EDGE_MEANING[edge.id] ?? meta.meaning}</p></section>
    <section><h4>What this does not mean</h4><p>{meta.nonclaim}</p></section>
    <RelatedButtons requirementIds={meta.requirementIds} evidenceIds={meta.evidenceIds} onOpenRelated={onOpenRelated} />
    <section><h4>Source</h4><SourceList sourceIds={meta.sourceIds} /></section>
    <details className="technical-details"><summary>Technical details</summary><dl><div><dt>Formal relationship</dt><dd>{edge.label}</dd></div><div><dt>Relationship ID</dt><dd><code>{edge.id}</code></dd></div><div><dt>Exact source</dt><dd>{architecture.component.nodes.find((item) => item.id === edge.from)?.title}</dd></div><div><dt>Exact target</dt><dd>{architecture.component.nodes.find((item) => item.id === edge.to)?.title}</dd></div><div><dt>Full semantic explanation</dt><dd>{meta.meaning}</dd></div></dl></details>
  </>;
}

function StateInspector({ selection, onOpenRelated }) {
  if (selection.type === "node") {
    const state = architecture.state.states.find((item) => item.id === selection.id);
    if (!state) return null;
    const meta = interactions.state.states[state.id] ?? {};
    return <>
      <span className="eyebrow">Selected step</span><h2>{STATE_LABELS[state.id]?.title ?? state.label}</h2>
      <section><h4>What this is</h4><p>{state.summary}</p></section>
      <RelatedButtons requirementIds={meta.requirementIds} evidenceIds={meta.evidenceIds} onOpenRelated={onOpenRelated} />
      <section><h4>Source</h4><SourceList sourceIds={state.sourceIds} /></section>
      <details className="technical-details"><summary>Technical details</summary><dl><div><dt>Exact state name</dt><dd>{state.label}</dd></div><div><dt>State ID</dt><dd><code>{state.id}</code></dd></div><div><dt>State type</dt><dd>{state.kind}</dd></div></dl></details>
    </>;
  }
  const transition = architecture.state.transitions.find((item) => item.id === selection.id);
  if (!transition) return null;
  const meta = interactions.state.transitions[transition.id] ?? {};
  return <>
    <span className="eyebrow">Selected transition</span><h2>{STATE_EDGE_LABELS[transition.id] ?? transition.label}</h2>
    <section><h4>Connects</h4><p><strong>{STATE_LABELS[transition.from]?.title ?? transition.from}</strong> → <strong>{STATE_LABELS[transition.to]?.title ?? transition.to}</strong></p></section>
    <section><h4>What this relationship means</h4><p>{STATE_EDGE_MEANING[transition.id] ?? meta.meaning}</p></section>
    <section><h4>What this does not mean</h4><p>{meta.nonclaim}</p></section>
    <RelatedButtons requirementIds={meta.requirementIds} evidenceIds={meta.evidenceIds} onOpenRelated={onOpenRelated} />
    <section><h4>Source</h4><SourceList sourceIds={meta.sourceIds} /></section>
    <details className="technical-details"><summary>Technical details</summary><dl><div><dt>Formal transition</dt><dd>{transition.label}</dd></div><div><dt>Transition ID</dt><dd><code>{transition.id}</code></dd></div><div><dt>Transition authority</dt><dd>{transition.authority}</dd></div><div><dt>Full semantic explanation</dt><dd>{meta.meaning}</dd></div></dl></details>
  </>;
}

function SequenceInspector({ selection, onOpenRelated }) {
  if (selection.type === "participant") {
    const participant = architecture.sequence.participants.find((item) => item.id === selection.id);
    if (!participant) return null;
    return <>
      <span className="eyebrow">Selected participant</span><h2>{PARTICIPANT_LABELS[participant.id] ?? participant.label}</h2>
      <section><h4>What this is</h4><p>This is one participant in the path from source material to a human-reviewable representation.</p></section>
      <section><h4>Source</h4><SourceList sourceIds={participant.sourceIds} /></section>
      <details className="technical-details"><summary>Technical details</summary><dl><div><dt>Exact name</dt><dd>{participant.label}</dd></div><div><dt>Participant ID</dt><dd><code>{participant.id}</code></dd></div><div><dt>Type</dt><dd>{participant.kind}</dd></div></dl></details>
    </>;
  }
  const message = architecture.sequence.messages.find((item) => item.id === selection.id);
  if (!message) return null;
  const meta = interactions.sequence.messages[message.id] ?? {};
  return <>
    <span className="eyebrow">Selected handoff</span><h2>{SEQUENCE_LABELS[message.id] ?? message.label}</h2>
    <section><h4>Connects</h4><p><strong>{PARTICIPANT_LABELS[message.from] ?? message.from}</strong> → <strong>{PARTICIPANT_LABELS[message.to] ?? message.to}</strong></p></section>
    <section><h4>What happens here</h4><p>{message.note}</p></section>
    <RelatedButtons requirementIds={meta.requirementIds} evidenceIds={meta.evidenceIds} onOpenRelated={onOpenRelated} />
    <section><h4>Source</h4><SourceList sourceIds={message.sourceIds} /></section>
    <details className="technical-details"><summary>Technical details</summary><dl><div><dt>Formal message</dt><dd>{message.label}</dd></div><div><dt>Message ID</dt><dd><code>{message.id}</code></dd></div></dl></details>
  </>;
}

function GenericInspector({ selection }) {
  if (selection.lens === "start") {
    const item = baseModel.concepts.find((concept) => concept.id === selection.id);
    if (!item) return null;
    return <><span className="eyebrow">Change detail</span><h2>{item.title}</h2><section><h4>What this is</h4><p>{item.summary}</p></section><section><h4>Why it matters</h4><p>{item.detail}</p></section><section><h4>Source</h4><SourceList sourceIds={item.sourceIds} /></section></>;
  }
  if (selection.lens === "requirements") {
    const item = requirementMap[selection.id];
    if (!item) return null;
    return <><span className="eyebrow">Requirement</span><h2>{item.title}</h2><section><h4>What needs to be true</h4><p>{item.question}</p></section><section><h4>Where it is implemented</h4>{item.implementation.map((value) => <code className="block-code" key={value}>{value}</code>)}</section><section><h4>What supports it</h4>{item.evidence.map((value) => <p key={value}>{value}</p>)}</section><section><h4>Source</h4><SourceList sourceIds={item.sourceIds} /></section><details className="technical-details"><summary>Technical details</summary><dl><div><dt>Requirement ID</dt><dd><code>{item.id}</code></dd></div><div><dt>Recorded state</dt><dd>{item.state}</dd></div></dl></details></>;
  }
  if (selection.lens === "evidence") {
    const item = evidenceMap[selection.id];
    if (!item) return null;
    return <><span className="eyebrow">Evidence</span><h2>{item.title}</h2><section><h4>What this shows</h4><ul>{item.proves.map((value) => <li key={value}>{value}</li>)}</ul></section><section><h4>What this does not show</h4><ul>{item.doesNotProve.map((value) => <li key={value}>{value}</li>)}</ul></section><section><h4>Source</h4><SourceList sourceIds={item.sourceIds} /></section><details className="technical-details"><summary>Technical details</summary><dl><div><dt>Evidence ID</dt><dd><code>{item.id}</code></dd></div><div><dt>Recorded state</dt><dd>{item.state}</dd></div></dl></details></>;
  }
  return null;
}

function Inspector({ selection, onSelect, onOpenRelated }) {
  let content = null;
  if (selection?.lens === "component") content = <ComponentInspector selection={selection} onSelect={onSelect} onOpenRelated={onOpenRelated} />;
  else if (selection?.lens === "state") content = <StateInspector selection={selection} onOpenRelated={onOpenRelated} />;
  else if (selection?.lens === "sequence") content = <SequenceInspector selection={selection} onOpenRelated={onOpenRelated} />;
  else if (selection) content = <GenericInspector selection={selection} />;

  return <aside className={`inspector ${content ? "" : "is-empty"}`}>
    {content ?? <><span className="eyebrow">Details</span><h2>Select something to understand it</h2><p>Click a box, line, state, sequence arrow, requirement, or evidence card. The exact source and technical details stay available without being the first thing you have to learn.</p></>}
  </aside>;
}

function App() {
  const componentInitial = useMemo(() => componentGraph(), []);
  const stateInitial = useMemo(() => stateGraph(), []);
  const [componentNodes, setComponentNodes] = useState(() => cloneNodes(componentInitial.nodes));
  const [componentEdges, setComponentEdges] = useState(() => componentInitial.edges.map((edge) => ({ ...edge, data: { ...edge.data } })));
  const [stateNodes, setStateNodes] = useState(() => cloneNodes(stateInitial.nodes));
  const [stateEdges, setStateEdges] = useState(() => stateInitial.edges.map((edge) => ({ ...edge, data: { ...edge.data } })));
  const [tab, setTab] = useState("start");
  const [selection, setSelection] = useState(null);
  const [focus, setFocus] = useState(null);

  const openRelated = useCallback((nextTab, id) => {
    setFocus({ tab: nextTab, id });
    setTab(nextTab);
  }, []);

  return <main className="app-shell">
    <header className="topbar">
      <div className="title-row">
        <div><span className="eyebrow">Representation Router · change review</span><h1>Understand the change before diving into the code</h1><p>This workbench connects architecture, lifecycle, requirements, evidence, and exact sources for PR #22.</p></div>
        <details className="subject-details"><summary>Exact review subject</summary><code>{baseModel.subject.mergeRevision}</code><span>{baseModel.subject.label}</span></details>
      </div>
      <div className="status-strip">{baseModel.status.map((item) => <button type="button" key={item.id} onClick={() => setSelection({ lens: "start", type: "status", id: item.id })}><span className={`status-dot state-${item.state}`} /><span><strong>{STATUS_LABELS[item.id] ?? item.label}</strong><small>{item.state === "needs-review" ? "Still needs a person" : "Complete"}</small></span></button>)}</div>
      <div className="review-callout"><span className="eyebrow">Current human checkpoint</span><strong>{baseModel.reviewQuestion}</strong></div>
    </header>

    <nav className="tabs" aria-label="Ways to inspect this change">{TABS.map(([id, label]) => <button type="button" key={id} aria-selected={tab === id} onClick={() => setTab(id)}>{label}</button>)}</nav>

    <div className="workspace-grid">
      <section className="main-panel">
        {tab === "start" && <StartHere setTab={setTab} onSelect={setSelection} />}
        {tab === "component" && <GraphCanvas lens="component" title="How do the main parts fit together?" question="This map separates the source of truth, focused views, the combined workspace, the product interface, evidence, and the person using it." nodes={componentNodes} setNodes={setComponentNodes} edges={componentEdges} setEdges={setComponentEdges} initialNodes={componentInitial.nodes} selection={selection} onSelect={setSelection} onClear={() => setSelection(null)} />}
        {tab === "sequence" && <SequenceDiagram selection={selection} onSelect={setSelection} />}
        {tab === "state" && <GraphCanvas lens="state" title="What has to happen before this change is accepted?" question="Automated checks, integration, and human review are separate steps. Passing tests does not skip the human decision." nodes={stateNodes} setNodes={setStateNodes} edges={stateEdges} setEdges={setStateEdges} initialNodes={stateInitial.nodes} selection={selection} onSelect={setSelection} onClear={() => setSelection(null)} />}
        {tab === "requirements" && <Requirements focusId={focus?.tab === "requirements" ? focus.id : null} onSelect={setSelection} />}
        {tab === "evidence" && <Evidence focusId={focus?.tab === "evidence" ? focus.id : null} onSelect={setSelection} />}
        {tab === "review" && <Review />}
      </section>
      <Inspector selection={selection} onSelect={setSelection} onOpenRelated={openRelated} />
    </div>

    <footer><span>Task-first language · progressive technical detail · exact sources remain available</span><span>Layout changes stay local to this review view.</span></footer>
  </main>;
}

createRoot(document.getElementById("root")).render(<App />);
