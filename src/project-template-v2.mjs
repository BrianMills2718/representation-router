const esc = (value = "") => String(value)
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;").replaceAll("'", "&#39;");

const safeJson = (value) => JSON.stringify(value)
  .replaceAll("<", "\\u003c").replaceAll("\u2028", "\\u2028").replaceAll("\u2029", "\\u2029");

function assertProjection(model) {
  if (!model || model.schema_version !== "project-review-projection.v2") throw new Error("project-review-projection.v2 model required");
  if (!model.planning_route?.selected_path) throw new Error("planning route required");
  if (!Array.isArray(model.representation_expectations) || !model.representation_expectations.length) throw new Error("representation expectations required");
  if (!Array.isArray(model.plan?.slices) || !model.plan.slices.length) throw new Error("plan slices required");
  if (!Array.isArray(model.checkpoints) || !model.checkpoints.length) throw new Error("checkpoints required");
  const sliceIds = new Set(model.plan.slices.map(x => x.slice_id));
  const checkpointIds = new Set(model.checkpoints.map(x => x.checkpoint_id));
  if (!checkpointIds.has(model.current_checkpoint_id)) throw new Error("current_checkpoint_id does not resolve");
  for (const cp of model.checkpoints) if (!sliceIds.has(cp.slice_id)) throw new Error(`checkpoint ${cp.checkpoint_id} has unknown slice ${cp.slice_id}`);
  return model;
}

function normalizeSurfaceBundle(input = {}) {
  return {
    intended: input.intended ?? {},
    actual: input.actual ?? {},
    bundleState: input.bundleState ?? {}
  };
}

