const esc = (value = "") => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");

const stateLabel = (state) => ({
  complete: "Complete", passed: "Passed", covered: "Covered", observed: "Observed",
  "needs-review": "Needs human review", "needs-human-review": "Needs human review", partial: "Partial"
}[state] ?? state);

function validateBase(model) {
  if (!model || model.schemaVersion !== "review-workbench/v0") throw new Error("review-workbench/v0 model required");
  for (const key of ["sources", "concepts", "requirements", "evidence", "status"]) {
    if (!Array.isArray(model[key]) || model[key].length === 0) throw new Error(`${key} must be non-empty`);
  }
  return model;
}

export function validateArchitecturePack(pack, base) {
  if (!pack || pack.schemaVersion !== "review-workbench-architecture/v1") throw new Error("review-workbench-architecture/v1 model required");
  const sourceIds = new Set(base.sources.map(source => source.id));
  const checkSources = (items, label) => items.forEach(item => (item.sourceIds ?? []).forEach(id => {
    if (!sourceIds.has(id)) throw new Error(`${label} ${item.id} references unknown source ${id}`);
  }));
  const compIds = new Set(pack.component.nodes.map(node => node.id));
  if (compIds.size !== pack.component.nodes.length) throw new Error("component node ids must be unique");
  checkSources(pack.component.nodes, "component node");
  pack.component.edges.forEach(edge => {
    if (!compIds.has(edge.from) || !compIds.has(edge.to)) throw new Error(`component edge ${edge.id} references unknown node`);
  });
  const participants = new Set(pack.sequence.participants.map(item => item.id));
  checkSources(pack.sequence.participants, "sequence participant");
  checkSources(pack.sequence.messages, "sequence message");
  pack.sequence.messages.forEach(message => {
    if (!participants.has(message.from) || !participants.has(message.to)) throw new Error(`sequence message ${message.id} references unknown participant`);
  });
  const states = new Set(pack.state.states.map(item => item.id));
  checkSources(pack.state.states, "state");
  pack.state.transitions.forEach(transition => {
    if (!states.has(transition.from) || !states.has(transition.to)) throw new Error(`state transition ${transition.id} references unknown state`);
  });
  if (pack.state.transitions.some(t => t.from === "verified" && t.to === "accepted")) throw new Error("machine verification may not transition directly to human acceptance");
  return pack;
}

function renderStatus(items) {
  return items.map(item => `<button class="status state-${esc(item.state)}" data-type="status" data-id="${esc(item.id)}"><b>${esc(item.label)}</b><span>${esc(stateLabel(item.state))}</span></button>`).join("");
}

function renderOverview(model) {
  return `<div class="story">${model.concepts.map((item, i) => `<button class="story-node" data-type="concept" data-id="${esc(item.id)}"><i>${i + 1}</i><small>${esc(item.eyebrow)}</small><b>${esc(item.title)}</b><span>${esc(item.summary)}</span></button>${i < model.concepts.length - 1 ? '<span class="story-arrow">→</span>' : ''}`).join("")}</div>`;
}

function componentSvg(component) {
  const nodes = Object.fromEntries(component.nodes.map(node => [node.id, node]));
  const center = node => ({ x: node.x + node.width / 2, y: node.y + node.height / 2 });
  const boundaries = component.boundaries.map(b => `<g><rect class="boundary" x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}" rx="18"/><text class="boundary-label" x="${b.x + 16}" y="${b.y + 24}">${esc(b.label)}</text></g>`).join("");
  const edges = component.edges.map(edge => {
    const a = center(nodes[edge.from]), b = center(nodes[edge.to]);
    return `<g><line class="edge ${edge.style === "dashed" ? "dashed" : ""}" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" marker-end="url(#arrow)"/><text class="edge-label" x="${(a.x+b.x)/2}" y="${(a.y+b.y)/2 - 8}">${esc(edge.label)}</text></g>`;
  }).join("");
  const nodeMarkup = component.nodes.map(node => `<g class="svg-node" role="button" tabindex="0" data-type="component" data-id="${esc(node.id)}"><rect x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" rx="12"/><text class="stereo" x="${node.x+12}" y="${node.y+20}">«${esc(node.stereotype)}»</text><text class="node-title" x="${node.x+12}" y="${node.y+42}">${esc(node.title)}</text><text class="node-owner" x="${node.x+12}" y="${node.y+node.height-14}">${esc(node.owner)}</text></g>`).join("");
  return `<div class="diagram-scroll"><svg class="diagram" viewBox="0 0 1040 540" role="img" aria-label="${esc(component.title)}"><defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z"/></marker></defs>${boundaries}${edges}${nodeMarkup}</svg></div>`;
}

