function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function code(value) {
  return `<code>${escapeHtml(value)}</code>`;
}

function scenarioCard(scenario) {
  return `<article class="scenario-card">
    <strong>${escapeHtml(scenario.title)}</strong>
    <p><b>Given</b> ${escapeHtml(scenario.given)}</p>
    <p><b>When</b> ${escapeHtml(scenario.when)}</p>
    <p><b>Then</b> ${escapeHtml(scenario.then)}</p>
  </article>`;
}

function fileRows(files) {
  return files.map((file) => `<li>${code(file)}</li>`).join("");
}

export function renderImplementationLoop({ brief, receipt }) {
  const decisions = [
    ["Save behavior", brief.decisions.rememberMode === "explicit-save" ? "Save only when the person chooses Save arrangement" : brief.decisions.rememberMode],
    ["Reset behavior", brief.decisions.resetMode === "confirm-before-reset" ? "Ask before deleting the saved arrangement" : brief.decisions.resetMode],
    ["Storage", "This browser only"],
    ["Revision rule", "Only the exact represented software revision"],
    ["Saved data", "Node IDs + x/y positions only"]
  ];

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Representation Router · Implementation Loop v0</title>
  <style>
    :root { font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #172033; background: #f5f7fb; }
    * { box-sizing: border-box; }
    body { margin: 0; min-width: 320px; }
    button { font: inherit; }
    .top { background: #111827; color: white; padding: 28px 32px 24px; }
    .eyebrow { display: inline-block; text-transform: uppercase; letter-spacing: .11em; font-size: .72rem; font-weight: 850; color: #667085; }
    .top .eyebrow { color: #93c5fd; }
    h1 { margin: 5px 0 8px; font-size: clamp(1.75rem, 4vw, 2.7rem); }
    .top p { margin: 0; max-width: 880px; color: #cbd5e1; line-height: 1.6; }
    .status-row { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 18px; }
    .status { border: 1px solid rgba(255,255,255,.18); border-radius: 999px; padding: 8px 11px; font-size: .82rem; }
    .status strong { margin-right: 5px; }
    .tabs { position: sticky; top: 0; z-index: 10; display: flex; gap: 8px; padding: 12px 22px; background: white; border-bottom: 1px solid #dce3ed; overflow-x: auto; }
    .tabs button { border: 1px solid transparent; background: transparent; color: #475467; padding: 9px 13px; border-radius: 999px; font-weight: 760; cursor: pointer; white-space: nowrap; }
    .tabs button[aria-selected="true"] { background: #e9efff; border-color: #bdcaf8; color: #1d4ed8; }
    main { max-width: 1240px; margin: 0 auto; padding: 24px; }
    [data-panel] { display: none; }
    [data-panel].active { display: block; }
    .hero, .card, .step, .scenario-card, .candidate-card, .nonclaim { background: white; border: 1px solid #dde3ec; border-radius: 16px; box-shadow: 0 7px 22px rgba(15,23,42,.055); }
    .hero { padding: 25px; }
    .hero h2 { margin: 5px 0 10px; font-size: clamp(1.4rem, 3vw, 2.05rem); }
    .hero p { color: #475467; line-height: 1.65; max-width: 900px; }
    .loop { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; margin: 18px 0; }
    .step { padding: 15px; position: relative; }
    .step span.number { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 50%; background: #e9efff; color: #1d4ed8; font-weight: 900; margin-bottom: 9px; }
    .step strong { display: block; margin-bottom: 5px; }
    .step p { margin: 0; color: #667085; font-size: .88rem; line-height: 1.5; }
    .step.good { border-top: 4px solid #16a34a; }
    .step.pending { border-top: 4px solid #f59e0b; }
    .grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
    .grid-3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
    .card { padding: 20px; }
    .card h3 { margin: 5px 0 10px; }
    .card p, .card li { color: #475467; line-height: 1.55; }
    .decision-list { display: grid; gap: 9px; }
    .decision { display: flex; justify-content: space-between; gap: 14px; padding: 10px 0; border-bottom: 1px solid #edf0f4; }
    .decision:last-child { border-bottom: 0; }
    .decision span { color: #667085; }
    .scenario-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .scenario-card { padding: 15px; }
    .scenario-card p { margin: 7px 0 0; color: #475467; line-height: 1.48; }
    code { background: #eef2f7; color: #344054; padding: 2px 5px; border-radius: 5px; word-break: break-all; }
    .evidence-chain { display: grid; gap: 10px; }
    .evidence-item { display: grid; grid-template-columns: 180px 1fr; gap: 14px; padding: 12px 0; border-bottom: 1px solid #edf0f4; }
    .evidence-item:last-child { border-bottom: 0; }
    .evidence-item > strong { color: #344054; }
    .evidence-item > div { color: #475467; }
    .check { display: flex; align-items: center; gap: 9px; padding: 9px 0; }
    .check i { font-style: normal; width: 24px; height: 24px; display: grid; place-items: center; border-radius: 50%; background: #dcfce7; color: #166534; font-weight: 900; }
    .candidate-card { padding: 22px; margin-top: 16px; border-left: 4px solid #2563eb; }
    .candidate-card h3 { margin: 5px 0 7px; }
    .candidate-card p { color: #475467; line-height: 1.55; }
    .artifact-id { display: grid; gap: 8px; margin-top: 14px; padding: 14px; background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 12px; }
    .nonclaim { padding: 17px; border-left: 4px solid #f59e0b; margin-top: 16px; }
    .nonclaim strong { display: block; margin-bottom: 5px; }
    .nonclaim p { margin: 0; color: #475467; }
    ul.files { columns: 2; padding-left: 20px; }
    footer { padding: 16px 24px; background: #111827; color: #cbd5e1; display: flex; justify-content: space-between; gap: 14px; }
    @media (max-width: 980px) { .loop { grid-template-columns: 1fr 1fr; } .grid-3 { grid-template-columns: 1fr; } }
    @media (max-width: 760px) { .top { padding: 23px 18px; } main { padding: 14px; } .loop, .grid-2, .scenario-grid { grid-template-columns: 1fr; } .evidence-item { grid-template-columns: 1fr; gap: 4px; } ul.files { columns: 1; } footer { flex-direction: column; } }
  </style>
</head>
<body>
  <header class="top">
    <span class="eyebrow">Representation Router · Implementation Loop v0</span>
    <h1>From a human decision to a verified candidate</h1>
    <p>This surface keeps intent, implementation, checks, executed evidence, and human review separate while linking them into one engineering story.</p>
    <div class="status-row">
      <span class="status"><strong>Brief</strong> planned</span>
      <span class="status"><strong>Candidate</strong> built</span>
      <span class="status"><strong>Checks</strong> executed</span>
      <span class="status"><strong>Human review</strong> pending</span>
    </div>
  </header>

  <nav class="tabs" aria-label="Implementation loop sections">
    <button type="button" data-tab="story" aria-selected="true">Engineering story</button>
    <button type="button" data-tab="intent" aria-selected="false">Intent</button>
    <button type="button" data-tab="implementation" aria-selected="false">Implementation</button>
    <button type="button" data-tab="evidence" aria-selected="false">Executed evidence</button>
    <button type="button" data-tab="review" aria-selected="false">Review candidate</button>
  </nav>

  <main>
    <section data-panel="story" class="active">
      <div class="hero">
        <span class="eyebrow">The question this checkpoint answers</span>
        <h2>Did an authored product decision cause a concrete, verified software candidate?</h2>
        <p>The Feature Studio brief asked for explicit saving and confirmation before reset. The repository implementation workflow produced a candidate, CI executed the checks, and the resulting artifact is now waiting for human judgment.</p>
      </div>
      <div class="loop">
        <article class="step"><span class="number">1</span><strong>Intent</strong><p>Feature Studio brief with exact baseline and planned checks.</p></article>
        <article class="step"><span class="number">2</span><strong>Implementation</strong><p>Candidate source changes on a new exact revision.</p></article>
        <article class="step"><span class="number">3</span><strong>Checks</strong><p>Executable definitions protect the requested behavior.</p></article>
        <article class="step good"><span class="number">4</span><strong>Executed evidence</strong><p>CI actually ran and passed the recorded checks.</p></article>
        <article class="step pending"><span class="number">5</span><strong>Human review</strong><p>You still decide whether the candidate is useful and correct.</p></article>
      </div>
      <div class="nonclaim"><strong>The critical distinction</strong><p>A brief is not code. A test definition is not a test result. A green CI result is not human acceptance. This loop keeps all four states visible instead of collapsing them into “done.”</p></div>
    </section>

    <section data-panel="intent">
      <div class="hero"><span class="eyebrow">Intent · implementation brief</span><h2>${escapeHtml(brief.outcome)}</h2><p>${escapeHtml(brief.successCriterion)}</p></div>
      <div class="grid-2" style="margin-top:16px">
        <article class="card"><span class="eyebrow">Decisions</span><h3>What the person asked for</h3><div class="decision-list">${decisions.map(([label, value]) => `<div class="decision"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("")}</div></article>
        <article class="card"><span class="eyebrow">Exact baseline</span><h3>The software state the brief was written against</h3><p>${code(brief.baselineRevision)}</p><p>The brief itself still records verification as <strong>${escapeHtml(brief.verification.status)}</strong>. That is correct: at authoring time the checks had not executed.</p></article>
      </div>
      <section class="card" style="margin-top:16px"><span class="eyebrow">Acceptance scenarios</span><h3>Checks requested by the brief</h3><div class="scenario-grid">${brief.acceptanceScenarios.map(scenarioCard).join("")}</div></section>
    </section>

    <section data-panel="implementation">
      <div class="hero"><span class="eyebrow">Implementation · candidate snapshot</span><h2>A separate explicit-save candidate was built</h2><p>The reviewed v1.3 baseline was left intact. This candidate changes the save/reset interaction while preserving the browser-local, exact-revision, positions-only authority boundary.</p></div>
      <div class="grid-2" style="margin-top:16px">
        <article class="card"><h3>Exact candidate revision</h3><p>${code(receipt.candidateRevision)}</p><h3>Changed files</h3><ul class="files">${fileRows(receipt.changedFiles)}</ul></article>
        <article class="card"><h3>Behavioral delta</h3><ul><li>Dragging marks the layout as unsaved.</li><li><strong>Save arrangement</strong> is the only persistence action.</li><li><strong>Reset positions</strong> opens a confirmation step.</li><li>Cancelling reset preserves the arrangement.</li><li>Confirmed reset clears only local presentation state.</li></ul><h3>What did not change</h3><ul><li>No semantic graph editing.</li><li>No cloud/account persistence.</li><li>No reuse across source revisions.</li><li>No Feature Studio repository write path.</li></ul></article>
      </div>
    </section>

    <section data-panel="evidence">
      <div class="hero"><span class="eyebrow">Executed evidence</span><h2>The checks ran on the exact candidate revision</h2><p>${escapeHtml(receipt.verification.statement)}</p></div>
      <div class="grid-2" style="margin-top:16px">
        <article class="card"><h3>Executed checks</h3>${receipt.executedChecks.map((check) => `<div class="check"><i>✓</i><div><strong>${escapeHtml(check.name)}</strong><br><small>passed</small></div></div>`).join("")}<div class="nonclaim"><strong>What this means</strong><p>The recorded checks executed successfully. It does not mean every possible behavior was tested.</p></div></article>
        <article class="card"><h3>Execution receipt</h3><div class="evidence-chain"><div class="evidence-item"><strong>CI run</strong><div>${code(receipt.ci.runId)} · ${escapeHtml(receipt.ci.conclusion)}</div></div><div class="evidence-item"><strong>Candidate revision</strong><div>${code(receipt.candidateRevision)}</div></div><div class="evidence-item"><strong>Artifact</strong><div>${code(receipt.artifact.id)} · ${escapeHtml(receipt.artifact.name)}</div></div><div class="evidence-item"><strong>HTML SHA-256</strong><div>${code(receipt.artifact.sha256)}</div></div>${receipt.artifact.sizeBytes ? `<div class="evidence-item"><strong>HTML bytes</strong><div>${escapeHtml(receipt.artifact.sizeBytes)}</div></div>` : ""}</div></article>
      </div>
    </section>

    <section data-panel="review">
      <div class="hero"><span class="eyebrow">Human checkpoint</span><h2>Now judge the candidate, not the plan</h2><p>${escapeHtml(receipt.humanReview.statement)}</p></div>
      <div class="candidate-card"><span class="eyebrow">Candidate product</span><h3>Review Workbench v1.4 — explicit save + confirmed reset</h3><p>Try the separately retained candidate artifact from the exact successful candidate run. This evidence surface intentionally does not substitute a later rebuild for that pinned artifact.</p><div class="artifact-id"><div><strong>Artifact</strong> ${code(receipt.artifact.id)} · ${escapeHtml(receipt.artifact.name)}</div><div><strong>Candidate revision</strong> ${code(receipt.candidateRevision)}</div><div><strong>SHA-256</strong> ${code(receipt.artifact.sha256)}</div></div></div>
      <div class="grid-3" style="margin-top:16px"><article class="card"><h3>1. Unsaved movement</h3><p>After an arrangement is saved, move a box but do not save again. Reload. The last saved arrangement—not the unsaved movement—should return.</p></article><article class="card"><h3>2. Explicit save</h3><p>Move a box, choose Save arrangement, reload, and verify the new saved position returns.</p></article><article class="card"><h3>3. Confirmed reset</h3><p>Open Reset positions, cancel once, then confirm on the second attempt. Cancellation should preserve; confirmation should restore defaults.</p></article></div>
      <div class="nonclaim"><strong>Review is still open</strong><p>The receipt proves the recorded checks ran successfully. Only your review can tell us whether this candidate interaction is preferable and whether the closed-loop engineering surface is understandable.</p></div>
    </section>
  </main>

  <footer><span>Intent → candidate → executed evidence → human review.</span><span>Exact identities remain inspectable at every step.</span></footer>
  <script>
    const buttons = [...document.querySelectorAll('[data-tab]')];
    const panels = [...document.querySelectorAll('[data-panel]')];
    function openTab(id) {
      buttons.forEach((button) => button.setAttribute('aria-selected', String(button.dataset.tab === id)));
      panels.forEach((panel) => panel.classList.toggle('active', panel.dataset.panel === id));
    }
    buttons.forEach((button) => button.addEventListener('click', () => openTab(button.dataset.tab)));
    const requested = location.hash.slice(1);
    if (requested && panels.some((panel) => panel.dataset.panel === requested)) openTab(requested);
  </script>
</body>
</html>`;
}
