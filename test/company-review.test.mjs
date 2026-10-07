import { test } from 'node:test';
import assert from 'node:assert/strict';
import { attachCompanyReviewExecutionEvidence, projectReview, surfaceDigests, gitRecord } from '../src/company-review.mjs';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, cp, readFile, writeFile, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

const source=(id,value)=>({text:JSON.stringify(value),url:'https://github.com/example/repo/blob/'+ 'a'.repeat(40)+'/source.json',record:{source_id:id,repository:'example/repo',commit_sha:'a'.repeat(40),path:'source.json',record_id:id,schema_id:'test',content_digest:'sha256:'+'b'.repeat(64),role:'work_graph'}});
function inputs(){return [source('weekly',{units:[{id:'one',title:'Real source title',objective:'Read the source',status:'accepted',initiative_id:'pilot',acceptance:[{id:'ac1',criterion:'Matches the source',evidence_required:['contract tests']}],dependencies:[]},{id:'two',title:'Dependent work',objective:'Use contract',status:'blocked',dependencies:[{unit_id:'one',rationale:'Requires contract'}]}]}),source('contract',{title:'Contract', $defs:{TaskRecordV3:{required:['title']}}})];}
test('changed source fields alter the projected work without changing prepared examples',()=>{
 const [weekly,contract]=inputs();const before=projectReview(weekly,contract,'one');
 const raw=JSON.parse(weekly.text);raw.units[0].title='Changed in source';weekly.text=JSON.stringify(raw);
 const after=projectReview(weekly,contract,'one');assert.equal(after.planning.modelData.nodes[0].title,'Changed in source');assert.notEqual(surfaceDigests(before.surface).semantic_digest,surfaceDigests(after.surface).semantic_digest);
 assert.deepEqual(after.planning.modelData.edges.map(e=>[e.source,e.target]),[['one','two']]);
});
test('source revision movement changes lineage while source-independent semantics remain stable',()=>{
 const [weekly,contract]=inputs();const a=projectReview(weekly,contract,'one');const b=structuredClone(a.surface);b.source_records[0].commit_sha='c'.repeat(40);
 assert.equal(surfaceDigests(a.surface).semantic_digest,surfaceDigests(b).semantic_digest);assert.notEqual(surfaceDigests(a.surface).lineage_digest,surfaceDigests(b).lineage_digest);
});
test('missing item and mutable Git revision fail visibly',()=>{
 const [weekly,contract]=inputs();assert.throws(()=>projectReview(weekly,contract,'missing'),/Unknown review/);assert.throws(()=>gitRecord('.','main','source.json','source'),/immutable/);
});

test('required evidence stays unobserved until an exact-revision execution receipt is attached',()=>{
 const [weekly,contract]=inputs();const projected=projectReview(weekly,contract,'one');
 const criterion=projected.planning.assuranceData.criteria[0];
 assert.equal(criterion.status,'partial');
 assert.deepEqual(criterion.evidenceState.required,['contract tests']);
 assert.equal(criterion.evidenceState.status,'unobserved');
 assert.deepEqual(criterion.evidenceState.observedRefs,[]);
 assert.deepEqual(criterion.evidenceRefs,[]);
 assert.equal(projected.review.modelData.nodes[0].evidenceState.status,'unobserved');

 attachCompanyReviewExecutionEvidence(projected,{
   evidence:'1 passed in 0.01s',
   evidenceRefs:['https://github.com/example/repo/blob/'+contract.record.commit_sha+'/test.py','evidence.txt'],
   subjectRevision:contract.record.commit_sha
 });
 assert.equal(criterion.evidenceState.status,'observed');
 assert.equal(criterion.evidenceState.subjectRevision,contract.record.commit_sha);
 assert.equal(criterion.status,'partial');
 assert.equal(projected.review.modelData.nodes[0].evidenceState.status,'observed');
 assert.match(criterion.evidenceState.limitation,/does not establish/i);
});

test('Company review rejects execution evidence from a different contract revision',()=>{
 const [weekly,contract]=inputs();const projected=projectReview(weekly,contract,'one');
 assert.throws(()=>attachCompanyReviewExecutionEvidence(projected,{
   evidence:'1 passed in 0.01s',
   evidenceRefs:['evidence.txt'],
   subjectRevision:'c'.repeat(40)
 }),/does not match reviewed contract revision/);
 assert.equal(projected.planning.assuranceData.criteria[0].evidenceState.status,'unobserved');
});

test('real artifact decisions survive restart, retain evidence, and reject stale or cross-origin writes', {skip: !process.env.COMPANY_REVIEW_ARTIFACT, timeout: 20000}, async()=>{
 const scratch=await mkdtemp(resolve(tmpdir(),'company-review-test-'));
 const artifact=resolve(scratch,'artifact'),store=resolve(scratch,'decisions');
 await cp(resolve(process.env.COMPANY_REVIEW_ARTIFACT),artifact,{recursive:true});
 let child;
 const start=async()=>{
   child=spawn(process.execPath,['scripts/serve-company-review.mjs','--artifact',artifact,'--decisions-dir',store,'--port','0','--actor','test:api'],{stdio:['ignore','pipe','pipe']});
   let output='';
   return await new Promise((ok,fail)=>{
     child.once('error',fail);child.once('exit',code=>fail(new Error('Server exited '+code)));
     child.stdout.on('data',chunk=>{output+=chunk;if(output.includes('\n'))ok(JSON.parse(output.trim()).url);});
   });
 };
 const stop=async()=>{const ended=once(child,'exit');child.kill();await ended;child=null;};
 try {
   let url=await start();
   const get=async()=>await (await fetch(url+'/api/review')).json();
   const post=(body,origin=url)=>fetch(url+'/api/review',{method:'POST',headers:{'content-type':'application/json',origin},body:JSON.stringify(body)});
   const initial=await get();assert.equal(initial.decision,null);
   const body={subject:initial.session.subject,disposition:'accepted'};
   assert.equal((await post(body,'https://unrelated.example')).status,403);
   assert.equal((await post({...body,subject:{...body.subject,commit_sha:'f'.repeat(40)}})).status,409);
   const accepted=await post(body);assert.equal(accepted.status,201);
   const decision=(await accepted.json()).decision;assert.equal(decision.actor,'test:api');
   assert.equal((await post(body)).status,409);
   await stop();url=await start();
   assert.equal((await get()).decision.decision_id,decision.decision_id);
   const rejected=await post({...body,disposition:'rejected',supersedes_decision_id:decision.decision_id});assert.equal(rejected.status,201);
   assert.equal((await get()).decision.disposition,'rejected');
   const subjects=await readdir(resolve(store,'subjects'));assert.equal(subjects.length,1);
   assert.equal(await readFile(resolve(store,'subjects',subjects[0],'evidence.txt'),'utf8'),await readFile(resolve(artifact,'evidence.txt'),'utf8'));
   await writeFile(resolve(artifact,'review-session.json'),JSON.stringify({...initial.session,itemId:'changed'}));
   assert.equal((await post(body)).status,409);
 } finally {if(child)await stop();await rm(scratch,{recursive:true,force:true});}
});
