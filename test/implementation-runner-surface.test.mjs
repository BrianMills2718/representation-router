import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const runtime = await readFile(new URL("../implementation-runner-v0/src/main.jsx", import.meta.url), "utf8");
const styles = await readFile(new URL("../implementation-runner-v0/src/styles.css", import.meta.url), "utf8");
const vite = await readFile(new URL("../implementation-runner-v0/vite.config.js", import.meta.url), "utf8");
const buildScript = await readFile(new URL("../scripts/build-implementation-runner-v0.mjs", import.meta.url), "utf8");
const surface = await readFile(new URL("../src/implementation-runner-surface.mjs", import.meta.url), "utf8");

test("saved-layout generated candidate runtime still reads candidate-spec instead of a hand-authored brief", () => {
  assert.ok(runtime.includes('../generated/candidate-spec.json'));
  assert.ok(runtime.includes("candidateSpec.decisions.rememberMode"));
  assert.ok(runtime.includes("candidateSpec.decisions.saveReceipt"));
  assert.ok(runtime.includes("candidateSpec.decisions.resetMode"));
  assert.equal(runtime.includes("implementation-brief-explicit-save-v0.json"), false);
});

test("saved-layout runtime still supports explicit/automatic save and immediate/confirmed reset", () => {
  assert.match(runtime, /rememberMode === "automatic-after-drag"/);
  assert.match(runtime, /rememberMode === "explicit-save"/);
  assert.match(runtime, /resetMode === "confirm-before-reset"/);
  assert.match(runtime, /saveReceipt === "visible-after-save"/);
  assert.ok(runtime.includes("Save arrangement"));
  assert.ok(runtime.includes("Confirm reset"));
});

test("saved-layout generated candidate keeps graph semantics inspectable without semantic editing", () => {
  assert.ok(runtime.includes("onNodeClick"));
  assert.ok(runtime.includes("onEdgeClick"));
  assert.ok(runtime.includes("nodesConnectable={false}"));
  assert.equal(runtime.includes("onConnect"), false);
  assert.equal(runtime.includes("fetch("), false);
  assert.equal(runtime.includes("XMLHttpRequest"), false);
});

test("runner build uses adapter-declared runtime, supports dry-run and caller-scoped outputs", () => {
  assert.ok(buildScript.includes('args.includes("--dry-run")'));
  assert.ok(buildScript.includes("--output="));
  assert.ok(buildScript.includes("--receipt="));
  assert.ok(buildScript.includes("describeDryRun"));
  assert.ok(buildScript.includes("prepareImplementationRun"));
  assert.ok(buildScript.includes("run.runtime.generatedDir"));
  assert.ok(buildScript.includes("run.runtime.configFile"));
  assert.ok(buildScript.includes('resolve(generatedDir, "candidate-spec.json")'));
  assert.match(buildScript, /rm\(generatedDir/);
  assert.ok(buildScript.includes("normalized-brief.json"));
  assert.ok(buildScript.includes("executionEvidence"));
});

test("runner surface separates plan, generation, execution evidence, and human review", () => {
  for (const token of [
    "Dry-run plan",
    "Generated candidate",
    "Execution evidence pending",
    "Executed on exact runner head",
    "Implementation plan ≠ executed evidence.",
    "Generated candidate ≠ human acceptance."
  ]) assert.ok(surface.includes(token), token);
});

test("saved-layout runner candidate remains a self-contained responsive Vite artifact", () => {
  assert.ok(vite.includes("viteSingleFile"));
  assert.ok(vite.includes("artifacts/implementation-runner-v0/candidate"));
  assert.ok(styles.includes("@media (max-width: 760px)"));
});
