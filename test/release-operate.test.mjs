import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEPLOYMENT_RECEIPT_SCHEMA_VERSION,
  RELEASE_PLAN_SCHEMA_VERSION,
  ROLLBACK_RECEIPT_SCHEMA_VERSION,
  RUNTIME_OBSERVATION_SCHEMA_VERSION,
  buildDeploymentReceipt,
  buildReleasePlan,
  buildRollbackReceipt,
  buildRuntimeObservation,
  releaseCapabilitySummary,
  validateReleaseIntent
} from "../src/release-operate.mjs";

const intent = {
  schemaVersion: "release-intent/v0",
  releaseId: "release-1",
  subject: { id: "engineering-home-v0", sourcePath: "artifacts/home" },
  target: { id: "rr-ci-staging", owner: "repository CI", environmentClass: "ci-staging-sandbox" },
  authority: { actor: "GitHub Actions repository CI", basis: "repository CI staging", scope: "ephemeral CI staging only" },
  verification: [{ id: "root", description: "root responds" }],
  rollback: { required: true, previousSourcePath: "artifacts/previous" },
  humanReview: { status: "pending" }
};

const source = {
  root: "/source",
  bundleSha256: "source-hash",
  files: [{ path: "index.html", bytes: 10, sha256: "source-index" }]
};
const previous = {
  root: "/previous",
  bundleSha256: "previous-hash",
  files: [{ path: "index.html", bytes: 8, sha256: "previous-index" }]
};

test("release intent authorizes repository CI staging but rejects production-like targets", () => {
  const value = validateReleaseIntent(intent);
  assert.equal(value.target.environmentClass, "ci-staging-sandbox");
  assert.equal(value.rollback.required, true);

  const production = structuredClone(intent);
  production.target.environmentClass = "production";
  assert.throws(() => validateReleaseIntent(production), /production is not connected or authorized/);

  const noRollback = structuredClone(intent);
  noRollback.rollback.required = false;
  assert.throws(() => validateReleaseIntent(noRollback), /rollback.required/);
});

test("release plan pins distinct source and previous staged snapshots", () => {
  const plan = buildReleasePlan(intent, { source, previous });
  assert.equal(plan.schemaVersion, RELEASE_PLAN_SCHEMA_VERSION);
  assert.equal(plan.subject.snapshot.bundleSha256, "source-hash");
  assert.equal(plan.previous.snapshot.bundleSha256, "previous-hash");
  assert.equal(plan.deployment.requireHashMatch, true);
  assert.equal(plan.rollback.reapplyIntendedReleaseAfterProof, true);
  assert.equal(plan.humanReview.status, "pending");

  assert.throws(() => buildReleasePlan(intent, { source, previous: { ...previous, bundleSha256: "source-hash" } }), /must be distinct/);
});

test("deployment receipt exists only when deployed bytes match the release subject", () => {
  const plan = buildReleasePlan(intent, { source, previous });
  const receipt = buildDeploymentReceipt({ plan, deployedSnapshot: source });
  assert.equal(receipt.schemaVersion, DEPLOYMENT_RECEIPT_SCHEMA_VERSION);
  assert.equal(receipt.hashMatch, true);
  assert.equal(receipt.status, "executed");
  assert.throws(() => buildDeploymentReceipt({ plan, deployedSnapshot: previous }), /does not match release subject/);
});

test("runtime observation requires executed HTTP 200 checks and keeps nonclaims visible", () => {
  const plan = buildReleasePlan(intent, { source, previous });
  const observation = buildRuntimeObservation({
    plan,
    phase: "after-deployment",
    baseUrl: "http://127.0.0.1:1234",
    checks: [{ id: "root", path: "/", status: "passed", httpStatus: 200, assertion: "root marker found" }]
  });
  assert.equal(observation.schemaVersion, RUNTIME_OBSERVATION_SCHEMA_VERSION);
  assert.equal(observation.status, "observed");
  assert.ok(observation.doesNotProve.some((item) => /Production/.test(item)));

  assert.throws(() => buildRuntimeObservation({
    plan,
    phase: "broken",
    baseUrl: "http://127.0.0.1:1234",
    checks: [{ id: "root", path: "/", status: "failed", httpStatus: 500, assertion: "failed" }]
  }), /every recorded HTTP check passed/);
});

test("rollback receipt requires exact previous bytes plus a successful observation", () => {
  const plan = buildReleasePlan(intent, { source, previous });
  const observation = buildRuntimeObservation({
    plan,
    phase: "after-rollback",
    baseUrl: "http://127.0.0.1:1234",
    checks: [{ id: "root", path: "/", status: "passed", httpStatus: 200, assertion: "previous marker found" }]
  });
  const receipt = buildRollbackReceipt({ plan, fromSnapshot: source, restoredSnapshot: previous, observation });
  assert.equal(receipt.schemaVersion, ROLLBACK_RECEIPT_SCHEMA_VERSION);
  assert.equal(receipt.hashMatch, true);
  assert.equal(receipt.status, "executed");
  assert.throws(() => buildRollbackReceipt({ plan, fromSnapshot: source, restoredSnapshot: source, observation }), /does not match the retained previous snapshot/);
});

test("capability summary keeps staging partial and production unavailable", () => {
  assert.deepEqual(releaseCapabilitySummary(), {
    staging: "partial",
    production: "unavailable",
    statement: "Repository-owned CI staging is supported for proving deployment, runtime observations, and rollback. Production deployment remains disconnected and unauthorized."
  });
});
