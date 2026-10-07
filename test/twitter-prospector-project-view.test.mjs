import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { buildRenderPlan } from "../src/render-plan.mjs";
import { buildViewSpec, route } from "../src/router.mjs";

const readJson = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
const catalog = await readJson("../catalog/representations.json");
const heuristics = await readJson("../heuristics/core.json");
const useCase = await readJson("../examples/twitter-prospector-project-overview.json");

test("simple Twitter Prospector project routes to a real flow view using supplied project data", () => {
  const result = route(useCase, catalog, heuristics);
  assert.ok(result.accepted.length > 0);

  const viewSpec = buildViewSpec(useCase, result.accepted[0]);
  const plan = buildRenderPlan(useCase, viewSpec);

  assert.equal(plan.adapter, "flow");
  assert.equal(plan.isSchematic, false);
  assert.equal(plan.data.nodes.length, 5);
  assert.equal(plan.data.edges.length, 5);
  assert.equal(plan.data.source.revision, "fixture:v1");
  assert.equal(viewSpec.concern, useCase.concern);
  assert.equal(viewSpec.provenance.enabled, true);
});

test("Twitter Prospector fixture keeps implementation state and nonclaims visible in the project model", () => {
  const byId = Object.fromEntries(useCase.modelData.nodes.map((node) => [node.id, node]));

  assert.equal(byId.criteria.status, "implemented");
  assert.equal(byId.score.status, "partial");
  assert.equal(byId.export.status, "planned");
  assert.match(byId.collect.nonClaim, /does not claim live Twitter\/X API access/i);
  assert.match(byId.export.nonClaim, /No external write, message send, or CRM update/i);
});
