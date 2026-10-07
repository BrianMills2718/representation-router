import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { listDiagnosticCapabilities, routeProblemIntent } from "../src/diagnostic-router.mjs";
import { normalizeProblemIntent } from "../src/problem-intent.mjs";
import { routeImplementationBrief } from "../src/implementation-runner.mjs";

const problem = JSON.parse(await readFile(new URL("../examples/problem-intent-saved-layout-reset-v0.json", import.meta.url), "utf8"));
function copy(value) { return JSON.parse(JSON.stringify(value)); }

test("problem-intent/v0 is revision-bound and handoff-only", () => {
  const normalized = normalizeProblemIntent(problem);
  assert.equal(normalized.baselineRevision, "b61f210a2e8749ca18ce78b61a0411fa62eafecd");
  assert.equal(normalized.authority.effect, "handoff-only");
  assert.equal(normalized.authority.repositoryWrite, false);
  assert.equal(normalized.reproductionSteps.length, 4);
});

test("diagnostic registry exposes the supported reset-safety problem without pretending broad diagnosis", () => {
  assert.deepEqual(listDiagnosticCapabilities(), [{
    adapterId: "saved-layout-reset-safety/v0",
    version: "0.1",
    affectedCapability: "saved-graph-layouts",
    title: "Reset positions clears an arrangement too easily",
    summary: "Use this when Reset positions removes a saved arrangement without the confirmation behavior you expected.",
    signalId: "reset-problem",
    signalValue: "clears-without-confirmation"
  }]);
});

test("supported reset problem diagnoses to one implementation-brief/v1 and existing implementation adapter", () => {
  const result = routeProblemIntent(problem);
  assert.equal(result.status, "diagnosed");
  assert.equal(result.adapter.id, "saved-layout-reset-safety/v0");
  assert.equal(result.diagnosis.proposedChange.decisionId, "reset-mode");
  assert.equal(result.diagnosis.proposedChange.from, "immediate-reset");
  assert.equal(result.diagnosis.proposedChange.to, "confirm-before-reset");
  const brief = result.diagnosis.implementationBrief;
  assert.equal(brief.schemaVersion, "implementation-brief/v1");
  assert.equal(brief.decisions.find((item) => item.id === "reset-mode").value, "confirm-before-reset");
  assert.equal(brief.decisions.find((item) => item.id === "remember-mode").value, "automatic-after-drag");
  const implementation = routeImplementationBrief(brief);
  assert.equal(implementation.status, "supported");
  assert.equal(implementation.adapterId, "saved-graph-layouts/v0");
});

test("unknown capability and unsupported symptom abstain instead of guessing a fix", () => {
  const unknown = copy(problem);
  unknown.affectedCapability = "payment-service";
  assert.equal(routeProblemIntent(unknown).status, "unsupported");

  const otherReset = copy(problem);
  otherReset.signals.find((item) => item.id === "reset-problem").value = "layout-looks-ugly";
  const result = routeProblemIntent(otherReset);
  assert.equal(result.status, "unsupported");
  assert.match(result.reasons.join(" "), /reset-problem/);
});

test("diagnosis never claims implementation or executed evidence", () => {
  const diagnosis = routeProblemIntent(problem).diagnosis;
  assert.ok(diagnosis.nonclaims.some((item) => /does not change product state or source code/i.test(item)));
  assert.ok(diagnosis.nonclaims.some((item) => /planned checks/i.test(item)));
  assert.equal(diagnosis.implementationBrief.verification.status, "planned-not-executed");
});
