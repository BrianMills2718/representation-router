import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { buildEvidenceFocusItems, filterEvidenceFocusItems } from "../src/evidence-gap-focus.mjs";

const model = JSON.parse(await readFile(new URL("../review-workbench/pr22.model.json", import.meta.url), "utf8"));
const runtime = await readFile(new URL("../implementation-runner-evidence-gap-v0/src/main.jsx", import.meta.url), "utf8");
const styles = await readFile(new URL("../implementation-runner-evidence-gap-v0/src/styles.css", import.meta.url), "utf8");
const vite = await readFile(new URL("../implementation-runner-evidence-gap-v0/vite.config.js", import.meta.url), "utf8");

test("evidence focus derives review classifications from source roles and requirement state", () => {
  const items = buildEvidenceFocusItems(model);
  assert.equal(items.length, model.requirements.length);
  assert.equal(items.find((item) => item.id === "R1").classification.status, "executed-evidence-attached");
  assert.equal(items.find((item) => item.id === "R4").classification.status, "needs-executed-evidence");
  assert.equal(items.find((item) => item.id === "R6").classification.status, "needs-human-review");
});

test("gaps-first focus preserves source items and returns only open evidence/human-review needs", () => {
  const items = buildEvidenceFocusItems(model);
  const gaps = filterEvidenceFocusItems(items, "gaps-first");
  assert.deepEqual(gaps.map((item) => item.id), ["R4", "R6"]);
  assert.equal(model.requirements.find((item) => item.id === "R4").state, "covered");
  assert.equal(model.requirements.find((item) => item.id === "R6").state, "needs-human-review");
});

test("all-items focus returns a copy without changing the source model", () => {
  const items = buildEvidenceFocusItems(model);
  const all = filterEvidenceFocusItems(items, "all-items");
  assert.equal(all.length, model.requirements.length);
  all[0].title = "changed presentation copy";
  assert.notEqual(model.requirements[0].title, all[0].title);
});

test("Evidence Gap Focus runtime is generated from candidate-spec and exposes task-first review controls", () => {
  assert.ok(runtime.includes('../generated/candidate-spec.json'));
  assert.ok(runtime.includes("Needs evidence"));
  assert.ok(runtime.includes("All requirements"));
  assert.ok(runtime.includes("By requirement"));
  assert.ok(runtime.includes("Flat list"));
  assert.ok(runtime.includes("Compact"));
  assert.ok(runtime.includes("Expanded"));
  assert.ok(runtime.includes("Read-only review surface"));
  assert.ok(runtime.includes("buildEvidenceFocusItems"));
});

test("Evidence Gap Focus runtime does not expose source mutation or network write paths", () => {
  assert.equal(runtime.includes("fetch("), false);
  assert.equal(runtime.includes("XMLHttpRequest"), false);
  assert.equal(runtime.includes("requirementWrite = true"), false);
  assert.equal(runtime.includes("evidenceWrite = true"), false);
  assert.equal(runtime.includes("approvalWrite = true"), false);
});

test("Evidence Gap Focus remains a responsive self-contained Vite artifact", () => {
  assert.ok(vite.includes("viteSingleFile"));
  assert.ok(vite.includes("implementation-runner-evidence-gap-v0/candidate"));
  assert.ok(styles.includes("@media (max-width: 900px)"));
  assert.ok(styles.includes("@media (max-width: 640px)"));
});
