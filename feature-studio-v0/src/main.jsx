import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import {
  buildImplementationBrief,
  clearFeatureDraft,
  createSavedLayoutsDraft,
  deriveImplementationImpact,
  loadFeatureDraft,
  normalizeFeatureDraft,
  saveFeatureDraft
} from "../../src/feature-draft.mjs";

const BASELINE_REVISION = "5e2845c823a8bdf951ee293a940d666549d4009b";
const baselineDraft = createSavedLayoutsDraft({ baselineRevision: BASELINE_REVISION });
const STAGES = [
  ["outcome", "Outcome"],
  ["behavior", "Behavior"],
  ["design", "Design"],
  ["tests", "Tests"],
  ["impact", "Impact"],
  ["review", "Review changes"],
  ["handoff", "Handoff"]
];

function browserStorage() {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function cloneDraft(draft) {
  return JSON.parse(JSON.stringify(draft));
}

function scenarioId() {
  return `scenario-${Date.now().toString(36)}`;
}

function changedFields(draft) {
  const changes = [];
  if (draft.outcome !== baselineDraft.outcome) changes.push({ label: "Outcome", before: baselineDraft.outcome, after: draft.outcome });
  if (draft.successCriterion !== baselineDraft.successCriterion) changes.push({ label: "Success criterion", before: baselineDraft.successCriterion, after: draft.successCriterion });
  for (const key of ["rememberMode", "saveReceipt", "resetMode"]) {
    if (draft.decisions[key] !== baselineDraft.decisions[key]) changes.push({ label: key, before: baselineDraft.decisions[key], after: draft.decisions[key] });
  }
  if (JSON.stringify(draft.acceptanceScenarios) !== JSON.stringify(baselineDraft.acceptanceScenarios)) {
    changes.push({ label: "Acceptance scenarios", before: `${baselineDraft.acceptanceScenarios.length} baseline scenarios`, after: `${draft.acceptanceScenarios.length} current scenarios` });
  }
  return changes;
}

function downloadJson(filename, value) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function DecisionCard({ checked, name, value, title, description, onChange }) {
  return <label className={`decision-card ${checked ? "is-selected" : ""}`}>
    <input type="radio" name={name} value={value} checked={checked} onChange={() => onChange(value)} />
    <span><strong>{title}</strong><small>{description}</small></span>
  </label>;
}

function OutcomeStage({ draft, update }) {
  return <section className="stage-body">
    <header><span className="eyebrow">1 · Define the result</span><h2>What should be different for the person using the software?</h2><p>Write the outcome in ordinary language. Technical implementation choices come later.</p></header>
    <label className="field"><span>Feature outcome</span><textarea value={draft.outcome} onChange={(event) => update("outcome", event.target.value)} rows="5" /></label>
    <label className="field"><span>How will we know it worked?</span><textarea value={draft.successCriterion} onChange={(event) => update("successCriterion", event.target.value)} rows="4" /></label>
    <aside className="coach-note"><strong>Engineering skill being practiced</strong><p>Separate the user-visible outcome from the implementation. A strong requirement says what must become true without prematurely prescribing code.</p></aside>
  </section>;
}

function BehaviorStage({ draft, setDecision }) {
  return <section className="stage-body">
    <header><span className="eyebrow">2 · Choose behavior</span><h2>When should the software remember the arrangement?</h2><p>These choices change real interaction behavior and therefore change implementation work.</p></header>
    <div className="decision-group">
      <h3>Remembering the layout</h3>
      <DecisionCard name="rememberMode" value="automatic-after-drag" checked={draft.decisions.rememberMode === "automatic-after-drag"} onChange={(value) => setDecision("rememberMode", value)} title="Remember automatically after I move a box" description="Fastest interaction. Moving a box immediately updates the local saved layout." />
      <DecisionCard name="rememberMode" value="explicit-save" checked={draft.decisions.rememberMode === "explicit-save"} onChange={(value) => setDecision("rememberMode", value)} title="Only remember when I choose Save arrangement" description="Adds an explicit save action and avoids changing saved state after every drag." />
    </div>
    <div className="decision-group">
      <h3>Feedback after saving</h3>
      <DecisionCard name="saveReceipt" value="visible-after-save" checked={draft.decisions.saveReceipt === "visible-after-save"} onChange={(value) => setDecision("saveReceipt", value)} title="Tell me when the arrangement was saved" description="Shows a visible receipt after persistence succeeds." />
      <DecisionCard name="saveReceipt" value="quiet" checked={draft.decisions.saveReceipt === "quiet"} onChange={(value) => setDecision("saveReceipt", value)} title="Save quietly" description="Successful saving stays unobtrusive; failures still have to be visible." />
    </div>
    <div className="decision-group">
      <h3>Reset behavior</h3>
      <DecisionCard name="resetMode" value="immediate-reset" checked={draft.decisions.resetMode === "immediate-reset"} onChange={(value) => setDecision("resetMode", value)} title="Reset immediately" description="Reset positions clears the local saved layout right away." />
      <DecisionCard name="resetMode" value="confirm-before-reset" checked={draft.decisions.resetMode === "confirm-before-reset"} onChange={(value) => setDecision("resetMode", value)} title="Ask before clearing my layout" description="Adds a confirmation step before deleting the local saved arrangement." />
    </div>
  </section>;
}

function DesignStage({ draft }) {
  const fixed = [
    ["Where it is remembered", "This browser only", "Feature Studio v0 does not add accounts, a backend, or cloud sync."],
    ["What gets saved", "Box ID + x/y position only", "Relationships, requirements, evidence, and permissions stay outside the saved record."],
    ["What happens after the software changes", "Use the default layout for the new revision", "A layout from another exact revision is not silently reused."],
    ["If saving is blocked", "Keep the diagram usable", "The product says positions will not be remembered instead of blocking the graph."]
  ];
  return <section className="stage-body">
    <header><span className="eyebrow">3 · Protect the architecture boundary</span><h2>What is presentation memory, and what remains software truth?</h2><p>Some constraints are fixed in this checkpoint because changing them would expand authority or require a different architecture.</p></header>
    <div className="boundary-diagram" aria-label="Presentation state stays separate from software truth">
      <article><span>Software truth</span><strong>Nodes, relationships, requirements, evidence</strong><small>Owned by source systems</small></article>
      <div className="boundary-arrow">not changed by →</div>
      <article className="local"><span>Local presentation state</span><strong>Box positions</strong><small>Owned by this browser profile</small></article>
    </div>
    <div className="constraint-grid">{fixed.map(([label, value, detail]) => <article key={label}><span>{label}</span><strong>{value}</strong><p>{detail}</p></article>)}</div>
    <details className="technical-details"><summary>Exact technical contract</summary><pre>{JSON.stringify({
      storageScope: draft.decisions.storageScope,
      revisionPolicy: draft.decisions.revisionPolicy,
      recordContents: draft.decisions.recordContents,
      storageFailure: draft.decisions.storageFailure
    }, null, 2)}</pre></details>
  </section>;
}

function TestsStage({ draft, setDraft }) {
  const updateScenario = (index, field, value) => {
    setDraft((current) => {
      const next = cloneDraft(current);
      next.acceptanceScenarios[index][field] = value;
      return next;
    });
  };
  const addScenario = () => setDraft((current) => ({ ...cloneDraft(current), acceptanceScenarios: [...current.acceptanceScenarios.map((item) => ({ ...item })), { id: scenarioId(), title: "New acceptance scenario", given: "the feature is available", when: "the person performs an action", then: "the expected result is observable" }] }));
  const removeScenario = (index) => setDraft((current) => {
    const next = cloneDraft(current);
    next.acceptanceScenarios.splice(index, 1);
    return next;
  });

  return <section className="stage-body">
    <header><span className="eyebrow">4 · Define proof before implementation</span><h2>What scenarios must the finished feature satisfy?</h2><p>These are planned acceptance checks. Writing them does not mean they have run or passed.</p></header>
    <div className="scenario-list">{draft.acceptanceScenarios.map((scenario, index) => <article className="scenario-card" key={scenario.id}>
      <div className="scenario-head"><strong>Scenario {index + 1}</strong><button type="button" onClick={() => removeScenario(index)} disabled={draft.acceptanceScenarios.length <= 1}>Remove</button></div>
      <label className="field compact"><span>Name</span><input value={scenario.title} onChange={(event) => updateScenario(index, "title", event.target.value)} /></label>
      <label className="field compact"><span>Given</span><textarea rows="2" value={scenario.given} onChange={(event) => updateScenario(index, "given", event.target.value)} /></label>
      <label className="field compact"><span>When</span><textarea rows="2" value={scenario.when} onChange={(event) => updateScenario(index, "when", event.target.value)} /></label>
      <label className="field compact"><span>Then</span><textarea rows="2" value={scenario.then} onChange={(event) => updateScenario(index, "then", event.target.value)} /></label>
    </article>)}</div>
    <button type="button" className="secondary-action" onClick={addScenario}>Add acceptance scenario</button>
  </section>;
}

function ImpactStage({ draft }) {
  const impact = deriveImplementationImpact(draft);
  return <section className="stage-body">
    <header><span className="eyebrow">5 · See the technical consequence</span><h2>What parts of the implementation would these decisions affect?</h2><p>This is derived from decision metadata—not guessed from the wording on screen.</p></header>
    <div className="impact-list">{impact.map((item) => <article key={item.id}>
      <div><strong>{item.label}</strong><span>{item.files.length} file area{item.files.length === 1 ? "" : "s"}</span></div>
      <ul>{item.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
      <details><summary>Files likely involved</summary>{item.files.map((file) => <code key={file}>{file}</code>)}</details>
    </article>)}</div>
    <aside className="coach-note"><strong>Engineering skill being practiced</strong><p>Trace product decisions to contracts, implementation seams, and verification work before code changes begin.</p></aside>
  </section>;
}

function ReviewStage({ draft }) {
  const changes = changedFields(draft);
  return <section className="stage-body">
    <header><span className="eyebrow">6 · Review intent before implementation</span><h2>What did you change from the verified baseline?</h2><p>A reviewer should see the changed engineering intent before an implementation workflow acts on it.</p></header>
    {changes.length ? <div className="change-list">{changes.map((change) => <article key={change.label}><strong>{change.label}</strong><div><span>Before</span><p>{change.before}</p></div><div><span>Now</span><p>{change.after}</p></div></article>)}</div> : <div className="empty-state"><strong>No authoring changes yet.</strong><p>The current draft still matches the verified v1.3 feature baseline.</p></div>}
    <section className="authority-card"><span className="eyebrow">Authority boundary</span><h3>This is still a draft.</h3><p>Reviewing or exporting this intent does not commit code, modify GitHub, update planning authority, or prove any tests passed.</p></section>
  </section>;
}

function HandoffStage({ draft }) {
  const [preview, setPreview] = useState(false);
  const brief = useMemo(() => buildImplementationBrief(draft), [draft]);
  return <section className="stage-body">
    <header><span className="eyebrow">7 · Hand off to implementation</span><h2>Turn the authored intent into a precise implementation brief.</h2><p>The brief can be consumed by an authorized coding workflow while preserving the exact baseline, decisions, acceptance scenarios, impact, and authority boundary.</p></header>
    <div className="handoff-summary">
      <article><span>Baseline</span><code>{brief.baselineRevision}</code></article>
      <article><span>Verification state</span><strong>Planned — not executed</strong></article>
      <article><span>Repository write</span><strong>Not allowed from this artifact</strong></article>
    </div>
    <div className="handoff-actions"><button type="button" onClick={() => downloadJson("saved-graph-layouts-implementation-brief.json", brief)}>Download implementation brief</button><button type="button" className="secondary-action" onClick={() => setPreview((value) => !value)}>{preview ? "Hide" : "Preview"} JSON</button></div>
    {preview && <pre className="brief-preview">{JSON.stringify(brief, null, 2)}</pre>}
    <aside className="coach-note"><strong>Next owner</strong><p>An authorized implementation workflow may use this brief to change code. It must still run verification and produce execution evidence before claiming the feature is implemented or passing.</p></aside>
  </section>;
}

function App() {
  const storage = useMemo(() => browserStorage(), []);
  const initial = useMemo(() => loadFeatureDraft(storage, baselineDraft), [storage]);
  const [draft, setDraft] = useState(initial.draft);
  const [stage, setStage] = useState("outcome");
  const [saveStatus, setSaveStatus] = useState(initial.status);
  const [validationError, setValidationError] = useState("");

  const updateTop = (field, value) => setDraft((current) => ({ ...cloneDraft(current), [field]: value }));
  const setDecision = (field, value) => setDraft((current) => ({ ...cloneDraft(current), decisions: { ...current.decisions, [field]: value } }));

  const saveDraft = () => {
    try {
      const normalized = normalizeFeatureDraft(draft);
      const result = saveFeatureDraft(storage, normalized);
      setDraft(result.draft);
      setSaveStatus(result.status);
      setValidationError("");
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : String(error));
    }
  };

  const resetDraft = () => {
    clearFeatureDraft(storage, baselineDraft);
    setDraft(createSavedLayoutsDraft({ baselineRevision: BASELINE_REVISION }));
    setSaveStatus("cleared");
    setValidationError("");
    setStage("outcome");
  };

  const renderStage = () => {
    if (stage === "outcome") return <OutcomeStage draft={draft} update={updateTop} />;
    if (stage === "behavior") return <BehaviorStage draft={draft} setDecision={setDecision} />;
    if (stage === "design") return <DesignStage draft={draft} />;
    if (stage === "tests") return <TestsStage draft={draft} setDraft={setDraft} />;
    if (stage === "impact") return <ImpactStage draft={draft} />;
    if (stage === "review") return <ReviewStage draft={draft} />;
    return <HandoffStage draft={draft} />;
  };

  const stageIndex = STAGES.findIndex(([id]) => id === stage);
  const next = STAGES[stageIndex + 1]?.[0];
  const previous = STAGES[stageIndex - 1]?.[0];

  return <main className="studio-shell">
    <header className="studio-header">
      <div><span className="eyebrow">Representation Router · Feature Studio v0</span><h1>Build a feature without starting in the code</h1><p>Author the engineering intent in task language, see the technical impact, and hand off one exact implementation brief.</p></div>
      <div className="header-meta"><span>Verified baseline</span><code>{BASELINE_REVISION.slice(0, 12)}…</code><small>Saved Graph Layouts v1.3</small></div>
    </header>

    <div className="save-bar" role="status"><div><strong>{saveStatus === "restored" ? "Local draft restored" : saveStatus === "saved" ? "Draft saved in this browser" : saveStatus === "unavailable" || saveStatus === "invalid" ? "Browser draft storage unavailable" : saveStatus === "cleared" ? "Draft reset to baseline" : "Working draft"}</strong><span>Local draft only · no repository write</span></div><div className="save-actions"><button type="button" onClick={saveDraft}>Save draft</button><button type="button" className="secondary-action" onClick={resetDraft}>Reset to baseline</button></div></div>
    {validationError && <div className="error-banner" role="alert"><strong>Fix this before saving</strong><span>{validationError}</span></div>}

    <div className="studio-grid">
      <nav className="stage-nav" aria-label="Feature authoring stages">{STAGES.map(([id, label], index) => <button key={id} type="button" aria-current={stage === id ? "step" : undefined} onClick={() => setStage(id)}><span>{index + 1}</span><strong>{label}</strong></button>)}</nav>
      <section className="stage-panel">{renderStage()}<footer className="stage-footer"><button type="button" className="secondary-action" onClick={() => previous && setStage(previous)} disabled={!previous}>Back</button><span>Stage {stageIndex + 1} of {STAGES.length}</span><button type="button" onClick={() => next && setStage(next)} disabled={!next}>Continue</button></footer></section>
      <aside className="truth-panel">
        <span className="eyebrow">Always true</span><h2>The draft is not the implementation.</h2>
        <ul><li>The baseline revision stays explicit.</li><li>Technical consequences remain inspectable.</li><li>Acceptance scenarios are planned checks until they actually run.</li><li>Only an authorized implementation workflow may change source.</li></ul>
        <details className="technical-details"><summary>Current draft contract</summary><pre>{JSON.stringify({ featureId: draft.featureId, baselineRevision: draft.baselineRevision, decisions: draft.decisions, scenarioCount: draft.acceptanceScenarios.length, authority: draft.metadata.authority }, null, 2)}</pre></details>
      </aside>
    </div>
  </main>;
}

createRoot(document.getElementById("root")).render(<App />);
