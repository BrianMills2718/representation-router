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

function renderEvidence(receipt) {
  if (!receipt) {
    return `<div class="evidence pending">
      <strong>Execution evidence pending</strong>
      <p>The plan and candidate have been generated, but this artifact does not claim the checks ran. CI must execute on an exact runner head before an execution receipt can be attached.</p>
    </div>`;
  }

  return `<div class="evidence good">
    <strong>Executed on exact runner head</strong>
    <p>${escapeHtml(receipt.statement)}</p>
    <dl>
      <div><dt>Runner head</dt><dd>${code(receipt.runnerRevision)}</dd></div>
      <div><dt>CI run</dt><dd>${code(receipt.ci.runId)} · ${escapeHtml(receipt.ci.conclusion)}</dd></div>
      <div><dt>Artifact</dt><dd>${code(receipt.artifact.id)} · ${escapeHtml(receipt.artifact.name)}</dd></div>
      <div><dt>Artifact SHA-256</dt><dd>${code(receipt.artifact.sha256)}</dd></div>
    </dl>
    <p><strong>Human review:</strong> ${escapeHtml(receipt.humanReview.status)}</p>
  </div>`;
}

export function renderImplementationRunnerSurface({ brief, plan, candidateSpec, receipt = null }) {
  const behavior = plan.behaviorChanges.map((item) => `<article><span>${escapeHtml(item.question)}</span><strong>${escapeHtml(item.explanation)}</strong><small>${escapeHtml(item.value)}</small></article>`).join("");
  const constraints = plan.fixedConstraints.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  const files = plan.generatedFiles.map((item) => `<li>${code(item)}</li>`).join("");
  const checks = plan.plannedChecks.map((item) => `<li>${code(item)}</li>`).join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Representation Router · Implementation Runner</title>
  <style>
    :root { font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #172033; background: #f5f7fb; }
    * { box-sizing: border-box; }
    body { margin: 0; min-width: 320px; }
    .top { background: #111827; color: white; padding: 28px 32px 24px; }
    .eyebrow { display: inline-block; text-transform: uppercase; letter-spacing: .11em; font-size: .72rem; font-weight: 850; color: #667085; }
    .top .eyebrow { color: #93c5fd; }
    h1 { margin: 5px 0 8px; font-size: clamp(1.75rem, 4vw, 2.65rem); }
    .top p { margin: 0; max-width: 900px; color: #cbd5e1; line-height: 1.6; }
    .status-row { display: flex; flex-wrap: wrap; gap: 9px; margin-top: 17px; }
    .status { border: 1px solid rgba(255,255,255,.18); border-radius: 999px; padding: 7px 10px; font-size: .82rem; }
    main { max-width: 1220px; margin: 0 auto; padding: 24px; }
    .hero, .card, .step, .decision-grid article, .evidence { background: white; border: 1px solid #dde3ec; border-radius: 16px; box-shadow: 0 7px 22px rgba(15,23,42,.055); }
    .hero { padding: 24px; }
    .hero h2 { margin: 5px 0 10px; font-size: clamp(1.45rem, 3vw, 2.05rem); }
    .hero p, .card p, .card li, .evidence p { color: #475467; line-height: 1.6; }
    .flow { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 10px; margin: 16px 0; }
    .step { padding: 14px; border-top: 4px solid #2563eb; }
    .step.pending { border-top-color: #f59e0b; }
    .step span { display: grid; place-items: center; width: 29px; height: 29px; border-radius: 50%; background: #e9efff; color: #1d4ed8; font-weight: 900; margin-bottom: 8px; }
    .step strong { display: block; margin-bottom: 5px; }
    .step p { margin: 0; color: #667085; font-size: .85rem; line-height: 1.45; }
    .grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 15px; margin-top: 15px; }
    .card { padding: 19px; }
    .card h3 { margin: 4px 0 9px; }
    .decision-grid { display: grid; gap: 10px; }
    .decision-grid article { padding: 13px; }
    .decision-grid span, .decision-grid small { display: block; color: #667085; }
    .decision-grid strong { display: block; margin: 5px 0; line-height: 1.45; }
    code { background: #eef2f7; padding: 2px 5px; border-radius: 5px; word-break: break-all; }
    .candidate { margin-top: 15px; padding: 20px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 16px; }
    .candidate h3 { margin: 4px 0 7px; }
    .button { display: inline-block; margin-top: 10px; text-decoration: none; background: #1d4ed8; color: white; padding: 10px 14px; border-radius: 9px; font-weight: 820; }
    .evidence { margin-top: 15px; padding: 18px; }
    .evidence.good { border-left: 4px solid #16a34a; }
    .evidence.pending { border-left: 4px solid #f59e0b; }
    dl { display: grid; gap: 9px; }
    dl div { display: grid; grid-template-columns: 150px 1fr; gap: 10px; }
    dt { color: #667085; }
    dd { margin: 0; }
    .nonclaim { margin-top: 15px; padding: 17px; border-left: 4px solid #f59e0b; background: #fffbeb; border-radius: 12px; }
    .nonclaim p { margin: 5px 0 0; color: #475467; }
    footer { background: #111827; color: #cbd5e1; padding: 15px 24px; display: flex; justify-content: space-between; gap: 14px; }
    @media (max-width: 980px) { .flow { grid-template-columns: repeat(3, 1fr); } }
    @media (max-width: 760px) { .top { padding: 22px 18px; } main { padding: 14px; } .flow, .grid-2 { grid-template-columns: 1fr; } dl div { grid-template-columns: 1fr; gap: 3px; } footer { flex-direction: column; } }
  </style>
</head>
<body>
  <header class="top">
    <span class="eyebrow">Representation Router · Implementation Runner</span>
    <h1>From authored brief to generated candidate</h1>
    <p>The runner validates a revision-bound brief, routes it to a supported implementation adapter and runtime, exposes the plan before generation, and builds a candidate without giving the browser repository authority.</p>
    <div class="status-row">
      <span class="status">Brief ${escapeHtml(plan.briefSchemaVersion)}</span>
      <span class="status">Adapter ${escapeHtml(plan.adapter.id)}</span>
      <span class="status">Runtime ${escapeHtml(plan.runtime.id)}</span>
      <span class="status">Candidate generated</span>
      <span class="status">Human review ${receipt ? escapeHtml(receipt.humanReview.status) : "pending"}</span>
    </div>
  </header>

  <main>
    <section class="hero">
      <span class="eyebrow">Checkpoint question</span>
      <h2>Can this supported feature brief become a trustworthy candidate through the same runner core?</h2>
      <p>${escapeHtml(brief.outcome)}</p>
    </section>

    <section class="flow" aria-label="Implementation runner path">
      <article class="step"><span>1</span><strong>Brief</strong><p>Exact baseline and typed feature decisions.</p></article>
      <article class="step"><span>2</span><strong>Route</strong><p>Choose a registered implementation adapter/runtime or abstain.</p></article>
      <article class="step"><span>3</span><strong>Plan</strong><p>Show behavior changes, fixed constraints, files, and checks.</p></article>
      <article class="step"><span>4</span><strong>Generate</strong><p>Build candidate-spec and the selected candidate runtime.</p></article>
      <article class="step"><span>5</span><strong>Verify</strong><p>Execution evidence belongs to an exact CI run.</p></article>
      <article class="step pending"><span>6</span><strong>Human review</strong><p>Usefulness and acceptance remain human decisions.</p></article>
    </section>

    <section class="grid-2">
      <article class="card">
        <span class="eyebrow">Dry-run plan</span>
        <h3>What the selected adapter intends to change</h3>
        <div class="decision-grid">${behavior}</div>
      </article>
      <article class="card">
        <span class="eyebrow">Fixed authority boundaries</span>
        <h3>What the adapter is not allowed to widen</h3>
        <ul>${constraints}</ul>
        <p>Baseline: ${code(plan.baselineRevision)}</p>
      </article>
    </section>

    <section class="grid-2">
      <article class="card"><span class="eyebrow">Generated workspace</span><h3>Files produced by apply/build</h3><ul>${files}</ul></article>
      <article class="card"><span class="eyebrow">Planned verification</span><h3>Checks attached to this plan</h3><ul>${checks}</ul><p>These names are definitions until an exact CI run records them as executed.</p></article>
    </section>

    <section class="candidate">
      <span class="eyebrow">Generated candidate</span>
      <h3>Open the candidate built from candidate-spec/v0</h3>
      <p>Adapter <strong>${escapeHtml(candidateSpec.adapterId)}</strong> v${escapeHtml(candidateSpec.adapterVersion)} selected runtime <strong>${escapeHtml(candidateSpec.runtimeId)}</strong>. The runtime reads the generated spec rather than a separately hand-authored proving candidate.</p>
      <a class="button" href="candidate/index.html">Open generated candidate →</a>
    </section>

    ${renderEvidence(receipt)}

    <div class="nonclaim"><strong>What this checkpoint does not prove</strong><p>Two supported feature adapters prove multi-feature routing, not universal implementation. Unknown features still abstain, unsupported decisions still fail visibly, and the task-first engineering home remains a later checkpoint.</p></div>
  </main>

  <footer><span>Implementation plan ≠ executed evidence.</span><span>Generated candidate ≠ human acceptance.</span></footer>
</body>
</html>`;
}
