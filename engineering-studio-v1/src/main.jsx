import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import problemFixture from "../../examples/problem-intent-saved-layout-reset-v0.json";
import {
  buildImplementationBriefV1,
  createAuthoringDraft,
  listAuthoringFeatures,
  updateDraftDecision
} from "../../src/implementation-authoring.mjs";
import { listDiagnosticCapabilities, routeProblemIntent } from "../../src/diagnostic-router.mjs";

const FEATURES = listAuthoringFeatures();
const DIAGNOSTICS = listDiagnosticCapabilities();

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function downloadJson(filename, value) {
  const blob = new Blob([`${JSON.stringify(value, null, 2)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function featureById(id) {
  return FEATURES.find((item) => item.featureId === id) ?? FEATURES[0];
}

function BuildStudio({ onHandoff }) {
  const [featureId, setFeatureId] = useState(FEATURES[0].featureId);
  const [draft, setDraft] = useState(() => createAuthoringDraft(FEATURES[0].featureId));
  const feature = featureById(featureId);

  const briefResult = useMemo(() => {
    try {
      return { brief: buildImplementationBriefV1(draft), error: null };
    } catch (error) {
      return { brief: null, error: error instanceof Error ? error.message : String(error) };
    }
  }, [draft]);

  function chooseFeature(nextId) {
    setFeatureId(nextId);
    setDraft(createAuthoringDraft(nextId));
  }

  function setDecision(id, value) {
    setDraft((current) => updateDraftDecision(current, id, value));
  }

  function editScenario(index, field, value) {
    setDraft((current) => {
      const next = clone(current);
      next.acceptanceScenarios[index][field] = value;
      return next;
    });
  }

  function addScenario() {
    setDraft((current) => {
      const next = clone(current);
      const number = next.acceptanceScenarios.length + 1;
      next.acceptanceScenarios.push({ id: `scenario-${number}`, title: "New acceptance scenario", given: "the relevant starting condition exists", when: "the person uses the feature", then: "the expected behavior is observable" });
      return next;
    });
  }

  function removeScenario(index) {
    setDraft((current) => {
      const next = clone(current);
      next.acceptanceScenarios.splice(index, 1);
      return next;
    });
  }

  return <section className="layout">
    <div>
      <div className="hero">
        <span className="eyebrow">Build something</span>
        <h2>Choose the capability you want to shape</h2>
        <p>Engineering Studio renders decisions from the selected implementation adapter. You make product choices in ordinary language; the exported implementation brief carries the exact technical contract underneath.</p>
        <div className="feature-grid">{FEATURES.map((item) => <button type="button" className="feature-card" key={item.featureId} aria-selected={item.featureId === featureId} onClick={() => chooseFeature(item.featureId)}><span className="eyebrow">Supported</span><strong>{item.title}</strong><p>{item.summary}</p></button>)}</div>
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <span className="eyebrow">Outcome</span>
        <h2>What should be better for the person using the software?</h2>
        <div className="field"><label htmlFor="outcome">Desired outcome</label><textarea id="outcome" value={draft.outcome} onChange={(event) => setDraft((current) => ({ ...current, outcome: event.target.value }))} /></div>
        <div className="field"><label htmlFor="success">How will we know the feature behaves correctly?</label><textarea id="success" value={draft.successCriterion} onChange={(event) => setDraft((current) => ({ ...current, successCriterion: event.target.value }))} /></div>
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <span className="eyebrow">Behavior decisions</span>
        <h2>Choose how this capability should behave</h2>
        <div className="decision-grid">{feature.decisions.map((definition) => {
          const selected = draft.decisions.find((item) => item.id === definition.id)?.value;
          return <article className="decision-card" key={definition.id}><h3>{definition.label}</h3><div className="option-grid">{definition.options.map((option) => <button type="button" className="option" key={option.value} aria-pressed={selected === option.value} onClick={() => setDecision(definition.id, option.value)}><strong>{option.label}</strong><small>{option.explanation}</small></button>)}</div></article>;
        })}</div>
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <span className="eyebrow">Acceptance scenarios</span>
        <h2>Describe what should be provable</h2>
        <div className="scenarios">{draft.acceptanceScenarios.map((scenario, index) => <article className="scenario" key={`${scenario.id}-${index}`}><div className="scenario-head"><h3>{scenario.title}</h3><button type="button" className="danger" onClick={() => removeScenario(index)} disabled={draft.acceptanceScenarios.length <= 1}>Remove</button></div><div className="field"><span>Scenario name</span><input value={scenario.title} onChange={(event) => editScenario(index, "title", event.target.value)} /></div><div className="inline-three"><div className="field"><span>Given</span><textarea value={scenario.given} onChange={(event) => editScenario(index, "given", event.target.value)} /></div><div className="field"><span>When</span><textarea value={scenario.when} onChange={(event) => editScenario(index, "when", event.target.value)} /></div><div className="field"><span>Then</span><textarea value={scenario.then} onChange={(event) => editScenario(index, "then", event.target.value)} /></div></div></article>)}</div>
        <div className="actions"><button type="button" className="secondary" onClick={addScenario}>Add scenario</button>{briefResult.brief && <button type="button" className="primary" onClick={() => onHandoff("build", briefResult.brief)}>Review implementation handoff</button>}</div>
        {briefResult.error && <div className="status bad">{briefResult.error}</div>}
      </div>
    </div>

    <aside>
      <div className="panel">
        <span className="eyebrow">Fixed constraints</span><h3>These choices are not open in this supported implementation path</h3>
        <div className="constraints">{feature.constraints.map((constraint) => <div className="constraint" key={constraint.id}><strong>{constraint.label}: {constraint.value}</strong><span>{constraint.explanation}</span></div>)}</div>
        <div className="authority"><strong>Authority boundary</strong><p>Engineering Studio creates a handoff brief. It does not write Git, change product state, or claim tests ran.</p></div>
        <details className="technical"><summary>Technical details</summary><p>Feature ID <code>{feature.featureId}</code></p><p>Adapter <code>{feature.adapterId}</code> v{feature.adapterVersion}</p><p>Runtime <code>{feature.runtimeId}</code></p><p>Baseline <code>{feature.baselineRevision}</code></p><p>Output schema <code>implementation-brief/v1</code></p></details>
      </div>
      {briefResult.brief && <div className="status good"><strong>Handoff is structurally valid.</strong><br />The selected adapter accepts this v1 brief. Verification remains planned, not executed.</div>}
    </aside>
  </section>;
}

function FixStudio({ onHandoff }) {
  const [problem, setProblem] = useState(() => clone(problemFixture));
  const [diagnosticMode, setDiagnosticMode] = useState("supported-reset");
  const [result, setResult] = useState(null);
  const supported = DIAGNOSTICS[0];

  function setProblemField(field, value) {
    setProblem((current) => ({ ...current, [field]: value }));
    setResult(null);
  }

  function setReproduction(value) {
    setProblem((current) => ({ ...current, reproductionSteps: value.split("\n").map((item) => item.trim()).filter(Boolean) }));
    setResult(null);
  }

  function chooseDiagnostic(value) {
    setDiagnosticMode(value);
    setProblem((current) => {
      const next = clone(current);
      const signal = next.signals.find((item) => item.id === "reset-problem");
      if (signal) signal.value = value === "supported-reset" ? supported.signalValue : "other-problem";
      return next;
    });
    setResult(null);
  }

  function diagnose() {
    setResult(routeProblemIntent(problem));
  }

  return <section className="layout">
    <div>
      <div className="hero"><span className="eyebrow">Fix something</span><h2>Describe the problem before choosing a code change</h2><p>Fix routing is intentionally narrow right now. The Studio records observed vs expected behavior, then a diagnostic adapter either produces a supported engineering handoff or stops with explicit reasons.</p></div>
      <div className="panel" style={{ marginTop: 16 }}>
        <div className="field"><label htmlFor="problem-summary">What went wrong?</label><input id="problem-summary" value={problem.summary} onChange={(event) => setProblemField("summary", event.target.value)} /></div>
        <div className="field"><label htmlFor="observed">What happened?</label><textarea id="observed" value={problem.observedBehavior} onChange={(event) => setProblemField("observedBehavior", event.target.value)} /></div>
        <div className="field"><label htmlFor="expected">What did you expect instead?</label><textarea id="expected" value={problem.expectedBehavior} onChange={(event) => setProblemField("expectedBehavior", event.target.value)} /></div>
        <div className="field"><label htmlFor="repro">How can someone reproduce it?</label><textarea id="repro" value={problem.reproductionSteps.join("\n")} onChange={(event) => setReproduction(event.target.value)} /><small>One step per line.</small></div>
        <div className="field"><label htmlFor="capability">Where did it happen?</label><select id="capability" value={problem.affectedCapability} onChange={(event) => setProblemField("affectedCapability", event.target.value)}><option value="saved-graph-layouts">Diagram arrangement</option><option value="evidence-gap-focus">Evidence review</option><option value="other-capability">Somewhere else</option></select></div>
        <div className="field"><label htmlFor="known-problem">Which current problem pattern fits best?</label><select id="known-problem" value={diagnosticMode} onChange={(event) => chooseDiagnostic(event.target.value)}><option value="supported-reset">{supported.title}</option><option value="other">Something else / not listed</option></select><small>{supported.summary}</small></div>
        <div className="actions"><button type="button" className="primary" onClick={diagnose}>Diagnose this problem</button></div>
      </div>

      {result?.status === "diagnosed" && <div className="diagnosis good"><span className="eyebrow">Supported diagnosis</span><h2>{result.diagnosis.summary}</h2><div className="change"><span><b>Current</b><br />{result.diagnosis.proposedChange.from}</span><strong>→</strong><span><b>Proposed</b><br />{result.diagnosis.proposedChange.to}</span></div><h3>What stays the same</h3><ul><li>Save behavior: {result.diagnosis.preservedBehavior.rememberMode}</li><li>Save feedback: {result.diagnosis.preservedBehavior.saveReceipt}</li></ul><h3>What this diagnosis does not claim</h3><ul>{result.diagnosis.nonclaims.map((item) => <li key={item}>{item}</li>)}</ul><div className="actions"><button type="button" className="primary" onClick={() => onHandoff("fix", result.diagnosis.implementationBrief, result)}>Review proposed fix handoff</button></div><details className="technical"><summary>Technical details</summary><p>Diagnostic adapter <code>{result.adapter.id}</code> v{result.adapter.version}</p><p>Derived feature <code>{result.diagnosis.implementationBrief.featureId}</code></p><p>Output <code>implementation-brief/v1</code></p></details></div>}
      {result?.status === "unsupported" && <div className="diagnosis warn"><span className="eyebrow">No supported diagnosis</span><h2>Engineering Studio stopped instead of guessing.</h2><ul>{result.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul><p>Use Understand to gather more evidence or wait for a diagnostic adapter that covers this problem family.</p></div>}
    </div>

    <aside><div className="panel"><span className="eyebrow">Current Fix capability</span><h3>One diagnostic adapter is registered</h3><p><strong>{supported.title}</strong></p><p>{supported.summary}</p><h3>Evidence you recorded</h3><ul>{problem.evidence.map((item) => <li key={item}>{item}</li>)}</ul><div className="authority"><strong>Authority boundary</strong><p>A diagnosis can propose an implementation brief. It cannot edit source code, claim the diagnosis is universally correct, or claim acceptance scenarios executed.</p></div></div></aside>
  </section>;
}

function Handoff({ source, brief, diagnosis, onBack }) {
  if (!brief) return <section className="hero"><h2>No handoff selected yet.</h2><p>Use Build or Fix first.</p></section>;
  return <section>
    <div className="hero"><span className="eyebrow">Review handoff · {source}</span><h2>{brief.outcome}</h2><p>{brief.successCriterion}</p><div className="actions"><button type="button" className="primary" onClick={() => downloadJson(`${brief.featureId}-implementation-brief-v1.json`, brief)}>Download implementation brief</button>{diagnosis && <button type="button" className="secondary" onClick={() => downloadJson(`${diagnosis.problemId}-diagnosis.json`, diagnosis.diagnosis)}>Download diagnosis</button>}<button type="button" className="secondary" onClick={onBack}>Return to authoring</button></div></div>
    <div className="layout" style={{ marginTop: 16 }}>
      <div>
        <article className="handoff-card"><span className="eyebrow">Decisions</span><h3>What implementation should honor</h3><ul>{brief.decisions.map((item) => <li key={item.id}><strong>{item.label}</strong>: {String(item.value)}</li>)}</ul></article>
        <article className="handoff-card"><span className="eyebrow">Acceptance scenarios</span><h3>Planned checks</h3>{brief.acceptanceScenarios.map((item) => <div key={item.id} style={{ marginBottom: 12 }}><strong>{item.title}</strong><p>Given {item.given}<br />When {item.when}<br />Then {item.then}</p></div>)}</article>
      </div>
      <aside>
        <article className="handoff-card"><span className="eyebrow">Fixed constraints</span><ul>{brief.constraints.map((item) => <li key={item.id}><strong>{item.label}</strong>: {String(item.value)}</li>)}</ul></article>
        <article className="handoff-card"><span className="eyebrow">Evidence state</span><h3>{brief.verification.status}</h3><p>{brief.verification.statement}</p><p><strong>Next owner:</strong> {brief.authority.nextOwner}</p></article>
      </aside>
    </div>
    <details className="technical"><summary>Exact JSON handoff</summary><pre>{JSON.stringify(brief, null, 2)}</pre></details>
  </section>;
}

function App() {
  const [tab, setTab] = useState("build");
  const [handoff, setHandoff] = useState({ source: null, brief: null, diagnosis: null });

  function reviewHandoff(source, brief, diagnosis = null) {
    setHandoff({ source, brief, diagnosis });
    setTab("handoff");
  }

  return <div className="app">
    <header className="topbar"><span className="eyebrow">Representation Router · Engineering Studio v1</span><h1>Build something or fix something</h1><p>Start with the human outcome or problem. Engineering Studio turns supported choices into an exact implementation handoff while keeping implementation, execution evidence, and authority separate.</p></header>
    <nav className="tabs" aria-label="Engineering Studio paths"><button type="button" aria-selected={tab === "build"} onClick={() => setTab("build")}>Build something</button><button type="button" aria-selected={tab === "fix"} onClick={() => setTab("fix")}>Fix something</button><button type="button" aria-selected={tab === "handoff"} onClick={() => setTab("handoff")}>Review handoff</button></nav>
    <main>{tab === "build" && <BuildStudio onHandoff={reviewHandoff} />}{tab === "fix" && <FixStudio onHandoff={reviewHandoff} />}{tab === "handoff" && <Handoff source={handoff.source} brief={handoff.brief} diagnosis={handoff.diagnosis} onBack={() => setTab(handoff.source === "fix" ? "fix" : "build")} />}</main>
    <footer><span>Authoring/diagnosis = handoff only.</span><span>Planned checks ≠ executed evidence.</span></footer>
  </div>;
}

createRoot(document.getElementById("root")).render(<App />);
