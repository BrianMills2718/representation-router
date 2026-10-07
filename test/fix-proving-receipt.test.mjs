import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { routeProblemIntent } from "../src/diagnostic-router.mjs";
import { buildImplementationPlan, validateImplementationRunnerReceipt } from "../src/implementation-runner.mjs";

const problem = JSON.parse(await readFile(new URL("../examples/problem-intent-saved-layout-reset-v0.json", import.meta.url), "utf8"));
const receipt = JSON.parse(await readFile(new URL("../examples/fix-proving-runner-receipt-v0.json", import.meta.url), "utf8"));

test("recorded Fix proving receipt validates against the diagnosis-derived implementation plan", () => {
  const routed = routeProblemIntent(problem);
  assert.equal(routed.status, "diagnosed");
  const plan = buildImplementationPlan(routed.diagnosis.implementationBrief);
  assert.equal(validateImplementationRunnerReceipt(receipt, plan), receipt);
  assert.equal(receipt.artifact.id, "10436444283");
  assert.equal(receipt.candidate.sha256, "bb69cd47ddc70a94cdfc9c0f1918cceccf056480cb78ffc2cb137d44852c5e33");
  assert.equal(receipt.humanReview.status, "pending");
});
