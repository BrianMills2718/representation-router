import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { renderEngineeringHome } from "../src/engineering-home.mjs";

const buildScript = await readFile(new URL("../scripts/build-engineering-home-v0.mjs", import.meta.url), "utf8");
const html = renderEngineeringHome();

test("Engineering Home leads with jobs and visible readiness instead of internal surface names", () => {
  for (const token of ["What are you trying to do?", "Build something", "Fix something", "Understand the system", "Review a change", "Release something", "ready", "partial"]) {
    assert.ok(html.includes(token), token);
  }
  assert.ok(html.includes("Choose the work, not the internal tool"));
});

test("refreshed Engineering Home routes Build/Fix/Release while keeping Release staging-only", () => {
  assert.ok(html.includes("workflows/understand/index.html"));
  assert.ok(html.includes("workflows/review/index.html"));
  assert.ok(html.includes("workflows/studio/index.html"));
  assert.ok(html.includes("workflows/implementation/index.html"));
  assert.ok(html.includes("workflows/fix-proof/index.html"));
  assert.ok(html.includes("workflows/release/index.html"));
  assert.ok(html.includes("repository-ci-staging-only-no-production-authority"));
  assert.ok(html.includes("Product-owned production deployment target and credentials"));
});

test("Engineering Home exposes plain-language routing but no network or write API", () => {
  assert.ok(html.includes("Find workspace"));
  assert.ok(html.includes("No reliable task match"));
  assert.equal(html.includes("fetch("), false);
  assert.equal(html.includes("XMLHttpRequest"), false);
  assert.equal(html.includes("github.com/repos"), false);
});

test("Engineering Home makes lifecycle maturity explicit without a single completion score", () => {
  for (const token of ["Outcome", "Requirements", "Design", "Implement", "Verify", "Review", "Release", "Operate", "No single completion percentage"]) {
    assert.ok(html.includes(token), token);
  }
  assert.ok(html.includes("Engineering Studio v1"));
  assert.ok(html.includes("production is not connected"));
});

test("Engineering Home build copies exact prerequisite surfaces and can bundle release evidence", () => {
  for (const token of [
    "artifacts/review-workbench-v1.2",
    "artifacts/implementation-runner-evidence-gap-v0",
    "artifacts/engineering-studio-v1",
    "artifacts/implementation-runner-saved-layouts-v0",
    "artifacts/fix-proving-v0",
    "workflows/understand",
    "workflows/review",
    "workflows/studio",
    "workflows/implementation",
    "workflows/fix-proof",
    'id: "release"',
    "workflows/release",
    "sourceHash !== copiedHash",
    "releaseEvidenceBundled",
    "bundle-manifest.json"
  ]) assert.ok(buildScript.includes(token), token);
});

test("prerelease Home overrides Release/Operate to unavailable until release evidence is bundled", () => {
  assert.ok(buildScript.includes("prereleaseTasks"));
  assert.ok(buildScript.includes("no-release-route-in-prerelease-home"));
  assert.ok(buildScript.includes("prereleaseLifecycle"));
});