function sequenceSvg(sequence) {
  const width = 1100, left = 80, right = 1020;
  const step = (right - left) / Math.max(1, sequence.participants.length - 1);
  const positions = Object.fromEntries(sequence.participants.map((p, i) => [p.id, left + i * step]));
  const height = 150 + sequence.messages.length * 60;
  const participants = sequence.participants.map((p, i) => {
    const x = positions[p.id];
    return `<g class="svg-node" role="button" tabindex="0" data-type="sequence-participant" data-id="${esc(p.id)}"><rect x="${x-78}" y="24" width="156" height="52" rx="10"/><text class="participant" x="${x}" y="55" text-anchor="middle">${esc(p.label)}</text><line class="lifeline" x1="${x}" y1="76" x2="${x}" y2="${height-25}"/></g>`;
  }).join("");
  const messages = sequence.messages.map((m, i) => {
    const y = 115 + i * 60, x1 = positions[m.from], x2 = positions[m.to], mid = (x1+x2)/2;
    return `<g class="sequence-message" role="button" tabindex="0" data-type="sequence-message" data-id="${esc(m.id)}"><line class="message-line" x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" marker-end="url(#seqArrow)"/><rect class="message-bg" x="${Math.min(x1,x2)+10}" y="${y-25}" width="${Math.max(90,Math.abs(x2-x1)-20)}" height="21" rx="5"/><text class="message-label" x="${mid}" y="${y-10}" text-anchor="middle">${esc(m.label)}</text><text class="message-num" x="${Math.min(x1,x2)+4}" y="${y+18}">${i+1}</text></g>`;
  }).join("");
  return `<div class="diagram-scroll"><svg class="diagram sequence" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(sequence.title)}"><defs><marker id="seqArrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z"/></marker></defs>${participants}${messages}</svg></div>`;
}

function stateSvg(state) {
  const states = Object.fromEntries(state.states.map(item => [item.id, item]));
  const center = item => ({ x: item.x + item.width/2, y: item.y + item.height/2 });
  const transitions = state.transitions.map(t => {
    const a = center(states[t.from]), b = center(states[t.to]);
    return `<g><line class="edge state-edge" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" marker-end="url(#stateArrow)"/><rect class="transition-bg" x="${(a.x+b.x)/2-72}" y="${(a.y+b.y)/2-22}" width="144" height="18" rx="4"/><text class="edge-label" x="${(a.x+b.x)/2}" y="${(a.y+b.y)/2-9}">${esc(t.label)}</text><text class="authority-label" x="${(a.x+b.x)/2}" y="${(a.y+b.y)/2+11}">${esc(t.authority)}</text></g>`;
  }).join("");
  const nodes = state.states.map(item => `<g class="svg-node state-node ${esc(item.kind)}" role="button" tabindex="0" data-type="state" data-id="${esc(item.id)}"><rect x="${item.x}" y="${item.y}" width="${item.width}" height="${item.height}" rx="${item.kind === "final" ? 34 : 13}"/><text class="node-title" x="${item.x+item.width/2}" y="${item.y+item.height/2-3}" text-anchor="middle">${esc(item.label)}</text><text class="state-kind" x="${item.x+item.width/2}" y="${item.y+item.height/2+17}" text-anchor="middle">${esc(item.kind)}</text></g>`).join("");
  return `<div class="diagram-scroll"><svg class="diagram" viewBox="0 0 940 540" role="img" aria-label="${esc(state.title)}"><defs><marker id="stateArrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z"/></marker></defs>${transitions}${nodes}</svg></div><div class="nonclaim-banner"><b>Guardrail:</b> ${esc(state.nonclaim)}</div>`;
}

