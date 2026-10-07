import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value==='object' ? Object.fromEntries(Object.keys(value).sort().map(k=>[k.normalize('NFC'),canonical(value[k])])) : typeof value==='string'?value.normalize('NFC'):value;
export const digest = (value) => 'sha256:' + createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(canonical(value))).digest('hex');
export function surfaceDigests(surface) {
  const keys={nodes:'node_id',ports:'port_id',edges:'edge_id',contract_bindings:'binding_id',business_rules:'rule_id',human_actions:'action_id',evidence_claims:'claim_id'};
  const sorted=(items,key)=>[...items].sort((a,b)=>a[key]<b[key]?-1:a[key]>b[key]?1:0);
  const semantic={schema_version:surface.schema_version,surface_id:surface.surface_id,surface_type:surface.surface_type,scope_ref:{kind:surface.scope_ref.kind,id:surface.scope_ref.id},review_intent:surface.review_intent};
  for(const [key,id] of Object.entries(keys))semantic[key]=sorted(surface[key],id);
  const lineage={source_records:sorted(surface.source_records,'source_id'),provenance_bindings:sorted(surface.provenance_bindings,'target_ref').map(b=>({...b,input_source_refs:[...b.input_source_refs].sort((a,c)=>(a.source_id+'\0'+a.source_pointer).localeCompare(c.source_id+'\0'+c.source_pointer))}))};
  return {semantic_digest:digest(semantic),lineage_digest:digest(lineage)};
}
export function gitRecord(repo, revision, path, sourceId, role = 'declaration') {
  if (!/^[0-9a-f]{40}$/.test(revision)) throw new Error('A full immutable commit SHA is required');
  if (path.startsWith('/') || path.split('/').includes('..')) throw new Error('Expected repository-relative source path');
  const git = (...args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  git('cat-file', '-e', revision + '^{commit}');
  const origin = git('remote', 'get-url', 'origin').trim();
  let match = origin.match(/github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?$/);
  if (!match) {
    const ssh=origin.match(/^git@([^:]+):([^/]+\/[^/]+?)(?:\.git)?$/);
    if(ssh && /^[a-zA-Z0-9.-]+$/.test(ssh[1])) {
      const config=execFileSync('ssh',['-G',ssh[1]],{encoding:'utf8',stdio:['ignore','pipe','ignore']});
      if(/^hostname github\.com$/m.test(config)) match=[origin,ssh[2]];
    }
  }
  if (!match) throw new Error('Source must have an explicit GitHub repository identity');
  const text = git('show', revision + ':' + path);
  return { text, record: { source_id: sourceId, repository: match[1], commit_sha: revision, path,
    record_id: sourceId, schema_id: 'urn:source:' + sourceId, content_digest: digest(text), role },
    url: 'https://github.com/' + match[1] + '/blob/' + revision + '/' + path };
}

function unobservedEvidenceState(required, subjectRevision, limitation) {
  return {
    status: 'unobserved',
    subjectRevision,
    required: [...new Set(required ?? [])],
    observedRefs: [],
    limitation
  };
}

export function attachCompanyReviewExecutionEvidence(result, { evidence, evidenceRefs, subjectRevision }) {
  if (!result?.surface || !result?.planning?.assuranceData || !result?.review?.modelData?.nodes?.[0]) throw new Error('Projected Company review is required');
  if (typeof evidence !== 'string' || !evidence.trim()) throw new Error('Execution evidence text is required');
  if (!Array.isArray(evidenceRefs) || evidenceRefs.length === 0 || evidenceRefs.some(ref => typeof ref !== 'string' || !ref.trim())) throw new Error('At least one execution evidence reference is required');
  const contractRecord = result.surface.source_records.find(record => record.source_id === 'contract');
  if (!contractRecord) throw new Error('Company review contract source record is required');
  if (subjectRevision !== contractRecord.commit_sha) {
    throw new Error(`Execution evidence revision ${subjectRevision} does not match reviewed contract revision ${contractRecord.commit_sha}`);
  }

  const observedRefs = [...new Set(evidenceRefs)];
  result.planning.assuranceData.criteria.forEach(criterion => {
    const required = criterion.evidenceState?.required ?? [];
    criterion.evidence = evidence;
    criterion.evidenceRefs = observedRefs;
    criterion.status = 'partial';
    criterion.nonClaim = 'Tests passed; inspect whether their scope covers your criterion.';
    criterion.evidenceState = {
      status: 'observed',
      subjectRevision,
      required,
      observedRefs,
      limitation: 'Exact-revision contract tests executed, but execution alone does not establish that every acceptance criterion is satisfied.'
    };
  });

  const reviewNode = result.review.modelData.nodes[0];
  const required = reviewNode.evidenceState?.required ?? [];
  reviewNode.evidence = evidence;
  reviewNode.nonClaim = 'These tests exercise contract behavior and fixtures. They do not establish live company coverage, deployment, or human acceptance.';
  reviewNode.evidenceState = {
    status: 'observed',
    subjectRevision,
    required,
    observedRefs,
    limitation: reviewNode.nonClaim
  };
  return result;
}

export function projectReview(weekly, contract, itemId) {
  const graph = JSON.parse(weekly.text), schema = JSON.parse(contract.text);
  const itemIndex = graph.units.findIndex(u => u.id === itemId);
  if (itemIndex < 0) throw new Error('Unknown review work item: ' + itemId);
  const item = graph.units[itemIndex];
  const source = { label: 'Committed weekly plan', revision: weekly.record.repository + '@' + weekly.record.commit_sha, freshness: 'Pinned snapshot' };
  const common = { id: 'company-review', concern: 'What is planned, what does the implemented contract contain, and what evidence supports review?',
    informationStructure: ['network'], tasks: ['inspect', 'trace'], entities: ['work', 'contract', 'evidence'], relationships: ['depends-on'], representationRole: 'audit' };
  const nodes = graph.units.map(u => ({ id: u.id, title: u.title, summary: u.objective, phase: 'Work', status: u.status,
    sourceRef: weekly.url, evidence: 'Recorded work state: ' + u.status, nonClaim: 'Recorded status alone does not prove the outcome.',
    risks: u.readiness?.failed_guards ?? [], traceRefs: u.id === itemId ? [{ view: 'architecture', id: 'contract', label: 'Inspect implemented data contract' }, { view: 'review', id: itemId, label: 'Review this output' }] : [] }));
  const edges = graph.units.flatMap(u => (u.dependencies ?? []).map((d, i) => ({ id: u.id + '-dep-' + i, source: d.unit_id, target: u.id, label: d.rationale || 'prerequisite' })));
  const wanted = ['TaskRecordV3', 'SourceRevision', 'SourceRecordRef', 'TaskDependencyV1', 'EffortEstimateV1', 'EffortActualV1', 'TaskProgressEventV1', 'CompanyWorkGraphProgressReceiptV1'];
  const defs = wanted.filter(id => schema.$defs?.[id]);
  const archNodes = [{ id: 'contract', title: schema.title || 'Company work graph contract', summary: 'Implemented JSON Schema. Expand linked definitions to inspect required fields and validation rules.', phase: 'Data architecture', status: 'current', sourceRef: contract.url, evidence: 'Exact committed schema bytes inspected.', nonClaim: 'Schema structure is not runtime topology or proof of live execution.', traceRefs: [{ view: 'plan', id: itemId, label: item.title }] },
    ...defs.map(id => ({ id, title: id.replace(/([a-z])([A-Z])/g, '$1 $2'), summary: 'Required fields: ' + (schema.$defs[id].required ?? []).join(', '), phase: 'Data definition', status: 'current', sourceRef: contract.url, evidence: JSON.stringify(schema.$defs[id], null, 2), nonClaim: 'This is a data contract definition, not a deployed component.', traceRefs: [{view:'review',id:itemId,label:'Review contract evidence'}] }))];
  const archEdges = defs.map(id => ({ id: 'defines-' + id, source: 'contract', target: id, label: 'defines' }));
  const criteria = item.acceptance.map(a => ({
    id: a.id,
    title: a.criterion,
    reviewPrompt: a.negative_control || 'Inspect the execution evidence before accepting.',
    summary: a.criterion,
    phase: 'Acceptance',
    status: 'partial',
    architectureRefs: ['contract'],
    workRefs: [itemId],
    evidenceRefs: [],
    evidence: 'Required evidence: ' + a.evidence_required.join('; '),
    evidenceState: unobservedEvidenceState(
      a.evidence_required,
      contract.record.commit_sha,
      'Evidence requirements are recorded, but no execution receipt has been attached to this projection.'
    ),
    nonClaim: 'Requirements and evidence requirements are not passing test results.',
    sourceRef: weekly.url,
    traceRefs: [{ view: 'review', id: itemId, label: 'Inspect retained evidence' }]
  }));
  const reviewRequiredEvidence = [...new Set(item.acceptance.flatMap(a => a.evidence_required ?? []))];
  const planning = { ...common, modelData: { source, nodes, edges, edgeConvention: 'Arrows: prerequisite → dependent work' }, architectureData: { concern: 'What does the implemented company work-graph data contract contain?', source: { ...source, revision: contract.record.repository + '@' + contract.record.commit_sha }, nodes: archNodes, edges: archEdges }, assuranceData: { source, concern: 'Does the evidence support this acceptance criterion?', criteria, risks: [{ id: 'review-boundary', severity: 'medium', title: 'Acceptance needs evidence', mitigation: 'Recorded work status and schema presence do not prove the tests passed.' }] } };
  const review = { ...common, concern: 'Should this exact contract and its evidence be accepted?', modelData: { source, nodes: [{ ...nodes[itemIndex], phase: 'Review', status: 'awaiting_review', reviewPrompt: item.acceptance.map(a => a.criterion).join(' '), changedArtifacts: [contract.url], evidenceState: unobservedEvidenceState(reviewRequiredEvidence, contract.record.commit_sha, 'The review projection knows what evidence is required but has not observed an execution receipt yet.'), traceRefs: [{view:'architecture',id:'contract',label:'Inspect data architecture'}, {view:'assurance',id:criteria[0].id,label:'Inspect acceptance criteria'}] }], edges: [] } };
  const surface = { schema_version: 'planning-review-surface.v1', surface_id: 'weekly-' + itemId, surface_type: 'work_dependency', scope_ref: { kind: 'work_unit_graph', id: graph.initiative_id || item.initiative_id, revision: weekly.record.commit_sha }, review_intent: { mode: 'validate', prompt: review.concern }, source_records: [weekly.record, contract.record], nodes: [], ports: [], edges: [], contract_bindings: [], business_rules: [], human_actions: [], evidence_claims: [], provenance_bindings: [] };
  const bind = (target, pointer, sourceId = weekly.record.source_id) => surface.provenance_bindings.push({ target_ref: target, derivation_kind: 'direct', derivation_rule_id: null, input_source_refs: [{ source_id: sourceId, source_pointer: pointer }] });
  graph.units.forEach((u,i) => { surface.nodes.push({ node_id:u.id,kind:'artifact',label:u.title,owner_boundary:'weekly-plans',implementation_state:['accepted','completed'].includes(u.status)?'implemented':'planned',evidence_origin:'none',evidence_review_state:'unreviewed' }); bind('node:'+u.id,'/units/'+i); });
  graph.units.forEach((u,i) => (u.dependencies ?? []).forEach((d,j) => { const id=u.id+'-dep-'+j; surface.ports.push({port_id:id+'-out',node_id:d.unit_id,direction:'output',contract_ref:null},{port_id:id+'-in',node_id:u.id,direction:'input',contract_ref:null});surface.edges.push({edge_id:id,from_port:id+'-out',to_port:id+'-in',edge_type:'dependency',label:d.rationale || 'prerequisite',contract_ref:null}); for(const target of ['port:'+id+'-out','port:'+id+'-in','edge:'+id]) bind(target,'/units/'+i+'/dependencies/'+j); }));
  archNodes.forEach(n=>{surface.nodes.push({node_id:'schema-'+n.id,kind:'contract',label:n.title,owner_boundary:'company-planning',implementation_state:'implemented',evidence_origin:'observed',evidence_review_state:'unreviewed'});bind('node:schema-'+n.id,n.id==='contract'?'/':'/$defs/'+n.id,'contract');});
  return { planning, review, surface };
}
