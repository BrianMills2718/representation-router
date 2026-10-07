import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import {
  IMPLEMENTATION_PLAN_SCHEMA_VERSION,
  IMPLEMENTATION_RUN_SCHEMA_VERSION,
  IMPLEMENTATION_RUNNER_RECEIPT_SCHEMA_VERSION,
  buildImplementationPlan,
  describeDryRun,
  listImplementationAdapters,
  prepareImplementationRun,
  routeImplementationBrief,
  validateImplementationRunnerReceipt
} from "../src/implementation-runner.mjs";

const savedBrief = JSON.parse(await readFile(new URL("../examples/implementation-brief-explicit-save-v0.json", import.meta.url), "utf8"));
const evidenceBrief = JSON.parse(await readFile(new URL("../examples/implementation-brief-evidence-gap-focus-v1.json", import.meta.url), "utf8"));

function copy(value) {
  return JSON.parse(JSON.stringify(value));
}

test("runner registers two feature families with separate runtimes", () => {
  assert.deepEqual(listImplementationAdapters(), [
    {
      adapterId: "saved-graph-layouts/v0",
      version: "0.1",
      featureId: "saved-graph-layouts",
      briefSchemaVersions: ["implementation-brief/v0", "implementation-brief/v1"],
      runtimeId: "saved-graph-layouts-runtime/v0"
    },
    {
      adapterId: "evidence-gap-focus/v0",
      version: "0.1",
      featureId: "evidence-gap-focus",
      briefSchemaVersions: ["implementation-brief/v1"],
      runtimeId: "evidence-gap-focus-runtime/v0"
    }
  ]);
});

test("legacy saved-layout v0 brief still routes through its original adapter identity", () => {
  const routed = routeImplementationBrief(savedBrief);
  assert.equal(routed.status, "supported");
  assert.equal(routed.adapterId, "saved-graph-layouts/v0");
  assert.equal(routed.adapterVersion, "0.1");
  assert.equal(routed.brief.sourceSchemaVersion, "implementation-brief/v0");
  assert.equal(routed.adapter.runtime.id, "saved-graph-layouts-runtime/v0");
});

test("evidence-gap v1 brief routes through a different adapter and runtime", () => {
  const routed = routeImplementationBrief(evidenceBrief);
  assert.equal(routed.status, "supported");
  assert.equal(routed.adapterId, "evidence-gap-focus/v0");
  assert.equal(routed.brief.sourceSchemaVersion, "implementation-brief/v1");
  assert.equal(routed.adapter.runtime.id, "evidence-gap-focus-runtime/v0");

  const savedPlan = buildImplementationPlan(savedBrief);
  const evidencePlan = buildImplementationPlan(evidenceBrief);
  assert.notEqual(savedPlan.adapter.id, evidencePlan.adapter.id);
  assert.notEqual(savedPlan.runtime.id, evidencePlan.runtime.id);
});

test("unknown feature ids abstain instead of guessing an implementation", () => {
  const unknown = copy(evidenceBrief);
  unknown.featureId = "unknown-product-feature";
  const routed = routeImplementationBrief(unknown);
  assert.equal(routed.status, "unsupported");
  assert.match(routed.reasons.join(" "), /No implementation adapter is registered/);
});

test("feature-specific invalid values are rejected by the adapter after generic v1 validation", () => {
  const invalid = copy(evidenceBrief);
  invalid.decisions.find((item) => item.id === "grouping").value = "three-dimensional-pile";
  const routed = routeImplementationBrief(invalid);
  assert.equal(routed.status, "unsupported");
  assert.match(routed.reasons.join(" "), /grouping three-dimensional-pile is unsupported/);
});

test("stale baselines and authority-expanding saved-layout constraints are rejected", () => {
  const stale = copy(savedBrief);
  stale.baselineRevision = "different-baseline";
  const staleRoute = routeImplementationBrief(stale);
  assert.equal(staleRoute.status, "unsupported");
  assert.match(staleRoute.reasons.join(" "), /baseline revision/);

  const cloud = copy(savedBrief);
  cloud.decisions.storageScope = "cloud-account";
  const cloudRoute = routeImplementationBrief(cloud);
  assert.equal(cloudRoute.status, "unsupported");
  assert.match(cloudRoute.reasons.join(" "), /browser-local/);
});

