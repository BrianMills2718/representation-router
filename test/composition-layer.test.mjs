import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { compositionMethod, selectQualityMethod } from "../src/quality-plan.mjs";
import { collectChecklist } from "../src/disposition.mjs";

const qualityCatalog = JSON.parse(await readFile(new URL("../catalog/quality-methods.json", import.meta.url), "utf8"));

test("the one-page composition layer exists and is never selected as the renderer method", () => {
  const composition = compositionMethod(qualityCatalog);
  assert.ok(composition, "catalog must carry a composition-layer method");
  assert.equal(composition.id, "one-page-composition-quality");
  for (const renderer of ["react-flow", "native-web", "d3", "mermaid"]) {
    const quality = selectQualityMethod(renderer, { representation: { family: "graph" } }, qualityCatalog, {});
    assert.notEqual(quality.method, composition.id, `${renderer}: composition must not replace the renderer method`);
    assert.equal(quality.compositionMethod, composition.id);
  }
});

test("every recommendation carries the whole-page questions on top of the mark-level ones", () => {
  const quality = selectQualityMethod("react-flow", { representation: { family: "graph" } }, qualityCatalog, {});
  assert.ok(quality.hardChecks.includes("no-node-overlap"), "renderer-level check kept");
  assert.ok(quality.hardChecks.includes("cold-reader-gets-the-mechanism-in-sixty-seconds"), "one-page check added");
  assert.ok(quality.hardChecks.includes("every-object-reveals-more-on-click-nothing-is-a-dead-end"));
  assert.ok(quality.hardChecks.includes("same-object-same-mark-across-every-view"));
  assert.ok(quality.softChecks.includes("a-person-would-pin-it-on-a-wall"));
  assert.ok(quality.repairOrder.includes("move-the-whole-onto-one-screen-before-polishing-any-part"));
  assert.equal(new Set(quality.hardChecks).size, quality.hardChecks.length, "no duplicate check ids after merge");
});

test("the builder must justify the representation choice in their own words when alternatives existed", () => {
  const withAlternatives = { primary: { representation: "composite-linked-view" }, alternatives: ["node-link-graph"], quality: { hardChecks: [] } };
  const items = collectChecklist(withAlternatives);
  assert.ok(items.some((item) => item.category === "selection" && item.id === "choice-justified:composite-linked-view"));
  const noAlternatives = { primary: { representation: "table" }, alternatives: [], quality: { hardChecks: [] } };
  assert.ok(!collectChecklist(noAlternatives).some((item) => item.category === "selection"));
});
