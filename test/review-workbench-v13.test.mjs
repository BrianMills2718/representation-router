import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const feature = JSON.parse(await readFile(new URL("../review-workbench/saved-layout-feature-v1.3.json", import.meta.url), "utf8"));
const architecture = JSON.parse(await readFile(new URL("../review-workbench/pr22.architecture-v1.json", import.meta.url), "utf8"));
const appSource = await readFile(new URL("../review-workbench-v13/src/main.jsx", import.meta.url), "utf8");
const styles = await readFile(new URL("../review-workbench-v13/src/styles.css", import.meta.url), "utf8");
const viteConfig = await readFile(new URL("../review-workbench-v13/vite.config.js", import.meta.url), "utf8");

test("saved-layout feature describes a real end-to-end engineering path", () => {
  assert.equal(feature.schemaVersion, "engineering-feature-path/v1");
  assert.deepEqual(feature.stages.map((stage) => stage.id), ["outcome", "behavior", "design", "build", "test", "release", "use"]);
  assert.match(feature.outcome, /remember that arrangement on this browser/i);
  assert.match(feature.outcome, /without changing the real architecture/i);
  assert.equal(feature.decisions.some((item) => item.id === "exact-revision"), true);
  assert.equal(feature.decisions.some((item) => item.id === "positions-only"), true);
});

test("v1.3 uses the tested persistence core for restore, autosave after drag, and reset", () => {
  for (const token of [
    'from "../../src/layout-persistence.mjs"',
    "loadLayout(storage",
    "saveLayout(storage",
    "clearLayout(storage",
    "onNodeDragStop",
    "graph.persist(nextNodes)",
    "graph.reset()",
    "Reset positions"
  ]) assert.ok(appSource.includes(token), token);
  assert.ok(appSource.includes("window.localStorage"));
});

test("v1.3 explains browser-local persistence and revision binding in ordinary language", () => {
  for (const token of [
    "Arrangement saved in this browser",
    "Saved arrangement restored",
    "Positions won't be remembered in this browser",
    "Move a box to remember this arrangement",
    "Only box IDs and positions are stored",
    "this diagram",
    "this exact software revision"
  ]) assert.ok(appSource.includes(token), token);
});

test("v1.3 keeps semantic graph editing unavailable while allowing presentation movement", () => {
  assert.ok(appSource.includes("nodesConnectable={false}"));
  assert.equal(appSource.includes("onConnect="), false);
  assert.equal(appSource.includes("addEdge("), false);
  assert.equal(appSource.includes("setRelationships"), false);
  assert.equal(architecture.state.transitions.some((transition) => transition.from === "verified" && transition.to === "accepted"), false);
});

test("v1.3 makes the feature lifecycle visible before source code", () => {
  for (const token of [
    '"Build this feature"',
    "Build a Feature v0",
    "The problem",
    "How we know it worked",
    "What this feature does not do",
    "Try it in the system map",
    "Try it in the lifecycle map",
    "Could you follow this feature from problem → behavior → design → build → test → release"
  ]) assert.ok(appSource.includes(token), token);
});

test("v1.3 exact technical details remain reachable", () => {
  for (const token of [
    "Technical details for this stage",
    "src/layout-persistence.mjs",
    "test/layout-persistence.test.mjs",
    "review-workbench-v13/src/main.jsx",
    "localStorage",
    "subjectRevision",
    "Formal relationship",
    "Stable ID"
  ]) assert.ok(appSource.includes(token), token);
});

test("v1.3 stays a responsive self-contained Vite artifact using existing graph tooling", () => {
  assert.ok(viteConfig.includes("viteSingleFile"));
  assert.ok(viteConfig.includes("artifacts/review-workbench-v1.3"));
  assert.ok(appSource.includes('from "@xyflow/react"'));
  assert.ok(appSource.includes('@xyflow/react/dist/style.css'));
  assert.ok(styles.includes("@media (max-width: 760px)"));
  assert.equal(appSource.includes("fetch("), false);
});