test("both implementation plans are deterministic and expose runtime plus authority", () => {
  for (const brief of [savedBrief, evidenceBrief]) {
    const first = buildImplementationPlan(brief);
    const second = buildImplementationPlan(copy(brief));
    assert.deepEqual(first, second);
    assert.equal(first.schemaVersion, IMPLEMENTATION_PLAN_SCHEMA_VERSION);
    assert.equal(first.status, "planned");
    assert.ok(first.runtime.id.endsWith("/v0"));
    assert.ok(first.behaviorChanges.length >= 3);
    assert.ok(first.fixedConstraints.length >= 5);
    assert.equal(first.authority.browserRepositoryWrite, false);
    assert.equal(first.authority.automaticMerge, false);
  }
});

test("dry run returns the plan and declares zero side effects for both feature families", () => {
  for (const brief of [savedBrief, evidenceBrief]) {
    const dry = describeDryRun(brief);
    assert.equal(dry.status, "dry-run");
    assert.deepEqual(dry.sideEffects, []);
    assert.equal(dry.plan.status, "planned");
  }
});

test("prepare run derives feature-specific candidate specs from the exact same plans", () => {
  const savedRun = prepareImplementationRun(savedBrief);
  assert.equal(savedRun.schemaVersion, IMPLEMENTATION_RUN_SCHEMA_VERSION);
  assert.equal(savedRun.status, "ready");
  assert.equal(savedRun.plan.runtime.id, "saved-graph-layouts-runtime/v0");
  assert.equal(savedRun.candidateSpec.decisions.rememberMode, "explicit-save");
  assert.equal(savedRun.candidateSpec.authority.semanticGraphWrite, false);

  const evidenceRun = prepareImplementationRun(evidenceBrief);
  assert.equal(evidenceRun.status, "ready");
  assert.equal(evidenceRun.plan.runtime.id, "evidence-gap-focus-runtime/v0");
  assert.equal(evidenceRun.candidateSpec.decisions.defaultFocus, "gaps-first");
  assert.equal(evidenceRun.candidateSpec.decisions.grouping, "by-requirement");
  assert.equal(evidenceRun.candidateSpec.authority.requirementWrite, false);
  assert.equal(evidenceRun.candidateSpec.authority.evidenceWrite, false);
});

test("alternate saved-layout decisions still change generated spec without changing fixed authority", () => {
  const alternate = copy(savedBrief);
  alternate.decisions.rememberMode = "automatic-after-drag";
  alternate.decisions.saveReceipt = "quiet";
  alternate.decisions.resetMode = "immediate-reset";

  const run = prepareImplementationRun(alternate);
  assert.equal(run.status, "ready");
  assert.equal(run.candidateSpec.decisions.rememberMode, "automatic-after-drag");
  assert.equal(run.candidateSpec.decisions.saveReceipt, "quiet");
  assert.equal(run.candidateSpec.decisions.resetMode, "immediate-reset");
  assert.equal(run.candidateSpec.decisions.storageScope, "browser-local");
});

test("execution receipt must match the exact plan/runtime and keeps human review pending", () => {
  const plan = buildImplementationPlan(evidenceBrief);
  const receipt = {
    schemaVersion: IMPLEMENTATION_RUNNER_RECEIPT_SCHEMA_VERSION,
    featureId: plan.featureId,
    baselineRevision: plan.baselineRevision,
    adapter: { ...plan.adapter },
    runtime: { ...plan.runtime },
    runnerRevision: "runner-head",
    executedChecks: [
      { name: "npm test", status: "passed" },
      { name: "build Evidence Gap Focus candidate", status: "passed" }
    ],
    ci: { runId: "123", conclusion: "success" },
    artifact: { id: "456", name: "implementation-runner-evidence-gap-v0", sha256: "abc" },
    statement: "Checks executed successfully on the exact runner head.",
    humanReview: { status: "pending" }
  };
  assert.equal(validateImplementationRunnerReceipt(receipt, plan), receipt);

  const wrongRuntime = copy(receipt);
  wrongRuntime.runtime.id = "wrong-runtime";
  assert.throws(() => validateImplementationRunnerReceipt(wrongRuntime, plan), /runtime/);

  const accepted = copy(receipt);
  accepted.humanReview.status = "accepted";
  assert.throws(() => validateImplementationRunnerReceipt(accepted, plan), /human review pending/);
});
