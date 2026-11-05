import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { buildCompositionPlan } from "../src/composition-plan.mjs";

// Frictions density-counts-items-not-marks and legend-not-planned-for-novices.

const readJson = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
const catalog = await readJson("../catalog/composition-heuristics.json");
const representations = await readJson("../catalog/representations.json");
const rep = (id) => (Array.isArray(representations) ? representations : representations.representations).find((entry) => entry.id === id);

async function graphPlan(scale, audience) {
  const useCase = await readJson("../examples/failure-propagation.json");
  useCase.scale = { ...useCase.scale, ...scale };
  if (audience) useCase.audience = { ...useCase.audience, ...audience };
  return buildCompositionPlan({ useCase, selectedRepresentation: "node-link-graph", representation: rep("node-link-graph"), catalog });
}

test("a graph's density budget counts its links as well as its items", async () => {
  const plan = await graphPlan({ items: 30, links: 45 });
  assert.equal(plan.densityBudget.marks, 75);
  assert.equal(plan.densityBudget.withinBudget, false, "30 nodes fit a 60-object screen, 30 nodes plus 45 edges do not");
});

test("a graph with unknown link count says so instead of passing on items alone", async () => {
  const plan = await graphPlan({ items: 30 });
  assert.equal(plan.densityBudget.links, null);
  assert.equal(plan.densityBudget.withinBudget, null, "30 items with unknown links may or may not fit");
  assert.ok(plan.designGaps.some((gap) => /add scale\.links/.test(gap)));
  const over = await graphPlan({ items: 90 });
  assert.equal(over.densityBudget.withinBudget, false, "items alone already overflow, links or not");
});

test("a table's budget is its items; links are not drawn", async () => {
  const useCase = await readJson("../examples/static-rule-chain-doc.json");
  useCase.scale = { items: 12, density: "medium", links: 40 };
  const plan = buildCompositionPlan({ useCase, selectedRepresentation: "decision-table", representation: rep("decision-table"), catalog });
  assert.equal(plan.densityBudget.marks, undefined);
  assert.equal(plan.densityBudget.withinBudget, true);
});

test("a novice reader gets a legend", async () => {
  const plan = await graphPlan({ items: 10, links: 12 }, { notationFamiliarity: "novice" });
  assert.ok(plan.secondary.some((part) => part.id === "legend"));
  assert.ok(plan.readingOrder.includes("legend"));
});

test("an expert reader on the same page gets no extra legend", async () => {
  const plan = await graphPlan({ items: 10, links: 12 }, { notationFamiliarity: "expert" });
  assert.equal(plan.secondary.filter((part) => part.id === "legend").length, plan.heuristics.includes("recognition-over-recall") ? 1 : 0);
});
