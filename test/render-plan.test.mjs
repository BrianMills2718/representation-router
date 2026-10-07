import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { buildRenderPlan, adapterForPattern } from "../src/render-plan.mjs";
import { buildViewSpec, route } from "../src/router.mjs";

const readJson = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
const catalog = await readJson("../catalog/representations.json");
const heuristics = await readJson("../heuristics/core.json");

async function planForExample(name) {
  const useCase = await readJson(`../examples/${name}.json`);
  const result = route(useCase, catalog, heuristics);
  const viewSpec = buildViewSpec(useCase, result.accepted[0]);
  return { useCase, viewSpec, plan: buildRenderPlan(useCase, viewSpec) };
}

test("every catalog pattern has a concrete renderer adapter", () => {
  for (const candidate of catalog) {
    assert.notEqual(adapterForPattern(candidate.id), "generic", candidate.id);
  }
});
test("failure propagation produces a schematic graph render plan", async () => {
  const { plan } = await planForExample("failure-propagation");
  assert.equal(plan.adapter, "graph");
  assert.equal(plan.isSchematic, true);
  assert.ok(plan.data.nodes.length >= 4);
  assert.ok(plan.data.edges.length >= 3);
});

test("requirements verification produces a matrix render plan", async () => {
  const { plan } = await planForExample("requirements-verification");
  assert.equal(plan.adapter, "matrix");
  assert.equal(plan.data.rows.length, 5);
  assert.equal(plan.data.columns.length, 5);
  assert.equal(plan.data.cells.length, 25);
});

test("policy simulation exposes time steps for an interactive renderer", async () => {
  const { plan } = await planForExample("policy-simulation");
  assert.equal(plan.adapter, "simulation");
  assert.ok(plan.data.steps.length > 1);
  assert.equal(plan.data.steps[0].values.length, plan.data.actors.length);
});
test("supplied modelData passes through instead of generating a schematic", async () => {
  const { useCase, viewSpec } = await planForExample("failure-propagation");
  const modelData = {
    nodes: [{ id: "a", label: "Actual component" }],
    edges: []
  };
  const plan = buildRenderPlan({ ...useCase, modelData }, viewSpec);
  assert.equal(plan.isSchematic, false);
  assert.deepEqual(plan.data, modelData);
  assert.match(plan.note, /supplied model data/i);
});
