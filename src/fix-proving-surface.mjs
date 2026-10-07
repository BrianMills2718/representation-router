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

export function renderFixProvingSurface({ problem, diagnosis, receipt = null }) {
  const brief = diagnosis.implementationBrief;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Representation Router · Fix Proving Loop</title>
  <style>
    :root { font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color:#172033; background:#f5f7fb; }
    * { box-sizing:border-box; } body { margin:0; min-width:320px; }
    .top { background:#111827; color:white; padding:28px 32px 24px; }
    .eyebrow { display:inline-block; text-transform:uppercase; letter-spacing:.11em; font-size:.72rem; font-weight:850; color:#667085; }
    .top .eyebrow { color:#93c5fd; } h1 { margin:5px 0 8px; font-size:clamp(1.8rem,4vw,2.7rem); }
    .top p { margin:0; max-width:900px; color:#cbd5e1; line-height:1.6; }
    main { max-width:1180px; margin:0 auto; padding:23px; }
    .flow { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:10px; margin-bottom:16px; }
    .step,.card,.evidence { background:white; border:1px solid #dde3ec; border-radius:15px; box-shadow:0 7px 22px rgba(15,23,42,.05); }
    .step { padding:14px; border-top:4px solid #2563eb; } .step.pending { border-top-color:#f59e0b; }
    .step strong { display:block; margin-bottom:5px; } .step p,.card p,.card li,.evidence p { color:#475467; line-height:1.55; }
    .grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:15px; }
    .card,.evidence { padding:19px; } .card h2,.card h3 { margin:5px 0 9px; }
    .change { display:grid; grid-template-columns:1fr auto 1fr; gap:10px; align-items:center; background:#f8fafc; border-radius:10px; padding:12px; }
    .change strong { text-align:center; } code { background:#eef2f7; padding:2px 5px; border-radius:5px; word-break:break-all; }
    .button { display:inline-block; text-decoration:none; background:#1d4ed8; color:white; border-radius:10px; padding:10px 14px; font-weight:820; margin-top:10px; }
    .evidence { margin-top:15px; border-left:4px solid #f59e0b; } .evidence.good { border-left-color:#16a34a; }
    .boundary { margin-top:15px; background:#fffbeb; border-left:4px solid #f59e0b; border-radius:11px; padding:14px; }
    .boundary p { margin:5px 0 0; color:#475467; }
    footer { background:#111827; color:#cbd5e1; padding:15px 24px; display:flex; justify-content:space-between; gap:14px; }
    @media (max-width:800px) { .top { padding:22px 18px; } main { padding:14px; } .flow,.grid { grid-template-columns:1fr; } .change { grid-template-columns:1fr; } footer { flex-direction:column; } }
  </style>
</head>
<body>
  <header class="top"><span class="eyebrow">Representation Router · Fix proving loop</span><h1>From a reported problem to an implementation candidate</h1><p>This artifact proves that a supported Fix problem can be diagnosed into the same implementation-brief/v1 and Implementation Runner path used by Build.</p></header>
  <main>
    <section class="flow">
      <article class="step"><strong>1 · Problem</strong><p>Observed vs expected behavior + reproduction evidence.</p></article>
      <article class="step"><strong>2 · Diagnose</strong><p>A registered diagnostic adapter matches or abstains.</p></article>
      <article class="step"><strong>3 · Handoff</strong><p>Diagnosis produces a normal implementation-brief/v1.</p></article>
      <article class="step"><strong>4 · Implement</strong><p>The existing implementation runner builds the candidate.</p></article>
      <article class="step pending"><strong>5 · Human review</strong><p>Automation does not decide whether the fix is good.</p></article>
    </section>

    <section class="grid">
      <article class="card"><span class="eyebrow">Problem intent</span><h2>${escapeHtml(problem.summary)}</h2><h3>Observed</h3><p>${escapeHtml(problem.observedBehavior)}</p><h3>Expected</h3><p>${escapeHtml(problem.expectedBehavior)}</p><h3>Reproduce</h3><ol>${problem.reproductionSteps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}</ol><p>Baseline ${code(problem.baselineRevision)}</p></article>
      <article class="card"><span class="eyebrow">Diagnosis</span><h2>${escapeHtml(diagnosis.summary)}</h2><div class="change"><span><b>Current</b><br>${escapeHtml(diagnosis.proposedChange.from)}</span><strong>→</strong><span><b>Proposed</b><br>${escapeHtml(diagnosis.proposedChange.to)}</span></div><h3>Diagnostic adapter</h3><p>${code(diagnosis.diagnosticAdapter.id)} v${escapeHtml(diagnosis.diagnosticAdapter.version)}</p><h3>Nonclaims</h3><ul>${diagnosis.nonclaims.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></article>
      <article class="card"><span class="eyebrow">Derived implementation handoff</span><h2>${escapeHtml(brief.outcome)}</h2><ul>${brief.decisions.map((item) => `<li><strong>${escapeHtml(item.label)}</strong>: ${escapeHtml(item.value)}</li>`).join("")}</ul><p>Verification: <strong>${escapeHtml(brief.verification.status)}</strong></p><p>Next owner: ${escapeHtml(brief.authority.nextOwner)}</p></article>
      <article class="card"><span class="eyebrow">Implementation candidate</span><h2>Built through the normal Implementation Runner</h2><p>The diagnostic path does not get a special code generator. Its v1 brief is routed through the existing Saved Graph Layouts implementation adapter/runtime.</p><a class="button" href="runner/index.html">Open fix implementation runner →</a></article>
    </section>

    <section class="evidence ${receipt ? "good" : ""}">${receipt ? `<strong>Executed evidence attached</strong><p>${escapeHtml(receipt.statement)}</p><p>Runner head ${code(receipt.runnerRevision)} · CI ${code(receipt.ci.runId)} · artifact ${code(receipt.artifact.id)}</p><p>Human review: <strong>${escapeHtml(receipt.humanReview.status)}</strong></p>` : `<strong>Execution evidence pending</strong><p>The problem, diagnosis, brief, and generated candidate exist, but this surface does not yet claim the exact checks ran until a receipt is attached.</p>`}</section>

    <div class="boundary"><strong>Authority boundary</strong><p>Problem description and diagnosis are handoff artifacts. They do not mutate the product, repository, planning state, or approval state. A generated candidate and green checks still require human review.</p></div>
  </main>
  <footer><span>Diagnosis ≠ source-code change.</span><span>Green CI ≠ human acceptance.</span></footer>
</body>
</html>`;
}
