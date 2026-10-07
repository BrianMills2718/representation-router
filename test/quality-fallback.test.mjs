import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { selectQualityMethod } from "../src/quality-plan.mjs";

const qualityCatalog = JSON.parse(readFileSync(new URL("../catalog/quality-methods.json", import.meta.url)));

test("a renderer with no quality method keeps the whole-page checks and names the gap", () => {
  const quality = selectQualityMethod("renderer-with-no-method", { representation: "x" }, qualityCatalog);
  assert.ok(quality, "must not return null when a composition method exists");
  assert.equal(quality.method, null);
  assert.equal(quality.uncoveredRenderer, "renderer-with-no-method");
  assert.ok(quality.hardChecks.length + quality.softChecks.length > 0);
});
