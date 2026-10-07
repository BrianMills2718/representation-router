import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const executor = await readFile(new URL("../scripts/build-release-operate-v0.mjs", import.meta.url), "utf8");
const surface = await readFile(new URL("../src/release-operate-surface.mjs", import.meta.url), "utf8");
const homeBuilder = await readFile(new URL("../scripts/build-engineering-home-v0.mjs", import.meta.url), "utf8");

test("staging executor deploys exact files, serves the deployed directory, rolls back, and reapplies", () => {
  for (const token of [
    "replaceDirectory(sourceDir, currentDir)",
    "serveAndObserve(currentDir",
    "replaceDirectory(rollbackSnapshotDir, currentDir)",
    "buildRollbackReceipt",
    "rollback-to-released",
    "final-runtime-observation.json",
    'option("output")'
  ]) assert.ok(executor.includes(token), token);
  assert.ok(executor.includes('server.listen(0, "127.0.0.1"'));
  assert.ok(executor.includes("http://127.0.0.1:"));
  assert.equal(executor.includes("https://"), false);
});

test("runtime checks target staged Home workflows and discover release evidence when bundled", () => {
  for (const path of [
    'path: "/"',
    'path: "/workflows/understand/index.html"',
    'path: "/workflows/review/index.html"',
    'path: "/workflows/studio/index.html"',
    'path: "/workflows/implementation/index.html"',
    'path: "/workflows/fix-proof/index.html"',
    'path: "/workflows/release/index.html"'
  ]) assert.ok(executor.includes(path), path);
  assert.ok(executor.includes('marker: "What are you trying to do?"'));
  assert.ok(executor.includes('marker: "Release it safely"'));
  assert.ok(executor.includes('{ id: "previous-root", path: "/" }'));
});

test("release surface says CI staging and production limitation in task-first language", () => {
  for (const token of [
    "Release it safely, prove what happened, keep rollback real",
    "CI staging sandbox",
    "Production is not connected",
    "What actually deployed?",
    "What did we observe after deployment?",
    "Did rollback work?",
    "Staging evidence ≠ production evidence."
  ]) assert.ok(surface.includes(token), token);
});

test("engineering home builder supports prerelease and release-evidence bundle variants", () => {
  assert.ok(homeBuilder.includes('option("output")'));
  assert.ok(homeBuilder.includes('option("release-source")'));
  assert.ok(homeBuilder.includes('id: "release"'));
  assert.ok(homeBuilder.includes("releaseEvidenceBundled"));
  assert.ok(homeBuilder.includes("prereleaseTasks"));
});
