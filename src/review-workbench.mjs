const escapeHtml = (value = "") => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");

const stateLabel = (state) => ({
  complete: "Complete",
  passed: "Passed",
  covered: "Covered",
  observed: "Observed",
  "needs-review": "Needs human review",
  "needs-human-review": "Needs human review",
  partial: "Partial"
}[state] ?? state);

function renderStatus(status) {
  return status.map(item => `
    <button class="status-chip state-${escapeHtml(item.state)}" data-select-type="status" data-select-id="${escapeHtml(item.id)}">
      <span class="status-dot" aria-hidden="true"></span>
      <span><strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(stateLabel(item.state))}</small></span>
    </button>`).join("");
}

function renderStory(concepts) {
  return `<div class="story" aria-label="Change story">
    ${concepts.map((item, index) => `
      <button class="story-card" data-select-type="concept" data-select-id="${escapeHtml(item.id)}">
        <span class="step-index">${index + 1}</span>
        <span class="eyebrow">${escapeHtml(item.eyebrow)}</span>
        <strong>${escapeHtml(item.title)}</strong>
        <span>${escapeHtml(item.summary)}</span>
      </button>
      ${index < concepts.length - 1 ? '<span class="flow-arrow" aria-hidden="true">→</span>' : ''}`
    ).join("")}
  </div>`;
}

function renderArchitecture(items) {
  return `<div class="architecture-flow" aria-label="Architecture responsibility flow">
    ${items.map((item, index) => `
      <button class="architecture-card" data-select-type="architecture" data-select-id="${escapeHtml(item.id)}">
        <span class="owner">${escapeHtml(item.owner)}</span>
        <strong>${escapeHtml(item.title)}</strong>
        <span>${escapeHtml(item.summary)}</span>
      </button>
      ${item.relation ? `<div class="architecture-relation" aria-hidden="true"><span>${escapeHtml(item.relation)}</span><b>↓</b></div>` : ''}`
    ).join("")}
  </div>`;
}

function renderRequirements(rows) {
  return `<div class="table-wrap"><table class="trace-table">
    <thead><tr><th>Obligation</th><th>Question</th><th>Status</th><th>Implementation</th><th>Evidence</th></tr></thead>
    <tbody>${rows.map(row => `
      <tr>
        <td><button class="row-link" data-select-type="requirement" data-select-id="${escapeHtml(row.id)}"><strong>${escapeHtml(row.id)}</strong> ${escapeHtml(row.title)}</button></td>
        <td>${escapeHtml(row.question)}</td>
        <td><span class="badge state-${escapeHtml(row.state)}">${escapeHtml(stateLabel(row.state))}</span></td>
        <td>${row.implementation.map(item => `<code>${escapeHtml(item)}</code>`).join("<br>")}</td>
        <td>${row.evidence.map(item => `<span class="evidence-line">${escapeHtml(item)}</span>`).join("")}</td>
      </tr>`).join("")}</tbody>
  </table></div>`;
}

function renderEvidence(items) {
  return `<div class="evidence-grid">${items.map(item => `
    <article class="evidence-card">
      <button class="evidence-title" data-select-type="evidence" data-select-id="${escapeHtml(item.id)}">
        <span class="badge state-${escapeHtml(item.state)}">${escapeHtml(stateLabel(item.state))}</span>
        <strong>${escapeHtml(item.title)}</strong>
      </button>
      <div class="evidence-columns">
        <div><h3>What this proves</h3><ul>${item.proves.map(text => `<li>${escapeHtml(text)}</li>`).join("")}</ul></div>
        <div><h3>What this does not prove</h3><ul>${item.doesNotProve.map(text => `<li>${escapeHtml(text)}</li>`).join("")}</ul></div>
      </div>
    </article>`).join("")}</div>`;
}

