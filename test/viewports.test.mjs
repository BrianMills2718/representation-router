import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildCompositionPlan, PHONE_VIEWPORT } from "../src/composition-plan.mjs";
import { validateContract } from "../src/schema-validation.mjs";

const catalog = JSON.parse(readFileSync(new URL("../catalog/composition-heuristics.json", import.meta.url)));
const base = { concern: "Where does each project stand?", informationStructure: ["table"], scale: { items: 20 } };
const plan = (constraints, context) => buildCompositionPlan({ useCase: { ...base, constraints }, catalog, context });

test("declared viewports: the plan is budgeted for the screen holding the fewest objects", () => {
  const p = plan({ viewports: [{ label: "laptop", width: 1440, height: 900 }, { label: "phone", width: 390, height: 844 }] });
  assert.deepEqual(p.viewport, { width: 390, height: 844 });
  assert.equal(p.densityBudget.maxObjects, 12);
  assert.equal(p.densityBudget.withinBudget, false, "20 items fit the laptop but not the phone");
  assert.deepEqual(p.densityBudget.perViewport.map((v) => [v.label, v.maxObjects]), [["laptop", 36], ["phone", 12]]);
});

test("one declared viewport wins over mobile and the default", () => {
  const p = plan({ mobile: true, viewports: [{ width: 360, height: 740 }] });
  assert.deepEqual(p.viewport, { width: 360, height: 740 });
  assert.equal(p.densityBudget.perViewport, undefined, "a single viewport needs no per-viewport list");
  assert.ok(!p.designGaps.some((g) => g.includes("phone-width")));
});

test("mobile with no phone-width viewport is a design gap", () => {
  const p = plan({ mobile: true, viewports: [{ width: 1280, height: 800 }] });
  assert.ok(p.designGaps.some((g) => g.includes("no declared viewport is phone-width")));
});

test("without viewports: a caller's viewport, else mobile's phone, else the desktop default", () => {
  assert.deepEqual(plan({ mobile: true }).viewport, PHONE_VIEWPORT);
  assert.deepEqual(plan({}).viewport, { width: 1440, height: 1000 });
  assert.deepEqual(plan({ mobile: true }, { viewport: { width: 1920, height: 1080 } }).viewport, { width: 1920, height: 1080 });
});

test("declared viewports bind even when a caller passes a viewport", () => {
  const p = plan({ viewports: [{ width: 390, height: 844 }, { width: 1440, height: 900 }] }, { viewport: { width: 1920, height: 1080 } });
  assert.deepEqual(p.viewport, { width: 390, height: 844 });
  assert.equal(p.densityBudget.perViewport.length, 2);
});

test("the use-case schema accepts declared viewports and rejects malformed ones", () => {
  const useCase = (viewports) => ({
    id: "viewports", concern: "Where does each project stand?", intent: ["inspect"], informationStructure: ["table"],
    tasks: ["inspect"], entities: ["project"], relationships: [], scale: { items: 20, density: "low" },
    interaction: { mode: "read-only", dynamics: "static" }, constraints: { viewports }, successCriteria: ["A reader finds a project's state."]
  });
  assert.equal(validateContract("use-case", useCase([{ label: "phone", width: 390, height: 844 }, { width: 1440, height: 900 }])).valid, true);
  for (const bad of [[], [{ width: 390 }], [{ width: 0, height: 844 }], [{ width: 390.5, height: 844 }], [{ width: 390, height: 844, dpr: 3 }]]) {
    assert.equal(validateContract("use-case", useCase(bad)).valid, false, JSON.stringify(bad));
  }
});