function requirementsTable(rows) {
  return `<div class="table-wrap"><table><thead><tr><th>Obligation</th><th>Question</th><th>Status</th><th>Implementation</th><th>Evidence</th></tr></thead><tbody>${rows.map(row => `<tr><td><button class="linklike" data-type="requirement" data-id="${esc(row.id)}"><b>${esc(row.id)}</b> ${esc(row.title)}</button></td><td>${esc(row.question)}</td><td><span class="badge state-${esc(row.state)}">${esc(stateLabel(row.state))}</span></td><td>${row.implementation.map(v => `<code>${esc(v)}</code>`).join("<br>")}</td><td>${row.evidence.map(v => `<span class="evidence-line">${esc(v)}</span>`).join("")}</td></tr>`).join("")}</tbody></table></div>`;
}

function evidenceCards(rows) {
  return `<div class="cards">${rows.map(row => `<article class="evidence-card"><button class="linklike evidence-title" data-type="evidence" data-id="${esc(row.id)}"><span class="badge state-${esc(row.state)}">${esc(stateLabel(row.state))}</span><b>${esc(row.title)}</b></button><div class="split"><div><h3>What this proves</h3><ul>${row.proves.map(v => `<li>${esc(v)}</li>`).join("")}</ul></div><div><h3>What this does not prove</h3><ul>${row.doesNotProve.map(v => `<li>${esc(v)}</li>`).join("")}</ul></div></div></article>`).join("")}</div>`;
}

function reviewPanel(model) {
  return `<div class="review-grid"><section class="review-card"><small class="eyebrow">Technical state</small><h2>${esc(model.review.headline)}</h2>${model.review.items.map((item,i) => `<button class="check" data-type="review" data-id="${i}"><span>${item.state === "needs-review" ? "?" : "✓"}</span><b>${esc(item.label)}</b><em>${esc(stateLabel(item.state))}</em></button>`).join("")}</section><section class="human-card"><small class="eyebrow">Human checkpoint</small><h2>${esc(model.reviewQuestion)}</h2><p>Architecture diagrams are now part of the artifact. The next evidence is whether they improve your understanding rather than merely add visual complexity.</p></section><section class="review-card"><h2>Nonclaims</h2><ul>${model.review.nonclaims.map(v => `<li>${esc(v)}</li>`).join("")}</ul></section></div>`;
}

function serialize(value) { return JSON.stringify(value).replaceAll("<", "\\u003c").replaceAll("\u2028", "\\u2028").replaceAll("\u2029", "\\u2029"); }

