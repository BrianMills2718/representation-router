import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import {
  applyUnsavedMove,
  buildImplementationReceipt,
  confirmCandidateReset,
  persistExplicitLayout,
  validateImplementationBrief,
  validateImplementationReceipt
} from "../src/implementation-loop.mjs";
import { loadLayout } from "../src/layout-persistence.mjs";

const brief = JSON.parse(await readFile(new URL("../examples/implementation-brief-explicit-save-v0.json", import.meta.url), "utf8"));
const recordedReceipt = JSON.parse(await readFile(new URL("../examples/implementation-receipt-explicit-save-v0.json", import.meta.url), "utf8"));

function memoryStorage() {
  const map = new Map();
  return {
    getItem(key) { return map.has(key) ? map.get(key) : null; },
    setItem(key, value) { map.set(key, String(value)); },
    removeItem(key) { map.delete(key); },
    raw: map
  };
}

const identity = {
  workbenchId: "candidate-v14",
  subjectRevision: "subject-1",
  lens: "component"
};

const defaults = [
  { id: "a", position: { x: 10, y: 20 }, data: { title: "A" } },
  { id: "b", position: { x: 30, y: 40 }, data: { title: "B" } }
];

test("prepared explicit-save brief remains handoff-only and exact-baseline-bound", () => {
  const value = validateImplementationBrief(brief);
  assert.equal(value.baselineRevision, "b61f210a2e8749ca18ce78b61a0411fa62eafecd");
  assert.equal(value.decisions.rememberMode, "explicit-save");
  assert.equal(value.decisions.resetMode, "confirm-before-reset");
  assert.equal(value.authority.repositoryWrite, false);
  assert.equal(value.verification.status, "planned-not-executed");
});

test("dragging creates unsaved node state without writing storage", () => {
  const storage = memoryStorage();
  const moved = applyUnsavedMove(defaults, "a", { x: 500, y: 600 });
  assert.equal(moved[0].position.x, 500);
  assert.equal(storage.raw.size, 0);
  assert.deepEqual(defaults[0].position, { x: 10, y: 20 });
});

test("explicit save is the operation that makes moved positions restorable", () => {
  const storage = memoryStorage();
  const moved = applyUnsavedMove(defaults, "a", { x: 500, y: 600 });
  const before = loadLayout(storage, { ...identity, defaultNodes: defaults });
  assert.equal(before.status, "missing");
  assert.equal(before.nodes[0].position.x, 10);

  const saved = persistExplicitLayout(storage, identity, moved);
  assert.equal(saved.status, "saved");

  const after = loadLayout(storage, { ...identity, defaultNodes: defaults });
  assert.equal(after.status, "restored");
  assert.equal(after.nodes[0].position.x, 500);
});

test("confirmed reset clears persistence and returns cloned defaults", () => {
  const storage = memoryStorage();
  persistExplicitLayout(storage, identity, applyUnsavedMove(defaults, "a", { x: 500, y: 600 }));
  const reset = confirmCandidateReset(storage, identity, defaults);
  assert.equal(reset.status, "cleared");
  assert.deepEqual(reset.nodes.map((node) => node.position), defaults.map((node) => node.position));
  reset.nodes[0].position.x = 999;
  assert.equal(defaults[0].position.x, 10);
  const reload = loadLayout(storage, { ...identity, defaultNodes: defaults });
  assert.equal(reload.status, "missing");
});

test("implementation receipt upgrades verification only when exact executed evidence is supplied", () => {
  const receipt = buildImplementationReceipt({
    brief,
    candidateRevision: "candidate-sha",
    changedFiles: ["review-workbench-v14/src/main.jsx"],
    executedChecks: [
      { name: "npm test", status: "passed" },
      { name: "npm run build:review-workbench:v1.4", status: "passed" }
    ],
    runId: 12345,
    artifactId: 67890,
    artifactName: "review-workbench-v1.4",
    artifactSha256: "abc123"
  });
  assert.equal(receipt.verification.status, "executed");
  assert.equal(receipt.humanReview.status, "pending");
  assert.equal(receipt.briefBaselineRevision, brief.baselineRevision);
  assert.throws(() => buildImplementationReceipt({
    brief,
    candidateRevision: "candidate-sha",
    changedFiles: ["x"],
    executedChecks: [{ name: "npm test", status: "failed" }],
    runId: 1,
    artifactId: 2,
    artifactName: "x",
    artifactSha256: "y"
  }), /passed checks/);
});

test("recorded receipt matches the proving brief and keeps human acceptance pending", () => {
  const receipt = validateImplementationReceipt(recordedReceipt, brief);
  assert.equal(receipt.candidateRevision, "4b1b4d46fc5bbde46a17ecabefde78c5018890fb");
  assert.equal(receipt.ci.runId, "35059363567");
  assert.equal(receipt.artifact.id, "10431538910");
  assert.equal(receipt.artifact.sha256, "1c831834fffe11347449e76d0da8963ccb80e7c3a3089d7b899bf4408b8cae19");
  assert.equal(receipt.verification.status, "executed");
  assert.equal(receipt.humanReview.status, "pending");
});