export function renderProjectTemplateV2(projectionInput, surfaceBundleInput, options = {}) {
  const projection = assertProjection(projectionInput);
  const surfaceBundle = normalizeSurfaceBundle(surfaceBundleInput);
  const productHtml = options.productHtml ?? null;
  const payload = safeJson({ projection, surfaceBundle, productHtml });

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(projection.title)} · Planning & Review</title>
<style>/* RR_THEME_REPLACED_BY_WRAPPER */</style>
<style>
.nav-meta{display:flex;gap:6px;align-items:center;float:right}.nav-badge,.state-pill{display:inline-flex;align-items:center;padding:2px 6px;border:1px solid var(--line);border-radius:999px;font-size:8px;font-weight:900;letter-spacing:.06em;text-transform:uppercase}.required{color:var(--red)}.recommended{color:var(--blue)}.optional{color:var(--muted)}.not_applicable{color:var(--muted);opacity:.65}.available{color:var(--teal)}.missing{color:var(--red)}.route-grid,.semantic-grid,.state-grid{display:grid;gap:10px}.route-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.semantic-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.state-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.semantic-card{padding:16px;border:1px solid var(--line);border-radius:10px;background:#0a1018}.semantic-card h3{margin:4px 0 8px;font-size:15px}.semantic-card p{margin:0;color:var(--muted);font-size:11px;line-height:1.45}.route-facts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.route-fact{padding:9px 10px;border:1px solid var(--line);border-radius:8px;background:#0a1018;font-size:10px}.route-fact b{float:right}.surface-status{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.surface-prompt{margin:0 0 12px;padding:10px 12px;border:1px solid #33445c;border-radius:8px;background:#0a1018;color:#cbd6e6;font-size:11px}.detail-list{display:grid;gap:6px}.detail-item{padding:8px 9px;border:1px solid var(--line);border-radius:7px;background:#0a1018;font-size:10px}.provenance-row{word-break:break-word;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:9px}.bundle-state{padding:12px;border:1px solid var(--line);border-radius:9px;background:#0a1018}.bundle-state.incomplete,.bundle-state.invalid{border-color:#70454d}.bundle-state.complete{border-color:#376d63}.decision-list{display:grid;gap:8px}.decision-card{padding:10px;border:1px solid var(--line);border-radius:8px;background:#0a1018}.muted{color:var(--muted)}.overview-hero{display:grid;grid-template-columns:1.35fr .65fr;gap:12px;margin-bottom:12px}.overview-hero .semantic-card:first-child{min-height:170px}.compact-groups{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.compact-group{padding:14px;border:1px solid var(--line);border-radius:10px;background:#0a1018}.compact-group h3{margin:0 0 8px;font-size:12px}.compact-list{margin:0;padding-left:16px;color:var(--muted);font-size:10px;line-height:1.45}.route-summary{display:grid;grid-template-columns:1fr auto 1fr;gap:14px;align-items:stretch}.route-box{padding:18px;border:1px solid var(--line);border-radius:10px;background:#0a1018}.route-arrow{align-self:center;color:var(--teal);font-size:24px;font-weight:900}.trigger-list{display:flex;flex-wrap:wrap;gap:6px}.trigger-chip{padding:5px 7px;border:1px solid #35506a;border-radius:999px;font-size:9px;color:#cbd6e6}.route-facts-details{margin-top:14px}.journey{display:grid;grid-template-columns:repeat(var(--slice-count),minmax(0,1fr));gap:8px;position:relative;margin:18px 0}.journey-step{position:relative;padding:14px 10px;border:1px solid var(--line);border-radius:10px;background:#0a1018;min-height:92px}.journey-step.current{border-color:var(--teal);box-shadow:0 0 0 1px rgba(79,209,181,.18)}.journey-step.completed{opacity:.86}.journey-step .step-index{display:block;color:var(--muted);font-size:9px;margin-bottom:8px}.journey-step strong{font-size:11px;line-height:1.3}.journey-step .step-status{display:block;margin-top:9px;font-size:8px;text-transform:uppercase;letter-spacing:.06em}.status-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:14px}.status-card{padding:12px;border:1px solid var(--line);border-radius:9px;background:#0a1018}.status-card span{display:block;color:var(--muted);font-size:8px;text-transform:uppercase;letter-spacing:.08em}.status-card strong{display:block;margin-top:4px;font-size:11px}.product-evidence{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px}.product-note{padding:10px 12px;border:1px solid #4a4150;border-radius:8px;background:#130f17;color:#c9c2cc;font-size:10px;line-height:1.45}.diagram-panel{min-height:0}.diagram-canvas{min-width:0;min-height:0;display:block}.diagram-canvas svg{overflow:visible;max-width:100%;height:auto;display:block}.edge-label{font-size:9px;paint-order:stroke;stroke:#0a1018;stroke-width:6px;stroke-linejoin:round}.edge-label-bg{fill:#0a1018;stroke:#29384c;stroke-width:1;rx:4}.svg-node.evidence rect{fill:#12211e;stroke:#4f8d81;stroke-width:1.8}.svg-node.evidence .node-kind{fill:var(--teal)}.main-with-inspector.inspector-idle{grid-template-columns:minmax(0,1fr) 54px}.inspector-idle .inspector{overflow:hidden}.inspector-idle .inspector-head{padding:12px 8px;text-align:center}.inspector-idle .inspector-head strong,.inspector-idle .inspector-body{display:none}.inspector-idle .inspector-head .eyebrow{writing-mode:vertical-rl;transform:rotate(180deg);margin:0 auto;font-size:8px}.evidence-review-layout{max-width:1400px;margin:0 auto;display:grid;gap:14px}.evidence-gap-row{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}@media(max-width:900px){.route-grid,.semantic-grid,.state-grid,.overview-hero,.compact-groups,.route-summary,.status-grid{grid-template-columns:1fr}.journey{grid-template-columns:1fr}.route-arrow{transform:rotate(90deg);justify-self:center}}
</style>
</head>
<body>
<div class="shell">
<header class="topbar"><div class="brand"><span class="brand-mark">RR</span><span>${esc(projection.title)}</span></div><div class="mode-switch"><button id="planningMode" class="active">Planning</button><button id="reviewMode">Review</button></div><div class="source-chip"><span>${esc(projection.schema_version)}</span><strong>${esc(projection.source_revision.repository)}@${esc(projection.source_revision.commit_sha.slice(0,12))}</strong></div></header>
<div class="body">
<aside class="sidebar"><div id="planningNav"><div class="side-label">Planning</div><nav id="planningButtons" class="side-nav"></nav></div><div id="reviewNav" hidden><div class="side-label">Review</div><nav id="reviewButtons" class="side-nav"></nav></div></aside>
<main id="content" class="content"></main>
</div>
</div>
<script id="project-data" type="application/json">${payload}</script>
<script>
const DATA=JSON.parse(document.getElementById("project-data").textContent);
const P=DATA.projection,B=DATA.surfaceBundle;
let mode="planning",currentCheckpoint=P.current_checkpoint_id;
const checkpoint=()=>P.checkpoints.find(x=>x.checkpoint_id===currentCheckpoint);
const sliceById=id=>P.plan.slices.find(x=>x.slice_id===id);
const esc=s=>String(s??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
const titleCase=s=>String(s).replaceAll("_"," ").replace(/\\b\\w/g,c=>c.toUpperCase());
const expected=P.representation_expectations;
const surfaceFor=(role,id)=>B[role]?.[id]??null;
const availability=(role,e)=>e.disposition==="not_applicable"?"not_applicable":surfaceFor(role,e.surface_id)?"available":"missing";
const navBadge=(e,role)=>'<span class="nav-meta"><span class="nav-badge '+e.requirement_level+'">'+esc(e.requirement_level)+'</span><span class="nav-badge '+availability(role,e)+'">'+esc(availability(role,e))+'</span></span>';
const planningPages=[["plan-overview","Overview"],["plan-route","Planning route"],["plan-slices","Slices"],...expected.map(e=>["plan-surface:"+e.surface_id,titleCase(e.surface_type)]),["plan-final","Final target"]];
const reviewPages=()=>[["review-checkpoint","Checkpoint"],["review-changes","Changes"],["review-product","Current product"],["review-runs","Concrete runs"],...expected.map(e=>["review-surface:"+e.surface_id,titleCase(e.surface_type)]),["review-evidence","Evidence & gaps"]];
function expectationForPage(id){const sid=id.includes(":")?id.split(":")[1]:null;return sid?expected.find(x=>x.surface_id===sid):null}
function nav(){
  document.getElementById("planningNav").hidden=mode!=="planning";document.getElementById("reviewNav").hidden=mode!=="review";
  const box=document.getElementById(mode==="planning"?"planningButtons":"reviewButtons"),pages=mode==="planning"?planningPages:reviewPages(),role=mode==="planning"?"intended":"actual";
  box.innerHTML="";
  pages.forEach(([id,label],i)=>{const b=document.createElement("button");b.dataset.page=id;b.innerHTML='<span>'+esc(label)+'</span>'+(expectationForPage(id)?navBadge(expectationForPage(id),role):"");b.className=i===0?"active":"";b.onclick=()=>show(id,b);box.appendChild(b)});
  show(pages[0][0],box.firstChild);
}
function show(id,b){document.querySelectorAll(".side-nav button").forEach(x=>x.classList.remove("active"));if(b)b.classList.add("active");renderPage(id)}
function head(kicker,title,copy,right=""){return '<div class="page-head"><div><p class="eyebrow">'+esc(kicker)+'</p><h1>'+esc(title)+'</h1><p>'+esc(copy)+'</p></div>'+(right?'<div class="source-chip">'+esc(right)+'</div>':"")+'</div>'}
function cards(items){return '<div class="semantic-grid">'+items.map(x=>'<article class="semantic-card"><p class="eyebrow">'+esc(x.item_id)+'</p><h3>'+esc(x.title??x.text)+'</h3>'+(x.summary?'<p>'+esc(x.summary)+'</p>':'')+'<p class="muted">'+esc(x.source_ref)+'</p></article>').join("")+'</div>'}
function renderPage(id){
  if(id==="plan-overview")return renderOverview(); if(id==="plan-route")return renderRoute(); if(id==="plan-slices")return renderSlices(); if(id==="plan-final")return renderFinal();
  if(id.startsWith("plan-surface:"))return renderSurface(id.split(":")[1],"intended");
  if(id==="review-checkpoint")return renderCheckpoint(); if(id==="review-changes")return renderChanges(); if(id==="review-product")return renderProduct(); if(id==="review-runs")return renderRuns(); if(id==="review-evidence")return renderEvidence();
  if(id.startsWith("review-surface:"))return renderSurface(id.split(":")[1],"actual");
}
function renderOverview(){
  const compact=(title,items)=>'<section class="compact-group"><h3>'+esc(title)+'</h3><ul class="compact-list">'+items.map(x=>'<li>'+esc(x.title??x.text)+'</li>').join("")+'</ul></section>';
  content.innerHTML=head("Planning · source-owned semantics","Project at a glance","The template emphasizes the planning model first and keeps supporting detail compact.",P.plan.plan_revision)+
    '<div class="panel panel-pad"><div class="overview-hero"><article class="semantic-card"><p class="eyebrow">Outcome</p><h3>'+esc(P.plan.outcome.title)+'</h3><p>'+esc(P.plan.outcome.summary)+'</p></article><article class="semantic-card"><p class="eyebrow">Final target</p><h3>'+esc(P.plan.final_target.title)+'</h3><p>'+esc(P.plan.final_target.summary)+'</p></article></div>'+
    '<p class="eyebrow">Capabilities</p>'+cards(P.plan.capabilities)+
    '<div class="compact-groups" style="margin-top:12px">'+
      compact("Constraints",P.plan.constraints)+compact("Risks",P.plan.risks)+compact("Assumptions",P.plan.assumptions)+
      compact("Alternatives",P.plan.alternatives)+compact("Acceptance",P.plan.acceptance)+compact("Planned evidence",P.plan.planned_evidence)+
    '</div></div>';
}
function renderRoute(){
  const r=P.planning_route;
  const trueFacts=Object.entries(r.facts).filter(([,v])=>v);
  const facts=Object.entries(r.facts).map(([k,v])=>'<div class="route-fact">'+esc(titleCase(k))+' <b>'+esc(String(v))+'</b></div>').join("");
  content.innerHTML=head("Planning · method route","How did Company Planning route this work?","Primary view: triggers → selected route → activated controls. Full classifier evidence stays available below.",r.decision_ref.revision)+
    '<div class="panel panel-pad"><div class="route-summary"><div class="route-box"><p class="eyebrow">Triggers</p><div class="trigger-list">'+trueFacts.map(([k])=>'<span class="trigger-chip">'+esc(titleCase(k))+'</span>').join("")+'</div></div><div class="route-arrow">→</div><div class="route-box"><p class="eyebrow">Selected route</p><h2 style="margin:0 0 6px">'+esc(r.selected_path)+'</h2><p class="muted">'+esc(r.rationale)+'</p></div></div>'+
    '<div class="detail"><h4>Activated controls</h4><div class="detail-list">'+r.activated_controls.map(x=>'<div class="detail-item"><b>'+esc(x.label)+'</b><br><span class="muted">'+esc(x.source_ref)+'</span></div>').join("")+'</div></div>'+
    '<details class="route-facts-details"><summary>Classifier evidence · all closed facts</summary><div class="route-facts" style="margin-top:10px">'+facts+'</div></details></div>';
}
function renderSlices(){
  content.innerHTML=head("Planning · implementation frontier","How does the intended journey unfold?","Epistemic state comes from Company Planning and stays distinct from checkpoint status.")+'<div class="panel panel-pad"><div class="slice-list">'+[...P.plan.slices].sort((a,b)=>a.sequence_index-b.sequence_index).map(s=>'<div class="slice"><span class="num">'+String(s.sequence_index+1).padStart(2,"0")+'</span><div><strong>'+esc(s.title)+'</strong><p>'+esc(s.intent)+'</p><span class="state-pill '+esc(s.epistemic_state)+'">'+esc(s.epistemic_state)+'</span></div><span class="state">'+(s.next_slice_id?"next → "+esc(s.next_slice_id):"final slice")+'</span></div>').join("")+'</div></div>';
}
function renderFinal(){const f=P.plan.final_target;content.innerHTML=head("Planning · final target","What does the intended finished system look like?","The north-star target remains distinct from the current implementation frontier.")+'<div class="panel final-target"><p class="eyebrow">'+esc(f.item_id)+'</p><h2>'+esc(f.title)+'</h2><p>'+esc(f.summary)+'</p><div class="detail"><h4>Source</h4><p>'+esc(f.source_ref)+'</p></div></div>'}
function surfaceState(e,role){const s=surfaceFor(role,e.surface_id);if(e.disposition==="not_applicable")return {state:"not_applicable",surface:null};if(!s)return {state:"missing",surface:null};return {state:"available",surface:s}}
function renderSurface(id,role){
  const e=expected.find(x=>x.surface_id===id),resolved=surfaceState(e,role);
  if(resolved.state==="not_applicable"){content.innerHTML=head((role==="intended"?"Planning":"Review")+" · "+titleCase(e.surface_type),titleCase(e.surface_type),"Company Planning marked this representation not applicable.")+'<div class="unavailable"><p class="eyebrow">Not applicable</p><h2>'+esc(e.surface_id)+'</h2><p>'+esc(e.rationale)+'</p></div>';return}
  if(!resolved.surface){content.innerHTML=head((role==="intended"?"Planning":"Review")+" · "+titleCase(e.surface_type),titleCase(e.surface_type),"The expected representation is missing from the supplied bundle.")+'<div class="unavailable"><p class="eyebrow">'+esc(e.requirement_level)+' · missing</p><h2>'+esc(e.surface_id)+'</h2><p>'+esc(e.rationale)+'</p><code>Required/recommended surfaces remain visible when unavailable.</code></div>';return}
  const s=resolved.surface;
  const prompt=e.review_intent?'<div class="surface-prompt"><b>'+esc(e.review_intent.mode.toUpperCase())+':</b> '+esc(e.review_intent.prompt)+'</div>':"";
  content.innerHTML=head((role==="intended"?"Planning":"Review")+" · "+titleCase(e.surface_type),s.title??titleCase(e.surface_type),e.rationale)+'<div class="main-with-inspector inspector-idle"><div class="diagram-panel">'+prompt+'<div class="diagram-title"><h2>'+esc(s.title??e.surface_id)+'</h2><div class="surface-status"><span class="state-pill '+esc(e.requirement_level)+'">'+esc(e.requirement_level)+'</span><span class="state-pill available">available</span></div></div><div class="diagram-canvas">'+diagramSvg(s)+'</div></div><aside class="inspector"><div class="inspector-head"><p class="eyebrow">Inspector</p><strong>Select a node or edge</strong></div><div class="inspector-body" id="inspectorBody"><p>Nothing selected.</p></div></aside></div>';
  document.querySelectorAll(".svg-node,.svg-edge").forEach(el=>el.addEventListener("click",()=>inspect(s,el)));
}
function positions(surface){
  const nodes=surface.nodes||[],out={};
  if(surface.surface_type==="boundary_flow"){
    const ids=nodes.map(n=>n.node_id??n.id),ports=surface.ports||[],edges=surface.edges||[];
    const nodeFor=(ref)=>ids.includes(ref)?ref:(ports.find(p=>p.port_id===ref)?.node_id??null);
    const adj=Object.fromEntries(ids.map(id=>[id,[]]));
    for(const e of edges){const a=nodeFor(e.from??e.from_node??e.from_port),b=nodeFor(e.to??e.to_node??e.to_port);if(a&&b&&a!==b)adj[a].push(b)}
    let idx=0;const stack=[],onStack=new Set(),index={},low={},components=[];
    const visit=(v)=>{index[v]=low[v]=idx++;stack.push(v);onStack.add(v);for(const w of adj[v]){if(index[w]===undefined){visit(w);low[v]=Math.min(low[v],low[w])}else if(onStack.has(w))low[v]=Math.min(low[v],index[w])}if(low[v]===index[v]){const comp=[];let w;do{w=stack.pop();onStack.delete(w);comp.push(w)}while(w!==v);components.push(comp)}};
    ids.forEach(id=>{if(index[id]===undefined)visit(id)});
    const compOf={};components.forEach((comp,i)=>comp.forEach(id=>compOf[id]=i));
    const dag=components.map(()=>new Set()),indeg=components.map(()=>0),rank=components.map(()=>0);
    for(const a of ids)for(const b of adj[a]){const ca=compOf[a],cb=compOf[b];if(ca!==cb&&!dag[ca].has(cb)){dag[ca].add(cb);indeg[cb]++}}
    const q=[];indeg.forEach((d,i)=>{if(d===0)q.push(i)});
    while(q.length){const ca=q.shift();for(const cb of dag[ca]){rank[cb]=Math.max(rank[cb],rank[ca]+1);if(--indeg[cb]===0)q.push(cb)}}
    const maxRank=Math.max(0,...rank),xStep=maxRank?Math.min(205,700/maxRank):0;
    const byRank={};components.forEach((comp,i)=>{(byRank[rank[i]]??=[]).push(...comp)});
    for(const [r,group] of Object.entries(byRank)){group.forEach((id,i)=>{out[id]={x:45+Number(r)*xStep,y:65+i*115,w:170,h:74}})}
    return out;
  }
  if(surface.surface_type==="contract_map"){
    const ids=nodes.map(n=>n.node_id??n.id),ports=surface.ports||[],edges=surface.edges||[];
    const nodeFor=(ref)=>ids.includes(ref)?ref:(ports.find(p=>p.port_id===ref)?.node_id??null);
    const degree=Object.fromEntries(ids.map(id=>[id,{in:0,out:0}]));
    for(const e of edges){const a=nodeFor(e.from??e.from_node??e.from_port),b=nodeFor(e.to??e.to_node??e.to_port);if(a&&degree[a])degree[a].out++;if(b&&degree[b])degree[b].in++}
    const consumers=[...ids].sort((a,b)=>(degree[b].in-degree[b].out)-(degree[a].in-degree[a].out));
    const hub=consumers[0];
    const left=ids.filter(id=>id!==hub);
    const rowGap=Math.max(92,360/Math.max(1,left.length));
    left.forEach((id,i)=>{out[id]={x:55,y:55+i*rowGap,w:220,h:72}});
    if(hub)out[hub]={x:600,y:55+Math.max(0,left.length-1)*rowGap/2,w:245,h:82};
    return out;
  }
  if(surface.surface_type==="sequence"){
    const w=150,left=35,right=35,canvas=1040,step=(canvas-left-right-w)/Math.max(1,nodes.length-1);
    nodes.forEach((n,i)=>{out[n.node_id??n.id]={x:left+i*step,y:150,w,h:72}});
    return out;
  }
  if(surface.surface_type==="work_dependency"){
    const w=150,left=35,right=35,canvas=1120,step=(canvas-left-right-w)/Math.max(1,nodes.length-1);
    nodes.forEach((n,i)=>{out[n.node_id??n.id]={x:left+i*step,y:185,w,h:78}});
    return out;
  }
  if(surface.surface_type==="evidence_overlay"){
    const targets=nodes.filter(n=>n.kind!=="evidence"),evidence=nodes.filter(n=>n.kind==="evidence");
    const place=(items,y,w=185,canvas=1000)=>{const left=55,right=55,step=(canvas-left-right-w)/Math.max(1,items.length-1);items.forEach((n,i)=>{out[n.node_id??n.id]={x:left+i*step,y,w,h:78}})};
    place(targets,75); place(evidence,330);
    return out;
  }
  if(surface.surface_type==="state"){nodes.forEach((n,i)=>{out[n.node_id??n.id]={x:70+i*(820/Math.max(1,nodes.length-1)),y:210,w:155,h:76}});return out}
  if(surface.surface_type==="outcome_capability"){
    nodes.forEach((n,i)=>{const id=n.node_id??n.id;if(i===0)out[id]={x:390,y:55,w:220,h:88};else out[id]={x:90+(i-1)*270,y:255,w:200,h:82}});return out;
  }
  nodes.forEach((n,i)=>{out[n.node_id??n.id]={x:70+(i%3)*290,y:70+Math.floor(i/3)*180,w:200,h:82}});
  return out;
}
function diagramSvg(surface){
  const pos=positions(surface),nodes=surface.nodes||[],edges=surface.edges||[],ports=surface.ports||[];
  const resolveNode=(ref)=>{if(pos[ref])return ref;const p=ports.find(x=>x.port_id===ref);return p?.node_id??null};
  const es=edges.map((e,index)=>{const id=e.edge_id??e.id,from=e.from??e.from_node??e.from_port,to=e.to??e.to_node??e.to_port;const fromNode=resolveNode(from),toNode=resolveNode(to),a=pos[fromNode],b=pos[toNode];if(!a||!b)return"";
    const forward=b.x>=a.x,x1=forward?a.x+a.w:a.x,x2=forward?b.x:b.x+b.w,y1=a.y+a.h/2,y2=b.y+b.h/2,mid=(x1+x2)/2;
    const reversePair=edges.some(other=>resolveNode(other.from??other.from_node??other.from_port)===toNode&&resolveNode(other.to??other.to_node??other.to_port)===fromNode);
    const bend=reversePair?(forward?-45:45):0;
    const path='M '+x1+' '+y1+' C '+mid+' '+(y1+bend)+' '+mid+' '+(y2+bend)+' '+x2+' '+y2;
    const label=String(e.label??e.edge_type??""),lx=mid,ly=(y1+y2)/2+bend-7,labelWidth=Math.max(34,Math.min(150,label.length*5.7+14));
    return '<g class="svg-edge" data-kind="edge" data-id="'+esc(id)+'"><path class="edge-line" d="'+path+'"/><path class="edge-hit" d="'+path+'"/><rect class="edge-label-bg" x="'+(lx-labelWidth/2)+'" y="'+(ly-13)+'" width="'+labelWidth+'" height="18"/><text class="edge-label" x="'+lx+'" y="'+ly+'" text-anchor="middle">'+esc(label)+'</text></g>'}).join("");
  const ns=nodes.map(n=>{const id=n.node_id??n.id,p=pos[id];return '<g class="svg-node '+esc(n.kind??"")+'" data-kind="node" data-id="'+esc(id)+'"><rect x="'+p.x+'" y="'+p.y+'" width="'+p.w+'" height="'+p.h+'" rx="12"/><text class="node-title" x="'+(p.x+14)+'" y="'+(p.y+29)+'">'+esc(n.label)+'</text><text class="node-kind" x="'+(p.x+14)+'" y="'+(p.y+50)+'">'+esc(n.kind??"")+'</text></g>'}).join("");
  const defaultWidth=surface.surface_type==="sequence"?1040:surface.surface_type==="work_dependency"?1120:surface.surface_type==="evidence_overlay"?1000:surface.surface_type==="contract_map"?900:900;
  const maxX=Math.max(defaultWidth,...Object.values(pos).map(p=>p.x+p.w+55)),maxY=Math.max(300,...Object.values(pos).map(p=>p.y+p.h+65));
  return '<svg viewBox="0 0 '+maxX+' '+maxY+'" width="100%" role="img"><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#7c857f"/></marker></defs>'+es+ns+'</svg>';
}
function inspect(surface,el){
  document.querySelector(".main-with-inspector")?.classList.remove("inspector-idle");
  document.querySelectorAll(".svg-node,.svg-edge").forEach(x=>x.classList.remove("selected"));el.classList.add("selected");
  const kind=el.dataset.kind,id=el.dataset.id;
  const item=kind==="node"?(surface.nodes||[]).find(x=>(x.node_id??x.id)===id):(surface.edges||[]).find(x=>(x.edge_id??x.id)===id);
  if(!item)return;
  const ports=kind==="node"?(surface.ports||[]).filter(p=>p.node_id===id):[];
  const contracts=(surface.contract_bindings||[]).filter(c=>ports.some(p=>p.port_id===c.producer_port||p.port_id===c.consumer_port)||(kind==="edge"&&item.contract_ref&&c.contract_ref===item.contract_ref));
  const rules=(surface.business_rules||[]).filter(r=>!r.owner_boundary||r.owner_boundary===item.owner_boundary||r.owner_boundary===id);
  const prov=(surface.provenance_bindings||[]).filter(p=>p.target_ref===(kind+":"+id));
  const sourceIds=new Set(prov.flatMap(p=>p.input_source_refs.map(x=>x.source_id+":"+x.source_pointer)));
  const relatedByProv=(prefix,itemId)=>{const bindings=(surface.provenance_bindings||[]).filter(p=>p.target_ref===prefix+":"+itemId);return bindings.some(p=>p.input_source_refs.some(x=>sourceIds.has(x.source_id+":"+x.source_pointer)))};
  const actions=(surface.human_actions||[]).filter(a=>relatedByProv("human_action",a.action_id)||(kind==="node"&&item.kind==="human_action"));
  const claims=(surface.evidence_claims||[]).filter(cl=>relatedByProv("evidence_claim",cl.claim_id));
  const states=kind==="node"?'<div class="detail"><h4>Independent states</h4><div class="state-grid"><div class="detail-item">Implementation<br><b>'+esc(item.implementation_state??"unknown")+'</b></div><div class="detail-item">Evidence origin<br><b>'+esc(item.evidence_origin??"unknown")+'</b></div><div class="detail-item">Evidence review<br><b>'+esc(item.evidence_review_state??"unknown")+'</b></div></div></div>':"";
  const list=(title,items,render)=>items.length?'<div class="detail"><h4>'+title+'</h4><div class="detail-list">'+items.map(render).join("")+'</div></div>':"";
  inspectorBody.innerHTML='<p class="eyebrow">'+esc(kind)+'</p><h2>'+esc(item.label??id)+'</h2><p>'+esc(item.detail??item.edge_type??"")+'</p><div class="detail"><h4>Identity</h4><p>'+esc(id)+'</p></div>'+states+
    list("Ports",ports,p=>'<div class="detail-item"><b>'+esc(p.direction)+'</b> '+esc(p.port_id)+'<br><span class="muted">'+esc(p.contract_ref??"no contract")+'</span></div>')+
    list("Contracts",contracts,c=>'<div class="detail-item"><b>'+esc(c.contract_ref)+'</b><br>'+esc(c.producer_port)+' → '+esc(c.consumer_port)+'</div>')+
    list("Business rules",rules,r=>'<div class="detail-item"><b>'+esc(r.rule_id)+'</b><br>'+esc(r.text)+'</div>')+
    list("Human actions",actions,a=>'<div class="detail-item"><b>'+esc(a.action_id)+'</b><br>'+esc(a.exact_action)+'</div>')+
    list("Evidence claims",claims,c=>'<div class="detail-item"><b>'+esc(c.claim_id)+'</b><br>'+esc(c.claim)+'</div>')+
    list("Exact provenance",prov,p=>'<div class="detail-item provenance-row"><b>'+esc(p.derivation_kind)+'</b> '+esc(p.derivation_rule_id??"direct")+'<br>'+p.input_source_refs.map(x=>esc(x.source_id+":"+x.source_pointer)).join("<br>")+'</div>')+
    '<div class="detail"><h4>Does not prove</h4><p>Rendering does not create planning, evidence, deployment, or review authority.</p></div>';
}
function checkpointPicker(){return '<select class="checkpoint-picker" id="checkpointPicker">'+P.checkpoints.map(c=>'<option value="'+esc(c.checkpoint_id)+'" '+(c.checkpoint_id===currentCheckpoint?"selected":"")+'>'+esc(c.checkpoint_id)+'</option>').join("")+'</select>'}
function bindPicker(){const x=document.getElementById("checkpointPicker");if(x)x.onchange=()=>{currentCheckpoint=x.value;nav()}}
const list=(items,empty)=>items?.length?items.map(x=>'<li>'+esc(x)+'</li>').join(""):'<li>'+esc(empty)+'</li>';
function renderCheckpoint(){
 const c=checkpoint(),s=sliceById(c.slice_id),bundle=B.bundleState?.[c.checkpoint_id]??{checkpoint_disposition:"unavailable",published_surfaces:[],failed_surfaces:[],diagnostics:[]};
 const currentIndex=P.plan.slices.findIndex(x=>x.slice_id===c.slice_id);
 const journey=[...P.plan.slices].sort((a,b)=>a.sequence_index-b.sequence_index).map((x,i)=>'<div class="journey-step '+(i<currentIndex?"completed ":"")+(x.slice_id===c.slice_id?"current":"")+'"><span class="step-index">'+String(i+1).padStart(2,"0")+'</span><strong>'+esc(x.title)+'</strong><span class="step-status">'+(i<currentIndex?"passed":x.slice_id===c.slice_id?"now · "+esc(c.status):"next")+'</span></div>').join("");
 const reviewState=c.review_decision_index_ref?"decision index bound":"not yet decided";
 content.innerHTML=head("Review · exact checkpoint","Where are we on the intended journey?","The journey is primary; implementation, projection completeness, evidence, and human review stay separate.",c.implementation_revision.repository+"@"+c.implementation_revision.commit_sha.slice(0,10))+
 '<div class="panel panel-pad"><div style="display:flex;justify-content:space-between;gap:16px;align-items:center"><div><p class="eyebrow">Journey</p><strong>'+esc(c.checkpoint_id)+'</strong></div>'+checkpointPicker()+'</div><div class="journey" style="--slice-count:'+P.plan.slices.length+'">'+journey+'</div>'+
 '<div class="status-grid"><div class="status-card"><span>Implementation checkpoint</span><strong>'+esc(c.status)+'</strong></div><div class="status-card"><span>Projection bundle</span><strong>'+esc(bundle.checkpoint_disposition)+'</strong></div><div class="status-card"><span>Evidence refs</span><strong>'+esc(String((c.evidence_refs||[]).length))+' attached</strong></div><div class="status-card"><span>Human review</span><strong>'+esc(reviewState)+'</strong></div></div>'+
 '<div class="checkpoint-grid" style="margin-top:12px"><div class="checkpoint-summary"><p class="eyebrow">Current slice</p><h2>'+esc(s.title)+'</h2><p>'+esc(s.intent)+'</p><div class="checkpoint-meta"><span>plan '+esc(c.plan_revision)+'</span><span>implementation '+esc(c.implementation_revision.commit_sha.slice(0,12))+'</span></div></div><article class="gap-card"><h3>Gap → next slice</h3><ul class="list">'+list(c.gap_to_next,"No next-slice gap")+'</ul></article><article class="gap-card"><h3>Gap → final</h3><ul class="list">'+list(c.gap_to_final,"No final-target gap")+'</ul></article><article class="gap-card"><h3>Projection bundle</h3><div class="bundle-state '+esc(bundle.checkpoint_disposition)+'"><b>'+esc(bundle.checkpoint_disposition)+'</b><p class="muted">'+esc((bundle.failed_surfaces||[]).length+" failed · "+(bundle.published_surfaces||[]).length+" published")+'</p></div></article></div></div>';bindPicker()
}
function renderChanges(){const c=checkpoint(),s=sliceById(c.slice_id);content.innerHTML=head("Review · delta","What changed in this slice?","This page is revision-bound; it does not rewrite history.")+'<div class="panel panel-pad"><p class="eyebrow">'+esc(s.title)+'</p><ul class="list">'+list(c.change_summary,"No changes supplied")+'</ul></div>'}
function renderProduct(){const c=checkpoint(),a=c.product_artifact;let body;if(DATA.productHtml&&a){const runtime=a.runtime_state??"not_verified",evidence=a.evidence_kind??a.artifact_kind;body='<div class="product-wrap"><div class="product-evidence"><span class="state-pill">'+esc(evidence)+'</span><span class="state-pill '+(runtime==="available"?"available":"missing")+'">runtime '+esc(runtime)+'</span></div>'+(runtime!=="available"?'<div class="product-note"><b>Review claim:</b> this is an exact product artifact at the reviewed revision. Operational availability is not established by this static package.</div>':'')+'<div class="product-meta"><span>Exact product subject: '+esc(a.repository+"@"+a.commit_sha.slice(0,12))+'</span><span>'+esc(a.entrypoint)+'</span></div><iframe class="product-frame" id="productFrame" title="Current product artifact"></iframe></div>'}else if(a){body='<div class="unavailable"><p class="eyebrow">Product artifact resolver required</p><h2>'+esc(a.repository)+'</h2><p>RR will not recreate this UI. Resolve the exact artifact below.</p><code>'+esc(a.commit_sha+" · "+a.entrypoint)+'</code></div>'}else body='<div class="unavailable"><h2>No product artifact declared</h2></div>';content.innerHTML=head("Review · product artifact","What product artifact exists at this checkpoint?","Artifact fidelity and operational availability are separate review claims.")+body;if(DATA.productHtml&&a)document.getElementById("productFrame").srcdoc=DATA.productHtml}
function renderRuns(){const c=checkpoint();content.innerHTML=head("Review · concrete examples","Show me the current system doing the thing.","Every run is pinned to the exact checkpoint implementation revision.")+'<div class="panel panel-pad"><div class="run-grid">'+((c.run_refs||[]).map(r=>'<article class="run-card"><p class="eyebrow">'+esc(r.run_id)+'</p><h3>'+esc(r.label)+'</h3><p>'+esc(r.evidence_ref)+'</p><div class="detail"><h4>Subject</h4><p>'+esc(r.subject_revision.repository+"@"+r.subject_revision.commit_sha.slice(0,12))+'</p></div></article>').join("")||'<p>No concrete runs attached.</p>')+'</div></div>'}
function renderEvidence(){
  const c=checkpoint(),overlayExpectation=expected.find(x=>x.surface_type==="evidence_overlay"&&x.disposition==="expected"),overlay=overlayExpectation?surfaceFor("actual",overlayExpectation.surface_id):null;
  const visual=overlay?'<div class="diagram-panel"><div class="diagram-title"><h2>'+esc(overlay.title??"Evidence overlay")+'</h2><span class="state-pill available">actual evidence</span></div><div class="diagram-canvas">'+diagramSvg(overlay)+'</div></div>':'<div class="unavailable"><p class="eyebrow">Evidence overlay unavailable</p><p>The checkpoint still exposes exact refs and gaps below.</p></div>';
  content.innerHTML=head("Review · evidence and gaps","What is observed, what does it support, and what remains unsupported?","When Company Planning supplies an Evidence Overlay, Review reuses that semantic surface instead of reducing evidence to refs alone.")+
    '<div class="evidence-review-layout">'+visual+'<div class="evidence-gap-row"><article class="gap-card"><h3>Observed evidence refs</h3><ul class="list">'+list(c.evidence_refs,"No evidence refs")+'</ul></article><article class="gap-card"><h3>Remaining gaps</h3><ul class="list">'+list([...(c.gap_to_next||[]),...(c.gap_to_final||[])],"None")+'</ul></article></div></div>';
  if(overlay)document.querySelectorAll(".svg-node,.svg-edge").forEach(el=>el.addEventListener("click",()=>{}));
}
planningMode.onclick=()=>{mode="planning";planningMode.classList.add("active");reviewMode.classList.remove("active");nav()};
reviewMode.onclick=()=>{mode="review";reviewMode.classList.add("active");planningMode.classList.remove("active");nav()};
nav();
</script>
</body></html>`;
}
