import test from "node:test";
import assert from "node:assert/strict";
import { resolveProductArtifact } from "../src/product-artifact-resolver.mjs";

const commit="a".repeat(40);
const binding={repository:"Inside-Success/twitter-prospecting",commit_sha:commit,entrypoint:"apps/twitter_prospecting/static/index.html",artifact_kind:"source_ui",render_mode:"embed",checksum:null};
const registry=[{repository:binding.repository,allowed_entrypoints:[binding.entrypoint],assets:[
  {path:"apps/twitter_prospecting/static/styles.css",kind:"style"},
  {path:"apps/twitter_prospecting/static/app.js",kind:"script"}
]}];
const files={
  "apps/twitter_prospecting/static/index.html":'<html><head><link rel="stylesheet" href="/static/styles.css?v=x"></head><body><script src="/static/app.js?v=x"></script></body></html>',
  "apps/twitter_prospecting/static/styles.css":"body{font-family:sans-serif}",
  "apps/twitter_prospecting/static/app.js":"window.__EXACT_PRODUCT__=true;"
};
const fetchFile=async({repository,commit_sha,path})=>({repository,commit_sha,path,content:files[path]});

test("resolves an allowlisted exact-revision source UI and inlines assets",async()=>{
  const out=await resolveProductArtifact(binding,{registry,fetchFile});
  assert.equal(out.repository,binding.repository);
  assert.equal(out.commit_sha,commit);
  assert.ok(out.resolved_html.includes("data-resolved-from"));
  assert.ok(out.resolved_html.includes("window.__EXACT_PRODUCT__=true"));
  assert.equal(out.sources.length,3);
  assert.match(out.output_checksum,/^sha256:[0-9a-f]{64}$/);
});
test("rejects unregistered private repository",async()=>{
  await assert.rejects(()=>resolveProductArtifact({...binding,repository:"Private/other"},{registry,fetchFile}),/unregistered product artifact repository/);
});
test("rejects mixed revisions returned by the fetch adapter",async()=>{
  const mixed=async({repository,path})=>({repository,commit_sha:"b".repeat(40),path,content:files[path]});
  await assert.rejects(()=>resolveProductArtifact(binding,{registry,fetchFile:mixed}),/mixed or incorrect revision/);
});
test("rejects missing artifact bytes",async()=>{
  const missing=async({repository,commit_sha,path})=>({repository,commit_sha,path,content:null});
  await assert.rejects(()=>resolveProductArtifact(binding,{registry,fetchFile:missing}),/no text content/);
});
test("rejects a resolved artifact checksum mismatch",async()=>{
  await assert.rejects(()=>resolveProductArtifact({...binding,checksum:"sha256:"+"0".repeat(64)},{registry,fetchFile}),/resolved product artifact checksum mismatch/);
});
