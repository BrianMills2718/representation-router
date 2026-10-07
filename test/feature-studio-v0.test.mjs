import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const source = await readFile(new URL("../feature-studio-v0/src/main.jsx", import.meta.url), "utf8");
const styles = await readFile(new URL("../feature-studio-v0/src/styles.css", import.meta.url), "utf8");
const vite = await readFile(new URL("../feature-studio-v0/vite.config.js", import.meta.url), "utf8");

test("Feature Studio exposes the full guided authoring path", () => {
  for (const token of [
    '"Outcome"',
    '"Behavior"',
    '"Design"',
    '"Tests"',
    '"Impact"',
    '"Review changes"',
    '"Handoff"',
    "Build a feature without starting in the code"
  ]) assert.ok(source.includes(token), token);
});

test("Feature Studio supports meaningful behavior decisions and task-first authority constraints", () => {
  for (const token of [
    "automatic-after-drag",
    "explicit-save",
    "visible-after-save",
    "quiet",
    "immediate-reset",
    "confirm-before-reset",
    "This browser only",
    "Use the default layout for the new revision",
    "Box ID + x/y position only"
  ]) assert.ok(source.includes(token), token);
  assert.match(source, /The draft is not the implementation\./);
  assert.match(source, /no repository write/i);
});

test("Feature Studio authors editable Given When Then acceptance scenarios", () => {
  assert.ok(source.includes("Given"));
  assert.ok(source.includes("When"));
  assert.ok(source.includes("Then"));
  assert.ok(source.includes("Add acceptance scenario"));
  assert.ok(source.includes("Remove"));
});

test("Feature Studio derives implementation impact and keeps planned verification distinct from executed evidence", () => {
  assert.ok(source.includes("deriveImplementationImpact"));
  assert.ok(source.includes("buildImplementationBrief"));
  assert.match(source, /planned acceptance checks/i);
  assert.match(source, /Planned — not executed/);
  assert.match(source, /must still run verification and produce execution evidence/i);
});

test("Feature Studio persists drafts locally and exports deterministic handoff without network write APIs", () => {
  assert.ok(source.includes("localStorage"));
  assert.ok(source.includes("saveFeatureDraft"));
  assert.ok(source.includes("loadFeatureDraft"));
  assert.ok(source.includes("Download implementation brief"));
  assert.ok(source.includes("Blob"));
  assert.equal(source.includes("fetch("), false);
  assert.equal(source.includes("XMLHttpRequest"), false);
  assert.equal(source.includes("github.com/repos"), false);
});

test("Feature Studio is a responsive self-contained Vite artifact", () => {
  assert.ok(vite.includes("viteSingleFile"));
  assert.ok(vite.includes("artifacts/feature-studio-v0"));
  assert.ok(styles.includes("@media (max-width: 760px)"));
});