function renderReview(review, reviewQuestion) {
  return `<div class="review-layout">
    <section class="review-card">
      <span class="eyebrow">Current checkpoint</span>
      <h2>${escapeHtml(review.headline)}</h2>
      <div class="checklist">${review.items.map((item, index) => `
        <button class="check-row" data-select-type="review" data-select-id="review-${index}">
          <span class="check-icon state-${escapeHtml(item.state)}" aria-hidden="true">${item.state === "needs-review" ? "?" : "✓"}</span>
          <span>${escapeHtml(item.label)}</span>
          <span class="badge state-${escapeHtml(item.state)}">${escapeHtml(stateLabel(item.state))}</span>
        </button>`).join("")}</div>
    </section>
    <section class="human-checkpoint">
      <span class="eyebrow">Your review question</span>
      <h2>${escapeHtml(reviewQuestion)}</h2>
      <p>This is the evidence we do not have from automated checks. Your judgment is the readout for comprehension and usefulness.</p>
    </section>
    <section class="nonclaims">
      <h2>What this surface is not claiming</h2>
      <ul>${review.nonclaims.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    </section>
  </div>`;
}

function serializeModel(model) {
  return JSON.stringify(model).replaceAll("<", "\\u003c").replaceAll("\u2028", "\\u2028").replaceAll("\u2029", "\\u2029");
}

export function validateReviewWorkbenchModel(model) {
  if (!model || typeof model !== "object") throw new Error("Review workbench model is required.");
  if (model.schemaVersion !== "review-workbench/v0") throw new Error("Unsupported review workbench schemaVersion.");
  for (const key of ["id", "title", "outcome", "reviewQuestion"]) {
    if (typeof model[key] !== "string" || !model[key].trim()) throw new Error(`${key} is required.`);
  }
  for (const key of ["status", "sources", "concepts", "architecture", "requirements", "evidence", "lenses"]) {
    if (!Array.isArray(model[key]) || model[key].length === 0) throw new Error(`${key} must be a non-empty array.`);
  }
  const sourceIds = new Set(model.sources.map(source => source.id));
  if (sourceIds.size !== model.sources.length) throw new Error("Source ids must be unique.");
  const assertSources = (items, label) => items.forEach(item => (item.sourceIds ?? []).forEach(sourceId => {
    if (!sourceIds.has(sourceId)) throw new Error(`${label} ${item.id} references unknown source: ${sourceId}`);
  }));
  assertSources(model.concepts, "concept");
  assertSources(model.architecture, "architecture");
  assertSources(model.requirements, "requirement");
  assertSources(model.evidence, "evidence");
  if (!model.review || !Array.isArray(model.review.items) || !Array.isArray(model.review.nonclaims)) throw new Error("review contract is required.");
  if (!model.subject?.mergeRevision || !model.subject?.verifiedHeadRevision || !model.subject?.ciRun) throw new Error("Exact subject revisions and CI run are required.");
  return model;
}

