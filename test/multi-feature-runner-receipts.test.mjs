import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { buildImplementationPlan, validateImplementationRunnerReceipt } from "../src/implementation-runner.mjs";

const savedBrief = JSON.parse(await readFile(new URL("../examples/implementation-brief-explicit-save-v0.json", import.meta.url), "utf8"));
const evidenceBrief = JSON.parse(await readFile(new URL("../examples/implementation-brief-evidence-gap-focus-v1.json", import.meta.url), "utf8"));
const savedReceipt = JSON.parse(await readFile(new URL("../examples/implementation-runner-saved-layouts-receipt-v1.json", import.meta.url), "utf8"));
const evidenceReceipt = JSON.parse(await readFile(new URL("../examples/implementation-runner-evidence-gap-receipt-v0.json", import.meta.url), "utf8"));

test("fresh Saved Graph Layouts receipt validates against normalized v0 plan", () => {
  const plan = buildImplementationPlan(savedBrief);
  assert.equal(validateImplementationRunnerReceipt(savedReceipt, plan), savedReceipt);
  assert.equal(savedReceipt.runtime.id, "saved-graph-layouts-runtime/v0");
  assert.equal(savedReceipt.artifact.id, "10435509857");
  assert.equal(savedReceipt.candidate.sha256, "14932f5e8cf5048b3e2d399212a8c7b07ce7998b9ad36c649dfbcac13fcfd95c");
});

test("Evidence Gap Focus receipt validates against v1 plan", () => {
  const plan = buildImplementationPlan(evidenceBrief);
  assert.equal(validateImplementationRunnerReceipt(evidenceReceipt, plan), evidenceReceipt);
  assert.equal(evidenceReceipt.runtime.id, "evidence-gap-focus-runtime/v0");
  assert.equal(evidenceReceipt.artifact.id, "10435798573");
  assert.equal(evidenceReceipt.candidate.sha256, "06f6e6f9d2801c96d28048af6ca179e90d1949a888974d0790c792c165b29d43");
});

test("receipts cannot be substituted across feature families", () => {
  assert.throws(() => validateImplementationRunnerReceipt(savedReceipt, buildImplementationPlan(evidenceBrief)), /featureId/);
  assert.throws(() => validateImplementationRunnerReceipt(evidenceReceipt, buildImplementationPlan(savedBrief)), /featureId/);
});
