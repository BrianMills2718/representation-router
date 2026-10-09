import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import dagre from '@dagrejs/dagre';

const escape = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const json = value => JSON.stringify(value).replaceAll('<', '\\u003c');
const sourceUrl = source => `https://github.com/${source.repository}/blob/${source.commit_sha}/${source.path}`;

/** Company Planning owns validation. Router owns only this read-only projection. */
export function validateModelReview({ surfacePath, companyRepo, companyRevision, repositories, subjects, python = 'python3' }) {
  if (!/^[a-f0-9]{40}$/.test(companyRevision)) throw new Error('Full Company Planning validator revision required');
  const paths = ['plugins/company-planning/scripts/validate_review_surfaces.py', 'plugins/company-planning/contracts/review-surfaces'];
  execFileSync('git', ['-C', companyRepo, 'cat-file', '-e', companyRevision + '^{commit}']);
  execFileSync('git', ['-C', companyRepo, 'diff', '--exit-code', companyRevision, '--', ...paths], { stdio: 'pipe' });
  const surface = JSON.parse(readFileSync(surfacePath, 'utf8'));
  for (const source of surface.source_records ?? []) {
    if (!repositories[source.repository] || !subjects[source.repository]) throw new Error(`Explicit repository and reviewed subject required: ${source.repository}`);
  }
  const args = [resolve(companyRepo, paths[0]), resolve(surfacePath), '--json'];
  for (const [name, path] of Object.entries(repositories)) args.push('--source-repo', `${name}=${path}`);
  for (const [name, revision] of Object.entries(subjects)) args.push('--subject-revision', `${name}=${revision}`);
  const check = JSON.parse(execFileSync(python, args, { encoding: 'utf8' }));
  if (!check.valid || check.record_type !== 'planning-review-surface.v1') throw new Error('Owning planning-review validation refused');
  if (surface.surface_type !== 'boundary_flow') throw new Error('This bounded model renderer supports boundary_flow only');
  return { surface, check, validatorRevision: companyRevision };
}

