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

function checkRows(observation) {
  return observation.checks.map((check) => `<div class="check"><span>✓</span><div><strong>${escapeHtml(check.path)}</strong><small>HTTP ${escapeHtml(check.httpStatus)} · ${escapeHtml(check.assertion)}</small></div></div>`).join("");
}

export function renderReleaseOperateSurface({ intent, plan, deployment, deployedObservation, rollback, rollbackObservation, finalDeployment, finalObservation, finalSnapshot }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Representation Router · Release + Operate</title>
  <style>
    :root { font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color:#172033; background:#f5f7fb; }
    * { box-sizing:border-box; }
    body { margin:0; min-width:320px; }
    .top { background:#111827; color:white; padding:29px 32px 25px; }
    .eyebrow { text-transform:uppercase; letter-spacing:.11em; font-size:.72rem; font-weight:850; color:#667085; }
    .top .eyebrow { color:#93c5fd; }
    h1 { margin:6px 0 9px; font-size:clamp(1.8rem,4vw,2.8rem); }
    .top p { margin:0; max-width:930px; color:#cbd5e1; line-height:1.6; }
    .status-row { display:flex; flex-wrap:wrap; gap:9px; margin-top:18px; }
    .status { border:1px solid rgba(255,255,255,.18); border-radius:999px; padding:7px 10px; font-size:.82rem; }
    main { max-width:1220px; margin:0 auto; padding:24px; }
    .flow { display:grid; grid-template-columns:repeat(6,minmax(0,1fr)); gap:9px; margin-bottom:18px; }
    .step,.card,.evidence,.warning { background:white; border:1px solid #dde3ec; border-radius:15px; box-shadow:0 7px 22px rgba(15,23,42,.05); }
    .step { padding:13px; border-top:4px solid #2563eb; }
    .step strong,.step small { display:block; }
    .step small { color:#667085; margin-top:5px; line-height:1.4; }
    .grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:15px; margin-top:15px; }
    .card { padding:19px; }
    .card h2,.card h3 { margin:5px 0 9px; }
    .card p,.card li { color:#475467; line-height:1.55; }
    code { background:#eef2f7; padding:2px 5px; border-radius:5px; word-break:break-all; }
    dl { display:grid; gap:9px; }
    dl div { display:grid; grid-template-columns:160px 1fr; gap:10px; padding-bottom:8px; border-bottom:1px solid #edf0f4; }
    dt { color:#667085; } dd { margin:0; }
    .evidence { padding:19px; border-left:4px solid #16a34a; margin-top:15px; }
    .evidence h3 { margin:4px 0 9px; }
    .check { display:flex; gap:10px; align-items:flex-start; padding:8px 0; }
    .check > span { display:grid; place-items:center; width:24px; height:24px; border-radius:50%; background:#dcfce7; color:#166534; font-weight:900; flex:none; }
    .check small { display:block; color:#667085; margin-top:2px; }
    .warning { margin-top:15px; padding:17px; border-left:4px solid #f59e0b; background:#fffbeb; }
    .warning strong { display:block; margin-bottom:5px; }
    .warning p { margin:0; color:#475467; line-height:1.55; }
    .truth { margin-top:15px; padding:17px; border-left:4px solid #8b5cf6; background:#f5f3ff; border-radius:12px; color:#5b21b6; }
    footer { background:#111827; color:#cbd5e1; padding:15px 24px; display:flex; justify-content:space-between; gap:14px; }
    @media (max-width:900px) { .flow { grid-template-columns:repeat(3,1fr); } }
    @media (max-width:760px) { .top{padding:23px 18px} main{padding:14px} .flow,.grid{grid-template-columns:1fr} dl div{grid-template-columns:1fr;gap:3px} footer{flex-direction:column} }
  </style>
</head>
<body>
<header class="top">
  <span class="eyebrow">Representation Router · Release + Operate Loop v0</span>
  <h1>Release it safely, prove what happened, keep rollback real</h1>
  <p>This checkpoint releases the Engineering Home only into a repository-owned CI staging sandbox. It records exact bytes, observes the staged files over HTTP, proves rollback, then restores the intended release. Production is not connected or authorized.</p>
  <div class="status-row"><span class="status">Staging deployed</span><span class="status">HTTP observations passed</span><span class="status">Rollback proved</span><span class="status">Final release re-applied</span><span class="status">Human review pending</span></div>
</header>
<main>
  <section class="flow" aria-label="Release lifecycle">
    <article class="step"><strong>1 · Intent</strong><small>Name the exact artifact and target.</small></article>
    <article class="step"><strong>2 · Authority</strong><small>Confirm who may deploy where.</small></article>
    <article class="step"><strong>3 · Deploy</strong><small>Copy exact bytes and verify hashes.</small></article>
    <article class="step"><strong>4 · Observe</strong><small>Serve staging and make runtime checks.</small></article>
    <article class="step"><strong>5 · Roll back</strong><small>Restore the retained previous snapshot.</small></article>
    <article class="step"><strong>6 · Re-apply</strong><small>Put the intended release back and observe again.</small></article>
  </section>

  <section class="grid">
    <article class="card"><span class="eyebrow">What are we releasing?</span><h2>Engineering Home v0</h2><p>The exact bundle generated by the current CI job, including its bundled engineering workspaces.</p><dl><div><dt>Release ID</dt><dd>${code(intent.releaseId)}</dd></div><div><dt>Source bundle</dt><dd>${code(plan.subject.snapshot.bundleSha256)}</dd></div><div><dt>Final staged bundle</dt><dd>${code(finalSnapshot.bundleSha256)}</dd></div></dl></article>
    <article class="card"><span class="eyebrow">Where is it going?</span><h2>CI staging sandbox</h2><p>${escapeHtml(intent.target.owner)}</p><dl><div><dt>Target</dt><dd>${code(intent.target.id)}</dd></div><div><dt>Environment</dt><dd>${escapeHtml(intent.target.environmentClass)}</dd></div><div><dt>Effect</dt><dd>Ephemeral repository-owned staging only</dd></div></dl></article>
  </section>

  <section class="card" style="margin-top:15px"><span class="eyebrow">Who is allowed to do this?</span><h2>Repository CI owns this staging effect</h2><dl><div><dt>Actor</dt><dd>${escapeHtml(intent.authority.actor)}</dd></div><div><dt>Basis</dt><dd>${escapeHtml(intent.authority.basis)}</dd></div><div><dt>Scope</dt><dd>${escapeHtml(intent.authority.scope)}</dd></div></dl><div class="warning"><strong>Production is not connected</strong><p>No production credentials, target, approval policy, or rollback authority exists in this checkpoint. A successful staging proof does not grant any of them.</p></div></section>

  <section class="grid">
    <article class="card"><span class="eyebrow">What actually deployed?</span><h2>Exact bytes matched</h2><p>${escapeHtml(deployment.statement)}</p><dl><div><dt>Source</dt><dd>${code(deployment.sourceBundleSha256)}</dd></div><div><dt>Deployed</dt><dd>${code(deployment.deployedBundleSha256)}</dd></div><div><dt>Transition</dt><dd>${escapeHtml(deployment.transition)}</dd></div></dl></article>
    <article class="card"><span class="eyebrow">Did rollback work?</span><h2>Previous staging bytes were restored</h2><p>${escapeHtml(rollback.statement)}</p><dl><div><dt>Released</dt><dd>${code(rollback.fromBundleSha256)}</dd></div><div><dt>Restored</dt><dd>${code(rollback.restoredBundleSha256)}</dd></div><div><dt>Matches previous</dt><dd>${rollback.hashMatch ? "yes" : "no"}</dd></div></dl></article>
  </section>

  <section class="evidence"><span class="eyebrow">What did we observe after deployment?</span><h3>Staged Engineering Home served successfully</h3>${checkRows(deployedObservation)}</section>
  <section class="evidence"><span class="eyebrow">What did we observe after rollback?</span><h3>The previous entrypoint served after rollback</h3>${checkRows(rollbackObservation)}</section>
  <section class="evidence"><span class="eyebrow">What is true now?</span><h3>The intended Engineering Home release was re-applied and observed again</h3><p>${escapeHtml(finalDeployment.statement)}</p>${checkRows(finalObservation)}</section>

  <div class="warning"><strong>What this does not prove</strong><p>${finalObservation.doesNotProve.map(escapeHtml).join(" · ")} This staging loop also does not establish production deployment authority.</p></div>
  <div class="truth"><strong>Authority truth:</strong> Release + Operate v0 proves a repository-owned staging deployment/observation/rollback workflow. Product-owned production release remains a separate future integration.</div>

  <details class="card" style="margin-top:15px"><summary><strong>Technical details</strong></summary><dl><div><dt>Plan schema</dt><dd>${code(plan.schemaVersion)}</dd></div><div><dt>Deployment schema</dt><dd>${code(deployment.schemaVersion)}</dd></div><div><dt>Observation schema</dt><dd>${code(deployedObservation.schemaVersion)}</dd></div><div><dt>Rollback schema</dt><dd>${code(rollback.schemaVersion)}</dd></div><div><dt>Previous bundle</dt><dd>${code(plan.previous.snapshot.bundleSha256)}</dd></div></dl></details>
</main>
<footer><span>Staging evidence ≠ production evidence.</span><span>Deployment success ≠ human acceptance.</span></footer>
</body>
</html>`;
}
