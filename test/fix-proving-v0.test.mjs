import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const script = await readFile(new URL("../scripts/build-fix-proving-v0.mjs", import.meta.url), "utf8");
const surface = await readFile(new URL("../src/fix-proving-surface.mjs", import.meta.url), "utf8");

test("Fix proving starts from problem intent, diagnoses, and writes derived implementation-brief/v1", () => {
  assert.ok(script.includes("problem-intent-saved-layout-reset-v0.json"));
  assert.ok(script.includes("routeProblemIntent"));
  assert.ok(script.includes("diagnosis.implementationBrief"));
  assert.ok(script.includes("implementation-brief.json"));
});

test("Fix proving invokes the existing implementation runner rather than a separate candidate generator", () => {
  assert.ok(script.includes("scripts/build-implementation-runner-v0.mjs"));
  assert.ok(script.includes("spawnSync"));
  assert.ok(script.includes("runner/candidate/index.html"));
  assert.equal(script.includes("vite build"), false);
});

test("Fix proving keeps execution evidence optional until an exact receipt exists", () => {
  assert.ok(script.includes("fix-proving-runner-receipt-v0.json"));
  assert.ok(script.includes('executionEvidence: receipt ? "recorded" : "pending"'));
  assert.ok(surface.includes("Execution evidence pending"));
  assert.ok(surface.includes("Executed evidence attached"));
});

test("Fix proving surface keeps diagnosis, implementation, and human acceptance separate", () => {
  for (const token of [
    "Problem intent",
    "Diagnosis",
    "Derived implementation handoff",
    "Implementation candidate",
    "Diagnosis ≠ source-code change.",
    "Green CI ≠ human acceptance."
  ]) assert.ok(surface.includes(token), token);
});
