import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const source = await readFile(new URL("../engineering-studio-v1/src/main.jsx", import.meta.url), "utf8");
const styles = await readFile(new URL("../engineering-studio-v1/src/styles.css", import.meta.url), "utf8");
const vite = await readFile(new URL("../engineering-studio-v1/vite.config.js", import.meta.url), "utf8");

test("Engineering Studio leads with Build and Fix jobs instead of internal schema names", () => {
  for (const token of ["Build something", "Fix something", "Review handoff", "What should be better", "What went wrong?", "What did you expect instead?"]) {
    assert.ok(source.includes(token), token);
  }
});

test("Build authoring is driven by generic authoring registry rather than feature switch branches", () => {
  assert.ok(source.includes("listAuthoringFeatures"));
  assert.ok(source.includes("createAuthoringDraft"));
  assert.ok(source.includes("buildImplementationBriefV1"));
  assert.ok(source.includes("feature.decisions.map"));
  assert.ok(source.includes("feature.constraints.map"));
  assert.equal(source.includes('if (featureId === "saved-graph-layouts")'), false);
  assert.equal(source.includes('if (featureId === "evidence-gap-focus")'), false);
});

test("Fix path diagnoses locally and visibly abstains when unsupported", () => {
  assert.ok(source.includes("routeProblemIntent"));
  assert.ok(source.includes("Diagnose this problem"));
  assert.ok(source.includes("No supported diagnosis"));
  assert.ok(source.includes("Engineering Studio stopped instead of guessing"));
  assert.ok(source.includes("Review proposed fix handoff"));
});

test("Studio exports deterministic JSON handoffs without repository/network write APIs", () => {
  assert.ok(source.includes("downloadJson"));
  assert.ok(source.includes("implementation-brief-v1.json"));
  assert.equal(source.includes("fetch("), false);
  assert.equal(source.includes("XMLHttpRequest"), false);
});

test("Engineering Studio remains a responsive self-contained Vite artifact", () => {
  assert.ok(vite.includes("viteSingleFile"));
  assert.ok(vite.includes("artifacts/engineering-studio-v1"));
  assert.ok(styles.includes("@media (max-width: 900px)"));
  assert.ok(styles.includes("@media (max-width: 680px)"));
});
