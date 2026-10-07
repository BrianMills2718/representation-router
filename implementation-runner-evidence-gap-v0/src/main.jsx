import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import candidateSpec from "../generated/candidate-spec.json";
import reviewModel from "../../review-workbench/pr22.model.json";
import { buildEvidenceFocusItems, filterEvidenceFocusItems } from "../../src/evidence-gap-focus.mjs";

if (candidateSpec.runtimeId !== "evidence-gap-focus-runtime/v0") {
  throw new Error(`Unsupported runtime: ${candidateSpec.runtimeId}`);
}
if (candidateSpec.subjectRevision !== reviewModel.subject.mergeRevision) {
  throw new Error("Candidate subject revision does not match the review model");
}

const sourceMap = Object.fromEntries(reviewModel.sources.map((source) => [source.id, source]));

function StatusBadge({ item }) {
  const gap = item.classification.gap;
  return <span className={`badge ${gap ? "gap" : "executed"}`}>{item.classification.label}</span>;
}

function RequirementCard({ item, selected, collapsed, onSelect }) {
  return <button type="button" className={`item ${selected ? "is-selected" : ""} ${collapsed ? "is-collapsed" : ""}`} onClick={() => onSelect(item.id)}>
    <div className="item-head">
      <div><span className="eyebrow">{item.id}</span><h3>{item.title}</h3></div>
      <StatusBadge item={item} />
    </div>
    <p className="detail-copy">{item.question}</p>
    <div className="meta"><span>Source state: {item.sourceState}</span><span>{item.evidence.length} evidence reference{item.evidence.length === 1 ? "" : "s"}</span></div>
  </button>;
}

function FlatRow({ item, selected, onSelect }) {
  return <button type="button" className={`flat-row ${selected ? "is-selected" : ""}`} onClick={() => onSelect(item.id)}>
    <strong>{item.id}</strong>
    <span>{item.title}</span>
    <span className="flat-status"><StatusBadge item={item} /></span>
  </button>;
}

function SourceLinks({ sourceIds }) {
  const sources = sourceIds.map((id) => sourceMap[id]).filter(Boolean);
  if (!sources.length) return <p>No source links are attached to this requirement.</p>;
  return <ul>{sources.map((source) => <li key={source.id}><a href={source.url} target="_blank" rel="noreferrer">{source.label} ↗</a> <small>({source.role})</small></li>)}</ul>;
}

function Inspector({ item }) {
  if (!item) return <aside className="inspector"><span className="eyebrow">Details</span><h2>Select a requirement</h2><p>Choose an item to see why it is considered supported or still open.</p></aside>;
  return <aside className="inspector">
    <span className="eyebrow">{item.id} · review detail</span>
    <h2>{item.title}</h2>
    <StatusBadge item={item} />
    <section><h4>Why it is classified this way</h4><p>{item.classification.explanation}</p></section>
    <section><h4>What the requirement asks</h4><p>{item.question}</p></section>
    <section><h4>Evidence references</h4><ul>{item.evidence.map((value) => <li key={value}>{value}</li>)}</ul></section>
    <section><h4>Implementation references</h4><ul>{item.implementation.map((value) => <li key={value}><code>{value}</code></li>)}</ul></section>
    <section><h4>Exact sources</h4><SourceLinks sourceIds={item.sourceIds} /></section>
    <section><h4>What this does not mean</h4><p>Changing focus, grouping, or visual expansion does not change the requirement, evidence, CI result, or review/approval state.</p></section>
  </aside>;
}

function App() {
  const allItems = useMemo(() => buildEvidenceFocusItems(reviewModel), []);
  const [focus, setFocus] = useState(candidateSpec.decisions.defaultFocus);
  const [grouping, setGrouping] = useState(candidateSpec.decisions.grouping);
  const [coveredItems, setCoveredItems] = useState(candidateSpec.decisions.coveredItems);
  const initialVisible = filterEvidenceFocusItems(allItems, candidateSpec.decisions.defaultFocus);
  const [selectedId, setSelectedId] = useState(initialVisible[0]?.id ?? allItems[0]?.id ?? null);

  const visible = useMemo(() => filterEvidenceFocusItems(allItems, focus), [allItems, focus]);
  const selected = allItems.find((item) => item.id === selectedId) ?? visible[0] ?? allItems[0] ?? null;
  const gapCount = allItems.filter((item) => item.classification.gap).length;
  const executedCount = allItems.length - gapCount;

  return <main className="app">
    <header className="topbar">
      <div>
        <span className="eyebrow">Generated candidate · Evidence Gap Focus</span>
        <h1>Focus review attention where evidence is still open</h1>
        <p>{candidateSpec.outcome}</p>
      </div>
      <div className="subject"><strong>Exact review subject</strong><br /><code>{candidateSpec.subjectRevision}</code></div>
    </header>

    <nav className="controls" aria-label="Review focus controls">
      <div className="control-group"><span>Focus</span><button type="button" aria-pressed={focus === "gaps-first"} onClick={() => setFocus("gaps-first")}>Needs evidence</button><button type="button" aria-pressed={focus === "all-items"} onClick={() => setFocus("all-items")}>All requirements</button></div>
      <div className="control-group"><span>Organize</span><button type="button" aria-pressed={grouping === "by-requirement"} onClick={() => setGrouping("by-requirement")}>By requirement</button><button type="button" aria-pressed={grouping === "flat-list"} onClick={() => setGrouping("flat-list")}>Flat list</button></div>
      <div className="control-group"><span>Supported items</span><button type="button" aria-pressed={coveredItems === "collapse"} onClick={() => setCoveredItems("collapse")}>Compact</button><button type="button" aria-pressed={coveredItems === "show"} onClick={() => setCoveredItems("show")}>Expanded</button></div>
    </nav>

    <section className="workspace">
      <div className="summary">
        <article><span className="eyebrow">Requirements</span><strong>{allItems.length}</strong><small>exact source records</small></article>
        <article><span className="eyebrow">Needs attention</span><strong>{gapCount}</strong><small>evidence gap or human review still open</small></article>
        <article><span className="eyebrow">Executed evidence attached</span><strong>{executedCount}</strong><small>source model links execution evidence</small></article>
      </div>

      <section>
        {visible.length === 0 && <div className="empty">Nothing matches this focus.</div>}
        {visible.length > 0 && grouping === "by-requirement" && <div className="list">{visible.map((item) => <RequirementCard key={item.id} item={item} selected={selected?.id === item.id} collapsed={coveredItems === "collapse" && !item.classification.gap} onSelect={setSelectedId} />)}</div>}
        {visible.length > 0 && grouping === "flat-list" && <div className="flat-list">{visible.map((item) => <FlatRow key={item.id} item={item} selected={selected?.id === item.id} onSelect={setSelectedId} />)}</div>}
      </section>

      <Inspector item={selected} />

      <div className="notice"><strong>Read-only review surface</strong><p>This candidate can change presentation focus only. Requirement truth, evidence truth, CI results, and human approval remain owned by their source systems.</p></div>
    </section>

    <footer><span>Filtering ≠ changing requirement truth.</span><span>Green CI ≠ human acceptance.</span></footer>
  </main>;
}

createRoot(document.getElementById("root")).render(<App />);
