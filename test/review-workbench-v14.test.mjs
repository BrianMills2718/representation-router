import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const source = await readFile(new URL("../review-workbench-v14/src/main.jsx", import.meta.url), "utf8");
const styles = await readFile(new URL("../review-workbench-v14/src/styles.css", import.meta.url), "utf8");
const vite = await readFile(new URL("../review-workbench-v14/vite.config.js", import.meta.url), "utf8");
const brief = JSON.parse(await readFile(new URL("../examples/implementation-brief-explicit-save-v0.json", import.meta.url), "utf8"));

test("v1.4 candidate is driven by the prepared explicit-save brief", () => {
  assert.equal(brief.decisions.rememberMode, "explicit-save");
  assert.equal(brief.decisions.resetMode, "confirm-before-reset");
  assert.ok(source.includes("implementation-brief-explicit-save-v0.json"));
  assert.ok(source.includes("validateImplementationBrief"));
  assert.ok(source.includes("Save arrangement"));
});

test("dragging is explicitly unsaved and persistence is only triggered by Save arrangement", () => {
  assert.ok(source.includes("applyUnsavedMove"));
  assert.ok(source.includes("persistExplicitLayout"));
  assert.match(source, /onNodeDragStop=.*graph\.move/s);
  assert.equal(/onNodeDragStop[\s\S]{0,350}graph\.save/.test(source), false);
  assert.ok(source.includes('disabled={!graph.dirty || graph.status === "unavailable"}'));
});

test("reset is confirmation-bound and can be cancelled", () => {
  for (const token of ["requestReset", "confirmReset", "cancelReset", "Keep my arrangement", "Confirm reset", "Reset positions"]) {
    assert.ok(source.includes(token), token);
  }
  assert.ok(source.includes("confirmCandidateReset"));
});

test("candidate keeps browser-local positions-only authority boundaries visible", () => {
  assert.match(source, /stores only node IDs and x\/y coordinates/);
  assert.match(source, /does not change the software model/i);
  assert.equal(source.includes("fetch("), false);
  assert.equal(source.includes("XMLHttpRequest"), false);
  assert.equal(source.includes("onConnect"), false);
});

test("v1.4 remains a self-contained responsive Vite artifact", () => {
  assert.ok(vite.includes("viteSingleFile"));
  assert.ok(vite.includes("artifacts/review-workbench-v1.4"));
  assert.ok(styles.includes("@media (max-width: 760px)"));
});