export function renderReviewWorkbench(input) {
  const model = validateReviewWorkbenchModel(input);
  const modelJson = serializeModel(model);
  const firstConcept = model.concepts[0];
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>${escapeHtml(model.title)}</title>
<style>
:root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.45;color:#172033;background:#f4f6f9;--paper:#fff;--ink:#172033;--muted:#667085;--line:#d6dbe4;--soft:#f8fafc;--accent:#3457d5;--accent-soft:#eef2ff;--good:#176b47;--good-soft:#e8f6ef;--warn:#8a5a00;--warn-soft:#fff6db;--shadow:0 8px 30px rgba(23,32,51,.08)}
*{box-sizing:border-box}body{margin:0;background:linear-gradient(180deg,#eef2f7 0,#f8fafc 260px);color:var(--ink)}button,a{font:inherit}button{color:inherit}.shell{max-width:1500px;margin:0 auto;padding:22px}.topbar{background:var(--paper);border:1px solid var(--line);border-radius:20px;padding:22px;box-shadow:var(--shadow)}.topline{display:flex;justify-content:space-between;gap:20px;align-items:flex-start}.kicker,.eyebrow{font-size:.76rem;text-transform:uppercase;letter-spacing:.09em;font-weight:750;color:var(--accent)}h1{font-size:clamp(1.8rem,3vw,3rem);line-height:1.05;margin:.25rem 0 .6rem}.subtitle{font-size:1.05rem;color:var(--muted);max-width:900px;margin:0}.revision{font-size:.82rem;color:var(--muted);text-align:right}.revision code{display:block;color:var(--ink);font-size:.78rem}.status-strip{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:20px}.status-chip{display:flex;gap:10px;text-align:left;border:1px solid var(--line);background:var(--soft);border-radius:12px;padding:12px;cursor:pointer}.status-chip:hover,.status-chip:focus-visible{border-color:var(--accent);outline:none}.status-chip small{display:block;color:var(--muted);margin-top:2px}.status-dot{width:10px;height:10px;border-radius:999px;background:#98a2b3;margin-top:5px;flex:0 0 auto}.state-complete .status-dot,.state-passed .status-dot{background:var(--good)}.state-needs-review .status-dot{background:var(--warn)}.outcome{display:grid;grid-template-columns:minmax(0,2fr) minmax(260px,1fr);gap:14px;margin-top:14px}.outcome-card,.question-card{border-radius:14px;padding:16px;border:1px solid var(--line)}.outcome-card{background:#19233a;color:white}.outcome-card .eyebrow{color:#c9d4ff}.outcome-card p{font-size:1.08rem;margin:.4rem 0 0}.question-card{background:var(--warn-soft);border-color:#ecd89a}.question-card strong{display:block;margin-top:5px}.tabs{display:flex;gap:6px;overflow:auto;margin:18px 0 12px;padding:4px}.tab{border:1px solid transparent;background:transparent;padding:10px 14px;border-radius:10px;white-space:nowrap;cursor:pointer;font-weight:700;color:var(--muted)}.tab[aria-selected="true"]{background:var(--paper);border-color:var(--line);box-shadow:0 2px 10px rgba(23,32,51,.07);color:var(--ink)}.tab:focus-visible{outline:3px solid rgba(52,87,213,.25)}.workspace-grid{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:14px;align-items:start}.main-panel,.inspector{background:var(--paper);border:1px solid var(--line);border-radius:18px;box-shadow:var(--shadow)}.main-panel{padding:20px;min-height:620px}.lens-head{display:flex;justify-content:space-between;gap:20px;align-items:end;margin-bottom:18px}.lens-head h2{margin:.25rem 0 0;font-size:1.5rem}.lens-head p{margin:0;color:var(--muted);max-width:600px}.panel[hidden]{display:none}.story{display:flex;align-items:stretch;gap:9px;overflow:auto;padding:8px 2px 14px}.story-card{min-width:180px;max-width:220px;flex:1;border:1px solid var(--line);border-radius:14px;background:var(--soft);padding:14px;text-align:left;cursor:pointer}.story-card:hover,.story-card:focus-visible,.architecture-card:hover,.architecture-card:focus-visible{border-color:var(--accent);background:var(--accent-soft);outline:none}.story-card strong,.story-card span{display:block}.story-card strong{font-size:1.03rem;margin:.25rem 0 .45rem}.story-card span:last-child{font-size:.88rem;color:var(--muted)}.step-index{display:inline-grid!important;place-items:center;width:24px;height:24px;border-radius:99px;background:#172033;color:white;font-size:.76rem}.flow-arrow{align-self:center;color:#98a2b3;font-size:1.4rem}.architecture-flow{max-width:800px;margin:0 auto}.architecture-card{display:grid;grid-template-columns:160px 1fr;gap:14px;width:100%;text-align:left;border:1px solid var(--line);background:var(--soft);border-radius:14px;padding:15px;cursor:pointer}.architecture-card strong{font-size:1.05rem}.architecture-card span:last-child{color:var(--muted)}.owner{font-size:.78rem;font-weight:750;color:var(--accent)}.architecture-relation{text-align:center;color:var(--muted);padding:5px}.architecture-relation span{display:block;font-size:.75rem;text-transform:uppercase;letter-spacing:.06em}.table-wrap{overflow:auto;border:1px solid var(--line);border-radius:14px}.trace-table{border-collapse:collapse;width:100%;min-width:920px;font-size:.86rem}.trace-table th,.trace-table td{border-bottom:1px solid var(--line);padding:12px;vertical-align:top;text-align:left}.trace-table th{position:sticky;top:0;background:#f2f4f7;color:#475467;font-size:.75rem;text-transform:uppercase;letter-spacing:.04em}.row-link,.evidence-title{border:0;background:transparent;padding:0;text-align:left;cursor:pointer;color:var(--ink)}.row-link:hover,.row-link:focus-visible,.evidence-title:hover,.evidence-title:focus-visible{color:var(--accent);outline:none}.trace-table code{font-size:.77rem;white-space:normal}.evidence-line{display:block;margin-bottom:3px}.badge{display:inline-block;border-radius:99px;padding:3px 8px;font-size:.72rem;font-weight:750;background:#eef0f3;color:#475467}.badge.state-complete,.badge.state-passed,.badge.state-covered,.badge.state-observed{background:var(--good-soft);color:var(--good)}.badge.state-needs-review,.badge.state-needs-human-review{background:var(--warn-soft);color:var(--warn)}.evidence-grid{display:grid;gap:12px}.evidence-card{border:1px solid var(--line);border-radius:14px;padding:15px;background:var(--soft)}.evidence-title{display:flex;gap:10px;align-items:center}.evidence-title strong{font-size:1.05rem}.evidence-columns{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:12px}.evidence-columns h3{font-size:.78rem;text-transform:uppercase;letter-spacing:.05em;margin:0 0 6px;color:var(--muted)}.evidence-columns ul{margin:0;padding-left:19px}.review-layout{display:grid;grid-template-columns:1.3fr .9fr;gap:14px}.review-card,.human-checkpoint,.nonclaims{border:1px solid var(--line);border-radius:14px;padding:18px}.review-card h2,.human-checkpoint h2,.nonclaims h2{margin:.35rem 0 .8rem}.checklist{display:grid;gap:6px}.check-row{display:grid;grid-template-columns:26px 1fr auto;gap:9px;align-items:center;width:100%;border:1px solid var(--line);border-radius:10px;background:var(--soft);padding:10px;text-align:left;cursor:pointer}.check-row:hover,.check-row:focus-visible{outline:none;border-color:var(--accent)}.check-icon{display:grid;place-items:center;width:22px;height:22px;border-radius:99px;background:var(--good-soft);color:var(--good);font-weight:800}.check-icon.state-needs-review{background:var(--warn-soft);color:var(--warn)}.human-checkpoint{background:var(--warn-soft);border-color:#ecd89a}.human-checkpoint p{color:#6f5315}.nonclaims{grid-column:1/-1;background:#f8fafc}.nonclaims ul{columns:2;margin-bottom:0}.inspector{position:sticky;top:14px;overflow:hidden}.inspector-head{background:#172033;color:white;padding:17px}.inspector-head .eyebrow{color:#b7c4ff}.inspector-head h2{margin:.35rem 0 0}.inspector-body{padding:17px}.inspector-body p{color:#475467}.source-links{display:grid;gap:8px;margin-top:16px}.source-link{display:block;text-decoration:none;border:1px solid var(--line);border-radius:10px;padding:10px;color:var(--ink);background:var(--soft)}.source-link:hover,.source-link:focus-visible{outline:none;border-color:var(--accent)}.source-link small{display:block;color:var(--muted);margin-top:3px}.source-role{font-size:.7rem;text-transform:uppercase;letter-spacing:.05em;color:var(--accent);font-weight:750}.inspector-empty{color:var(--muted)}.footer{padding:18px 4px;color:var(--muted);font-size:.82rem;display:flex;justify-content:space-between;gap:16px}.footer code{color:var(--ink)}
@media(max-width:980px){.status-strip{grid-template-columns:1fr 1fr}.outcome{grid-template-columns:1fr}.workspace-grid{grid-template-columns:1fr}.inspector{position:relative;top:auto}.main-panel{min-height:0}.review-layout{grid-template-columns:1fr}.nonclaims ul{columns:1}}
@media(max-width:640px){.shell{padding:10px}.topbar{padding:16px;border-radius:14px}.topline{display:block}.revision{text-align:left;margin-top:12px}.status-strip{grid-template-columns:1fr}.main-panel{padding:14px}.story{display:grid;overflow:visible}.story-card{max-width:none;width:100%}.flow-arrow{transform:rotate(90deg);justify-self:center}.architecture-card{grid-template-columns:1fr}.evidence-columns{grid-template-columns:1fr}.lens-head{display:block}.lens-head p{margin-top:6px}.footer{display:block}}
@media(prefers-color-scheme:dark){:root{color:#e8edf7;background:#0e1422;--paper:#151d2d;--ink:#e8edf7;--muted:#9aa6ba;--line:#2c384d;--soft:#101827;--accent:#8ea6ff;--accent-soft:#1e2a4d;--good:#72d7a5;--good-soft:#123527;--warn:#f2c76b;--warn-soft:#33280e;--shadow:none}body{background:#0e1422}.outcome-card,.inspector-head{background:#090f1b}.trace-table th{background:#101827}.human-checkpoint p{color:#d7b86e}}
</style>
</head>
<body>
<div class="shell">
  <header class="topbar">
    <div class="topline">
      <div><span class="kicker">Review Workbench v0</span><h1>${escapeHtml(model.title)}</h1><p class="subtitle">${escapeHtml(model.subtitle)}</p></div>
      <div class="revision">Merged subject<code>${escapeHtml(model.subject.mergeRevision.slice(0, 12))}</code>Verified head<code>${escapeHtml(model.subject.verifiedHeadRevision.slice(0, 12))}</code></div>
    </div>
    <div class="status-strip">${renderStatus(model.status)}</div>
    <div class="outcome">
      <div class="outcome-card"><span class="eyebrow">Outcome</span><p>${escapeHtml(model.outcome)}</p></div>
      <div class="question-card"><span class="eyebrow">Open checkpoint</span><strong>${escapeHtml(model.reviewQuestion)}</strong></div>
    </div>
  </header>

  <nav class="tabs" role="tablist" aria-label="Review lenses">
    ${model.lenses.map((lens, index) => `<button class="tab" role="tab" id="tab-${escapeHtml(lens.id)}" aria-controls="panel-${escapeHtml(lens.id)}" aria-selected="${index === 0 ? "true" : "false"}" tabindex="${index === 0 ? "0" : "-1"}" data-lens="${escapeHtml(lens.id)}">${escapeHtml(lens.label)}</button>`).join("")}
  </nav>

  <div class="workspace-grid">
    <main class="main-panel">
      ${model.lenses.map((lens, index) => `<section class="panel" id="panel-${escapeHtml(lens.id)}" role="tabpanel" aria-labelledby="tab-${escapeHtml(lens.id)}" ${index === 0 ? "" : "hidden"}>
        <div class="lens-head"><div><span class="eyebrow">${escapeHtml(lens.label)} lens</span><h2>${escapeHtml(lens.description)}</h2></div><p>${lens.id === "change" ? "Select any stage to inspect its reasoning and exact sources." : lens.id === "architecture" ? "Ownership stays visible so the representation layer cannot silently become domain authority." : lens.id === "requirements" ? "Coverage is shown per obligation instead of flattened into one completion percentage." : lens.id === "evidence" ? "Every proof sits next to its limitations." : "Technical completion is visible, but your comprehension/usefulness judgment remains separate."}</p></div>
        ${lens.id === "change" ? renderStory(model.concepts) : lens.id === "architecture" ? renderArchitecture(model.architecture) : lens.id === "requirements" ? renderRequirements(model.requirements) : lens.id === "evidence" ? renderEvidence(model.evidence) : renderReview(model.review, model.reviewQuestion)}
      </section>`).join("")}
    </main>

    <aside class="inspector" aria-live="polite" aria-label="Selected detail">
      <div class="inspector-head"><span class="eyebrow" id="inspectorEyebrow">${escapeHtml(firstConcept.eyebrow)}</span><h2 id="inspectorTitle">${escapeHtml(firstConcept.title)}</h2></div>
      <div class="inspector-body"><p id="inspectorSummary">${escapeHtml(firstConcept.summary)}</p><p id="inspectorDetail">${escapeHtml(firstConcept.detail)}</p><div id="inspectorSources" class="source-links"></div></div>
    </aside>
  </div>

  <footer class="footer"><span>Source truth: ${escapeHtml(model.subject.repository)} · PR #22 · CI ${escapeHtml(model.subject.ciRun)}</span><span>Merge <code>${escapeHtml(model.subject.mergeRevision)}</code></span></footer>
</div>
<script>window.__REVIEW_WORKBENCH_MODEL__=${modelJson};</script>
<script>
(()=>{
  const model=window.__REVIEW_WORKBENCH_MODEL__;
  const sources=Object.fromEntries(model.sources.map(item=>[item.id,item]));
  const byType={
    concept:Object.fromEntries(model.concepts.map(item=>[item.id,item])),
    architecture:Object.fromEntries(model.architecture.map(item=>[item.id,item])),
    requirement:Object.fromEntries(model.requirements.map(item=>[item.id,item])),
    evidence:Object.fromEntries(model.evidence.map(item=>[item.id,item])),
    status:Object.fromEntries(model.status.map(item=>[item.id,{...item,title:item.label,eyebrow:'Current status',summary:item.detail,detail:'State: '+item.state,sourceIds:[]}]))
  };
  byType.review=Object.fromEntries(model.review.items.map((item,index)=>['review-'+index,{...item,id:'review-'+index,title:item.label,eyebrow:'Review checkpoint',summary:'State: '+item.state,detail:item.state==='needs-review'?model.reviewQuestion:'This technical checkpoint is complete.',sourceIds:item.state==='passed'?['ci']:[]} ]));
  const title=document.getElementById('inspectorTitle'),eyebrow=document.getElementById('inspectorEyebrow'),summary=document.getElementById('inspectorSummary'),detail=document.getElementById('inspectorDetail'),sourceBox=document.getElementById('inspectorSources');
  const renderSources=(ids=[])=>{sourceBox.innerHTML=ids.map(id=>sources[id]).filter(Boolean).map(source=>'<a class="source-link" href="'+source.url+'" target="_blank" rel="noreferrer"><span class="source-role">'+source.role+'</span><strong>'+source.label+'</strong><small>'+source.note+'</small></a>').join('')||'<p class="inspector-empty">No additional source link for this summary item.</p>';};
  const select=(type,id)=>{const item=byType[type]?.[id];if(!item)return;eyebrow.textContent=item.eyebrow||type;title.textContent=item.title||item.label||id;summary.textContent=item.summary||item.question||item.detail||'';detail.textContent=item.detail||('Status: '+(item.state||'recorded'));renderSources(item.sourceIds||[]);};
  document.addEventListener('click',event=>{const target=event.target.closest('[data-select-id]');if(target)select(target.dataset.selectType,target.dataset.selectId);});
  const tabs=[...document.querySelectorAll('[role="tab"]')];
  const activate=(tab,focus=false)=>{tabs.forEach(item=>{const active=item===tab;item.setAttribute('aria-selected',String(active));item.tabIndex=active?0:-1;document.getElementById(item.getAttribute('aria-controls')).hidden=!active;});if(focus)tab.focus();};
  tabs.forEach((tab,index)=>{tab.addEventListener('click',()=>activate(tab));tab.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();let next=index;if(event.key==='ArrowLeft')next=(index-1+tabs.length)%tabs.length;if(event.key==='ArrowRight')next=(index+1)%tabs.length;if(event.key==='Home')next=0;if(event.key==='End')next=tabs.length-1;activate(tabs[next],true);});});
  renderSources(${JSON.stringify(firstConcept.sourceIds ?? [])});
})();
</script>
</body>
</html>`;
}
