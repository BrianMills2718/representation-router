import http from 'node:http';
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { resolve, sep, extname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { digest } from '../src/company-review.mjs';

const args=process.argv.slice(2);
const arg=(key,fallback)=>{const i=args.indexOf(key);return i<0?fallback:args[i+1];};
const root=resolve(arg('--artifact','artifacts/weekly-plans-review'));
const storeArg=arg('--decisions-dir');
if(!storeArg) throw new Error('--decisions-dir is required; choose a persistent directory outside the generated artifact');
const store=resolve(storeArg);
if(store===root || store.startsWith(root+sep)) throw new Error('Decision store must survive artifact rebuilds');
mkdirSync(store,{recursive:true});
const session=JSON.parse(readFileSync(resolve(root,'review-session.json'),'utf8'));
const port=Number(arg('--port','4321'));
const python=arg('--python','python3');
const actor=arg('--actor','local-reviewer');
const identity=JSON.stringify(session.subject);
const evidence=readFileSync(resolve(root,'evidence.txt'),'utf8');
if(digest(evidence)!==session.evidenceDigest) throw new Error('Evidence does not match this review session');
const retainedNames=['review-session.json','surface.json','planning-model.json','review-model.json','review-decision.schema.json','evidence.txt'];
const retained=new Map(retainedNames.map(name=>[name,readFileSync(resolve(root,name))]));
function decisions() { return readdirSync(store).filter(n=>/^review-[0-9a-f-]+\.json$/.test(n)).sort().map(n=>JSON.parse(readFileSync(resolve(store,n),'utf8'))).filter(d=>JSON.stringify(d.review_subject)===identity); }
function latest() { const all=decisions(),superseded=new Set(all.map(d=>d.supersedes_decision_id));const active=all.filter(d=>!superseded.has(d.decision_id));if(active.length>1) throw new Error('Conflicting review decisions need explicit resolution');return active[0]??null; }
const server=http.createServer(async(req,res)=>{
  const send=(status,value)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(value));};
  try {
    const host='127.0.0.1:'+server.address().port;
    if(req.headers.host!==host && req.headers.host!=='localhost:'+server.address().port) return send(403,{error:'Unexpected host'});
    const url=new URL(req.url,'http://'+host);
    if(req.method==='GET' && url.pathname==='/favicon.ico') {res.writeHead(204);return res.end();}
    if(url.pathname==='/api/review' && readFileSync(resolve(root,'review-session.json'),'utf8')!==retained.get('review-session.json').toString()) return send(409,{error:'Artifact rebuilt; restart the review service and reload before deciding'});
    if(req.method==='GET' && url.pathname==='/api/review') return send(200,{session,decision:latest(),storage:'persistent-local-record'});
    if(req.method==='POST' && url.pathname==='/api/review') {
      if(req.headers.origin!=='http://'+req.headers.host || !req.headers['content-type']?.startsWith('application/json')) return send(403,{error:'Same-origin JSON requests required'});
      let body='';for await(const chunk of req){body+=chunk;if(body.length>16384)return send(413,{error:'Request too large'});}
      const input=JSON.parse(body);
      if(JSON.stringify(input.subject)!==identity) return send(409,{error:'Review target changed; reload before deciding'});
      if(!['accepted','rejected'].includes(input.disposition)) return send(400,{error:'This review entrypoint supports accepted or rejected decisions'});
      const previous=latest();
      if((input.supersedes_decision_id??null)!==(previous?.decision_id??null))return send(409,{error:'Another decision was recorded; reload before deciding'});
      const record={schema_version:'review-decision.v1',decision_id:'review-'+randomUUID(),review_subject:session.subject,disposition:input.disposition,actor,decided_at:new Date().toISOString(),evidence_refs:[session.evidenceDigest],supersedes_decision_id:previous?.decision_id??null};
      // Validate with the owning schema before an exclusive append.
      execFileSync(python,['-c','import json,sys,jsonschema; jsonschema.Draft202012Validator(json.load(open(sys.argv[1])),format_checker=jsonschema.FormatChecker()).validate(json.load(sys.stdin))',resolve(root,'review-decision.schema.json')],{input:JSON.stringify(record)});
      const snapshot=resolve(store,'subjects',digest(session.subject).slice(7));
      mkdirSync(snapshot,{recursive:true});
      for(const [name,bytes] of retained) {
        try { writeFileSync(resolve(snapshot,name),bytes,{flag:'wx'}); }
        catch(error) { if(error.code!=='EEXIST' || !readFileSync(resolve(snapshot,name)).equals(bytes)) throw error; }
      }
      writeFileSync(resolve(store,record.decision_id+'.json'),JSON.stringify(record,null,2)+'\n',{flag:'wx'});
      return send(201,{decision:record,storage:'persistent-local-record'});
    }
    if(req.method!=='GET')return send(405,{error:'Method not supported'});
    const path=resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
    if(!path.startsWith(root+sep))return send(403,{error:'Outside artifact'});
    const mime={'.html':'text/html','.json':'application/json','.txt':'text/plain','.png':'image/png'};
    const bytes=readFileSync(path);
    res.writeHead(200,{'content-type':mime[extname(path)]||'application/octet-stream','cache-control':'no-store'});res.end(bytes);
  }catch(error){if(!res.headersSent)send(400,{error:error.message});else res.end();}
});
server.listen(port,'127.0.0.1',()=>console.log(JSON.stringify({url:'http://127.0.0.1:'+server.address().port,decisionStore:store,subject:session.subject,actor})));