export function renderModelReview({ surface, check, validatorRevision }) {
  if (!check?.valid) throw new Error('Validated source-bound review required');
  const graph = new dagre.graphlib.Graph().setGraph({ rankdir: 'LR', ranksep: 120, nodesep: 38, marginx: 20, marginy: 55 }).setDefaultEdgeLabel(() => ({}));
  const ports = new Map(surface.ports.map(port => [port.port_id, port.node_id]));
  for (const node of surface.nodes) graph.setNode(node.node_id, { width: 190, height: 84 });
  for (const edge of surface.edges) graph.setEdge(ports.get(edge.from_port), ports.get(edge.to_port), { id: edge.edge_id, label: edge.label });
  dagre.layout(graph);
  const { width, height } = graph.graph();
  const edges = graph.edges().map(ref => {
    const edge = graph.edge(ref); const points = edge.points;
    const lines = [];
    for (const word of edge.label.split(' ')) {
      if (!lines.length || lines.at(-1).length + word.length > 14) lines.push(word);
      else lines[lines.length - 1] += ' ' + word;
    }
    const x = (points[0].x + points.at(-1).x) / 2;
    const y = points[0].y - lines.length * 14;
    return `<path d="M ${points.map(p => `${p.x},${p.y}`).join(' L ')}" marker-end="url(#arrow)"/><text x="${x}" y="${y}" text-anchor="middle">${lines.map((line, i) => `<tspan x="${x}" dy="${i ? 14 : 0}">${escape(line)}</tspan>`).join('')}</text>`;
  }).join('');
  const nodes = surface.nodes.map(node => {
    const box = graph.node(node.node_id);
    return `<foreignObject x="${box.x - 95}" y="${box.y - 42}" width="190" height="84"><button xmlns="http://www.w3.org/1999/xhtml" class="node" data-node="${escape(node.node_id)}" data-tooltip="Inspect source and connected relationships" aria-pressed="false"><strong>${escape(node.label)}</strong><small>${escape(node.kind)}</small></button></foreignObject>`;
  }).join('');
  const sources = surface.source_records.map(source => `<a data-tooltip="Open the exact committed source" href="${escape(sourceUrl(source))}" target="_blank" rel="noreferrer">${escape(source.path)} · ${escape(source.commit_sha.slice(0, 8))}</a>`).join('');
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(surface.review_intent.prompt)}</title>
<style>*{box-sizing:border-box}body{margin:0;background:#f6f7f9;color:#182335;font:16px system-ui,sans-serif}main{max-width:1380px;margin:auto;padding:32px}h1{font-size:clamp(28px,3vw,42px);max-width:940px;line-height:1.15;margin:12px 0}p{line-height:1.5}.status{color:#175a42;font-weight:700}.limit{padding:14px 18px;border-left:4px solid #bc7a1d;background:#fff4df}.diagram{overflow:auto;background:white;border:1px solid #ccd4df;border-radius:12px;padding:12px}svg{display:block;min-width:100%;overflow:visible}path{fill:none;stroke:#526784;stroke-width:2}text{font:12px system-ui;fill:#34465e;paint-order:stroke;stroke:white;stroke-width:5px;stroke-linejoin:round}.node{width:100%;height:100%;border:2px solid #7b91b0;border-radius:9px;background:#f1f5fc;color:#182335;padding:14px;font:16px system-ui;cursor:pointer}.node strong,.node small{display:block}.node small{margin-top:5px;color:#52637a;font-size:12px}.node[aria-pressed=true]{border-color:#2362b7;background:#dfeeff}.node:focus-visible,a:focus-visible{outline:3px solid #b66b00;outline-offset:3px}.detail{background:white;border:1px solid #ccd4df;border-radius:12px;margin-top:16px;padding:20px;min-height:150px}.sources{display:flex;gap:15px;flex-wrap:wrap;font-size:13px;margin-top:20px}a{color:#1556a7}.tooltip{position:fixed;z-index:10;max-width:300px;background:#172335;color:white;padding:8px 12px;border-radius:5px;font-size:13px;pointer-events:none}code{overflow-wrap:anywhere;font-size:13px}@media(max-width:600px){main{padding:18px}.diagram{padding:6px}svg{min-width:990px}.sources{display:grid}}</style>
<main><div class="status">Source bytes verified · Partial system model · Read only</div><h1>${escape(surface.review_intent.prompt)}</h1><p>Follow the arrows from a plan and its checklist to the decision. Select a box to inspect its relationships and source.</p><p class="limit">${surface.evidence_claims.map(claim => escape(claim.claim)).join(' ')}</p>
<div class="diagram"><svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Source-bound adoption-gate flow"><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" style="fill:#526784;stroke:none"/></marker></defs>${edges}${nodes}</svg></div><section class="detail" aria-live="polite" id="detail">Select a box to inspect its source.</section><div class="sources">${sources}</div><p><small>Validator revision: <code>${escape(validatorRevision)}</code>. Source verification checks committed bytes and the reviewed revision; it does not establish model completeness, executed behavior or human acceptance.</small></p></main><div class="tooltip" role="tooltip" hidden></div>
<script>const surface=${json(surface)};const detail=document.querySelector('#detail');const portNodes=Object.fromEntries(surface.ports.map(p=>[p.port_id,p.node_id]));function select(id){const node=surface.nodes.find(n=>n.node_id===id);document.querySelectorAll('[data-node]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.node===id)));detail.replaceChildren();const title=document.createElement('h2');title.textContent=node.label;detail.append(title);const bindings=surface.provenance_bindings.find(b=>b.target_ref==='node:'+id);for(const ref of bindings?.input_source_refs??[]){const source=surface.source_records.find(s=>s.source_id===ref.source_id);const a=document.createElement('a');a.href='https://github.com/'+source.repository+'/blob/'+source.commit_sha+'/'+source.path+'#'+ref.source_pointer.slice(1);a.textContent='Inspect source: '+source.path;a.dataset.tooltip='Open this model element at its pinned revision';detail.append(a)}const list=document.createElement('ul');for(const e of surface.edges.filter(e=>portNodes[e.from_port]===id||portNodes[e.to_port]===id)){const li=document.createElement('li');li.textContent=surface.nodes.find(n=>n.node_id===portNodes[e.from_port]).label+' → '+surface.nodes.find(n=>n.node_id===portNodes[e.to_port]).label+': '+e.label+' ('+e.contract_ref+')';list.append(li)}detail.append(list)}document.querySelectorAll('[data-node]').forEach(b=>b.addEventListener('click',()=>select(b.dataset.node)));const tip=document.querySelector('.tooltip');function showTip(e){const c=e.target.closest('[data-tooltip]');if(!c)return;tip.textContent=c.dataset.tooltip;tip.hidden=false;const r=c.getBoundingClientRect();tip.style.left=Math.min(r.left,innerWidth-310)+'px';tip.style.top=Math.max(5,r.top-42)+'px'}document.addEventListener('mouseover',showTip);document.addEventListener('focusin',showTip);document.addEventListener('click',showTip);let touchTooltip=false;document.addEventListener('pointerdown',e=>{touchTooltip=e.pointerType==='touch';if(touchTooltip){if(e.target.closest('[data-tooltip]'))showTip(e);else tip.hidden=true}});document.addEventListener('mouseout',()=>{if(!touchTooltip)tip.hidden=true});document.addEventListener('focusout',()=>{if(!touchTooltip)tip.hidden=true});document.addEventListener('keydown',e=>{if(e.key==='Tab')touchTooltip=false;if(e.key==='Escape'){tip.hidden=true;touchTooltip=false}});</script></html>`;
}
