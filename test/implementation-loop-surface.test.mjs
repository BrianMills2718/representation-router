import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { renderImplementationLoop } from "../implementation-loop-v0/render.mjs";
import { validateImplementationReceipt } from "../src/implementation-loop.mjs";

const brief = JSON.parse(await readFile(new URL("../examples/implementation-brief-explicit-save-v0.json", import.meta.url), "utf8"));
const receipt = JSON.parse(await readFile(new URL("../examples/implementation-receipt-explicit-save-v0.json", import.meta.url), "utf8"));
const buildSource = await readFile(new URL("../scripts/build-implementation-loop-v0.mjs", import.meta.url), "utf8");

const html = renderImplementationLoop({ brief, receipt: validateImplementationReceipt(receipt, brief) });

test("Implementation Loop separates intent, implementation, checks, executed evidence, and human review", () => {
  for (const token of [
    "Intent",
    "Implementation",
    "Checks",
    "Executed evidence",
    "Human review",
    "A brief is not code",
    "A test definition is not a test result",
    "green CI result is not human acceptance"
  ]) assert.ok(html.includes(token), token);
});

test("Implementation Loop pins exact candidate execution identities", () => {
  assert.ok(html.includes(receipt.candidateRevision));
  assert.ok(html.includes(receipt.ci.runId));
  assert.ok(html.includes(receipt.artifact.id));
  assert.ok(html.includes(receipt.artifact.sha256));
  assert.ok(html.includes(String(receipt.artifact.sizeBytes)));
});

test("Implementation Loop keeps planned brief verification distinct from executed receipt verification", () => {
  assert.equal(brief.verification.status, "planned-not-executed");
  assert.equal(receipt.verification.status, "executed");
  assert.equal(receipt.humanReview.status, "pending");
  assert.ok(html.includes("planned-not-executed"));
  assert.ok(html.includes("checks executed successfully"));
  assert.ok(html.includes("Review is still open"));
});

test("Implementation Loop does not substitute a later candidate rebuild for the retained receipt artifact", () => {
  assert.ok(buildSource.includes("Candidate remains pinned to retained artifact"));
  assert.equal(buildSource.includes("cp(candidateSource"), false);
  assert.ok(html.includes("separately retained candidate artifact"));
  assert.ok(html.includes(receipt.artifact.id));
});