export function renderReviewWorkbenchV1(baseInput, architectureInput) {
  const base = validateBase(baseInput), arch = validateArchitecturePack(architectureInput, base);
  const data = serialize({ base, arch });
  const tabs = [
    ["overview","Overview"],["component","Component"],["sequence","Sequence"],["state","State"],["requirements","Requirements"],["evidence","Evidence"],["review","Review"]
  ];
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(base.title)} · Architecture v1</title><style>
:root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#172033;background:#f4f6f9;--paper:#fff;--ink:#172033;--muted:#667085;--line:#d6dbe4;--accent:#3457d5;--accent2:#6b4eff;--good:#176b47;--good-soft:#e8f6ef;--warn:#8a5a00;--warn-soft:#fff6db;--blue-soft:#eef2ff;--shadow:0 8px 30px rgba(23,32,51,.08)}*{box-sizing:border-box}body{margin:0;background:linear-gradient(180deg,#edf2f7,#f8fafc 280px);color:var(--ink)}button,a{font:inherit}button{color:inherit}.shell{max-width:1550px;margin:auto;padding:20px}.hero,.panel,.inspector{background:var(--paper);border:1px solid var(--line);border-radius:18px;box-shadow:var(--shadow)}.hero{padding:22px}.hero-top{display:flex;justify-content:space-between;gap:24px}.eyebrow{font-size:.75rem;text-transform:uppercase;letter-spacing:.09em;font-weight:800;color:var(--accent)}h1{font-size:clamp(1.8rem,3vw,3rem);line-height:1.05;margin:.25rem 0 .6rem}.subtitle{margin:0;color:var(--muted);max-width:900px}.revision{font-size:.8rem;text-align:right;color:var(--muted)}.revision code{display:block;color:var(--ink)}.status-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin-top:18px}.status{border:1px solid var(--line);background:#f8fafc;border-radius:11px;padding:11px;text-align:left;cursor:pointer}.status span{display:block;font-size:.78rem;color:var(--muted);margin-top:3px}.state-passed,.state-complete,.state-covered,.state-observed{border-color:#b9dfcb!important;background:var(--good-soft)!important}.state-needs-review,.state-needs-human-review{border-color:#ead48a!important;background:var(--warn-soft)!important}.tabs{display:flex;gap:5px;overflow:auto;margin:16px 0 11px;padding:3px}.tab{border:1px solid transparent;background:transparent;padding:9px 13px;border-radius:9px;font-weight:750;color:var(--muted);cursor:pointer;white-space:nowrap}.tab[aria-selected="true"]{background:white;border-color:var(--line);box-shadow:0 2px 10px rgba(0,0,0,.05);color:var(--ink)}.workspace{display:grid;grid-template-columns:minmax(0,1fr) 355px;gap:13px;align-items:start}.panel{padding:18px;min-height:650px}.panel[hidden]{display:none}.lens-head{display:flex;justify-content:space-between;gap:20px;align-items:end;margin-bottom:12px}.lens-head h2{margin:.25rem 0;font-size:1.45rem}.lens-head p{margin:0;color:var(--muted);max-width:720px}.story{display:flex;align-items:stretch;gap:8px;overflow:auto;padding:8px 2px}.story-node{min-width:178px;flex:1;border:1px solid var(--line);border-radius:13px;background:#f8fafc;padding:13px;text-align:left;cursor:pointer}.story-node i{display:grid;place-items:center;width:24px;height:24px;border-radius:50%;background:var(--ink);color:white;font-style:normal;font-size:.75rem}.story-node small,.story-node b,.story-node span{display:block}.story-node small{margin-top:9px;color:var(--accent);font-weight:750}.story-node b{margin:3px 0 6px}.story-node span{font-size:.85rem;color:var(--muted)}.story-arrow{align-self:center;color:#98a2b3;font-size:1.25rem}.diagram-scroll{overflow:auto;border:1px solid var(--line);border-radius:14px;background:linear-gradient(#fff,#fbfcff);padding:8px}.diagram{width:100%;min-width:900px;height:auto}.boundary{fill:#f8fafc;stroke:#98a2b3;stroke-dasharray:7 5}.boundary-label{font-size:14px;font-weight:800;fill:#667085}.svg-node{cursor:pointer}.svg-node rect{fill:white;stroke:#667085;stroke-width:1.5}.svg-node:hover rect,.svg-node:focus rect{fill:var(--blue-soft);stroke:var(--accent);stroke-width:2.5}.svg-node:focus{outline:none}.stereo{font-size:12px;fill:#667085}.node-title{font-size:15px;font-weight:800;fill:#172033}.node-owner,.state-kind{font-size:11px;fill:#667085}.edge,.message-line{stroke:#475467;stroke-width:1.5;fill:none}.dashed{stroke-dasharray:7 5}.edge-label,.message-label{font-size:11px;fill:#344054;text-anchor:middle}.authority-label{font-size:10px;fill:#667085;text-anchor:middle}.lifeline{stroke:#98a2b3;stroke-dasharray:6 6}.participant{font-size:13px;font-weight:800;fill:#172033}.message-bg,.transition-bg{fill:white;opacity:.94}.sequence-message{cursor:pointer}.sequence-message:hover .message-line,.sequence-message:focus .message-line{stroke:var(--accent);stroke-width:3}.sequence-message:focus{outline:none}.message-num{font-size:10px;fill:#98a2b3}.state-node.machine rect{fill:#eef6ff}.state-node.human-gate rect{fill:var(--warn-soft);stroke:#c99316;stroke-width:2.5}.state-node.final rect{fill:var(--good-soft);stroke:#3f8c69}.state-edge{stroke-width:1.7}.nonclaim-banner{margin-top:11px;border:1px solid #ead48a;background:var(--warn-soft);padding:12px;border-radius:10px;color:#694600}.table-wrap{overflow:auto;border:1px solid var(--line);border-radius:12px}table{border-collapse:collapse;width:100%;min-width:900px;font-size:.84rem}th,td{padding:11px;border-bottom:1px solid var(--line);vertical-align:top;text-align:left}th{background:#f2f4f7;color:#475467;font-size:.73rem;text-transform:uppercase;letter-spacing:.04em}.linklike{border:0;background:transparent;text-align:left;padding:0;cursor:pointer}.linklike:hover,.linklike:focus{color:var(--accent);outline:none}code{font-size:.76rem}.badge{display:inline-block;border-radius:99px;padding:3px 8px;font-size:.71rem;font-weight:800}.evidence-line{display:block;margin-bottom:3px}.cards{display:grid;gap:11px}.evidence-card{border:1px solid var(--line);border-radius:13px;background:#f8fafc;padding:14px}.evidence-title{display:flex;gap:9px;align-items:center}.split{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:10px}.split h3{font-size:.75rem;text-transform:uppercase;letter-spacing:.05em;color:var(--muted)}.review-grid{display:grid;grid-template-columns:1.2fr 1fr;gap:12px}.review-card,.human-card{border:1px solid var(--line);border-radius:13px;padding:16px}.human-card{background:var(--warn-soft);border-color:#ead48a}.check{display:grid;grid-template-columns:24px 1fr auto;width:100%;gap:8px;align-items:center;border:0;border-top:1px solid var(--line);background:transparent;padding:10px 0;text-align:left}.check em{font-style:normal;color:var(--muted);font-size:.78rem}.inspector{position:sticky;top:12px;overflow:hidden}.inspector-head{background:#19233a;color:white;padding:14px 16px}.inspector-body{padding:16px;max-height:720px;overflow:auto}.inspector-body h3{margin:.8rem 0 .3rem}.inspector-body p{color:var(--muted)}.source-link{display:block;border:1px solid var(--line);border-radius:9px;padding:9px;margin-top:7px;text-decoration:none;color:var(--ink);font-size:.82rem}.source-link:hover{border-color:var(--accent);background:var(--blue-soft)}@media(max-width:980px){.workspace{grid-template-columns:1fr}.inspector{position:static}.status-grid{grid-template-columns:1fr 1fr}.hero-top{display:block}.revision{text-align:left;margin-top:12px}.review-grid,.split{grid-template-columns:1fr}}@media(max-width:600px){.shell{padding:9px}.status-grid{grid-template-columns:1fr}.panel{padding:12px}.diagram{min-width:820px}}
</style></head><body><main class="shell"><section class="hero"><div class="hero-top"><div><div class="eyebrow">Review Workbench v1 · Architecture Lens Pack</div><h1>${esc(base.title)}</h1><p class="subtitle">${esc(base.subtitle)}</p></div><div class="revision">Merged subject<code>${esc(base.subject.mergeRevision.slice(0,12))}</code>Verified head<code>${esc(base.subject.verifiedHeadRevision.slice(0,12))}</code></div></div><div class="status-grid">${renderStatus(base.status)}</div></section><nav class="tabs" role="tablist">${tabs.map(([id,label],i)=>`<button class="tab" role="tab" aria-selected="${i===0}" aria-controls="panel-${id}" data-tab="${id}">${label}</button>`).join("")}</nav><div class="workspace"><section>
<section class="panel" id="panel-overview" role="tabpanel"><div class="lens-head"><div><div class="eyebrow">Change story</div><h2>Why did this change exist?</h2><p>${esc(base.outcome)}</p></div></div>${renderOverview(base)}</section>
<section class="panel" id="panel-component" role="tabpanel" hidden><div class="lens-head"><div><div class="eyebrow">UML-style component view</div><h2>${esc(arch.component.title)}</h2><p>${esc(arch.component.concern)}</p></div></div>${componentSvg(arch.component)}</section>
<section class="panel" id="panel-sequence" role="tabpanel" hidden><div class="lens-head"><div><div class="eyebrow">Sequence view</div><h2>${esc(arch.sequence.title)}</h2><p>${esc(arch.sequence.concern)}</p></div></div>${sequenceSvg(arch.sequence)}</section>
<section class="panel" id="panel-state" role="tabpanel" hidden><div class="lens-head"><div><div class="eyebrow">State / gate view</div><h2>${esc(arch.state.title)}</h2><p>${esc(arch.state.concern)}</p></div></div>${stateSvg(arch.state)}</section>
<section class="panel" id="panel-requirements" role="tabpanel" hidden><div class="lens-head"><div><div class="eyebrow">Traceability</div><h2>Requirements → implementation → evidence</h2><p>Use this when the review question is coverage and assurance rather than system structure.</p></div></div>${requirementsTable(base.requirements)}</section>
<section class="panel" id="panel-evidence" role="tabpanel" hidden><div class="lens-head"><div><div class="eyebrow">Evidence</div><h2>Claims beside their limits</h2><p>Every proof is shown next to what it does not establish.</p></div></div>${evidenceCards(base.evidence)}</section>
<section class="panel" id="panel-review" role="tabpanel" hidden><div class="lens-head"><div><div class="eyebrow">Human checkpoint</div><h2>Technical completion is not the same as human acceptance</h2></div></div>${reviewPanel(base)}</section>
</section><aside class="inspector"><div class="inspector-head"><div class="eyebrow">Shared inspector</div><b id="inspect-title">Select something</b></div><div class="inspector-body" id="inspect-body"><p>Choose a concept, diagram element, requirement, evidence item, or review state. Its explanation and exact sources will appear here.</p></div></aside></div></main><script id="workbench-data" type="application/json">${data}</script><script>
const {base,arch}=JSON.parse(document.getElementById('workbench-data').textContent);const sourceMap=Object.fromEntries(base.sources.map(s=>[s.id,s]));const by=(arr,id)=>arr.find(x=>x.id===id);function pick(type,id){if(type==='status')return by(base.status,id);if(type==='concept')return by(base.concepts,id);if(type==='requirement')return by(base.requirements,id);if(type==='evidence')return by(base.evidence,id);if(type==='component')return by(arch.component.nodes,id);if(type==='sequence-participant')return by(arch.sequence.participants,id);if(type==='sequence-message')return by(arch.sequence.messages,id);if(type==='state')return by(arch.state.states,id);if(type==='review')return base.review.items[Number(id)];return null}function inspect(type,id){const item=pick(type,id);if(!item)return;const title=item.title||item.label||id;const detail=item.detail||item.summary||item.note||item.question||'';const sourceIds=item.sourceIds||[];document.getElementById('inspect-title').textContent=title;document.getElementById('inspect-body').innerHTML='<p>'+escapeHtml(detail)+'</p>'+((item.owner||item.authority)?'<h3>Owner / authority</h3><p>'+escapeHtml(item.owner||item.authority)+'</p>':'')+(sourceIds.length?'<h3>Sources</h3>'+sourceIds.map(sid=>{const s=sourceMap[sid];return s?'<a class="source-link" href="'+escapeHtml(s.url)+'" target="_blank" rel="noreferrer"><b>'+escapeHtml(s.label)+'</b><br>'+escapeHtml(s.role)+' · '+escapeHtml(s.revision.slice(0,12))+'</a>':''}).join(''):'')}function escapeHtml(v){return String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;')}document.addEventListener('click',e=>{const tab=e.target.closest('[data-tab]');if(tab){document.querySelectorAll('[data-tab]').forEach(t=>t.setAttribute('aria-selected','false'));tab.setAttribute('aria-selected','true');document.querySelectorAll('[role=tabpanel]').forEach(p=>p.hidden=true);document.getElementById('panel-'+tab.dataset.tab).hidden=false;return}const el=e.target.closest('[data-type][data-id]');if(el)inspect(el.dataset.type,el.dataset.id)});document.addEventListener('keydown',e=>{const el=e.target.closest('[data-type][data-id]');if(el&&(e.key==='Enter'||e.key===' ')){e.preventDefault();inspect(el.dataset.type,el.dataset.id)}});
</script></body></html>`;
}
