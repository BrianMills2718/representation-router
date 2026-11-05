import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { buildAgentRecommendation } from "../src/agent-recommendation.mjs";
import { route } from "../src/router.mjs";

// Friction capabilities-checked-per-representation: details-on-demand or linked-views rejected a graph or
// matrix even though the page around it (a detail pane, a shared selection) supplies them.

const readJson = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
const catalogs = {
  representationCatalog: await readJson("../catalog/representations.json"),
  representationRelations: await readJson("../catalog/representation-relations.json"),
  heuristics: await readJson("../heuristics/core.json"),
  interactionCatalog: await readJson("../catalog/interaction-patterns.json"),
  implementationCatalog: await readJson("../catalog/implementations.json"),
  interfacePatternCatalog: await readJson("../catalog/interface-patterns.json"),
  qualityCatalog: await readJson("../catalog/quality-methods.json"),
  playbookCatalog: await readJson("../catalog/implementation-playbooks.json"),
  compositionCatalog: await readJson("../catalog/composition-heuristics.json")
};

async function graphCase(overrides = {}) {
  const useCase = await readJson("../examples/failure-propagation.json");
  useCase.requiredCapabilities = ["provenance", "path-highlighting", "details-on-demand", "linked-views"];
  return { ...useCase, ...overrides };
}
const rejectedIds = (useCase) => route(useCase, catalogs.representationCatalog, catalogs.heuristics, { limit: 50 }).rejected.map((result) => result.candidate.id);
const graphRejection = (useCase) => route(useCase, catalogs.representationCatalog, catalogs.heuristics, { limit: 50 }).rejected.find((result) => result.candidate.id === "node-link-graph")?.rejectedBecause ?? [];

test("a graph is not rejected for details-on-demand or linked-views the page supplies", async () => {
  const useCase = await graphCase();
  assert.ok(!rejectedIds(useCase).includes("node-link-graph"));
  const recommendation = buildAgentRecommendation({ useCase, ...catalogs });
  assert.equal(recommendation.primary.representation, "node-link-graph");
  assert.deepEqual(recommendation.primary.surfaceSupplies.map((item) => item.capability), ["details-on-demand", "linked-views"]);
  assert.match(recommendation.primary.surfaceSupplies[0].how, /detail pane/);
});

test("a static page cannot supply them, so the view is still rejected", async () => {
  const useCase = await graphCase({ interaction: { mode: "read-only", dynamics: "static" } });
  assert.ok(graphRejection(useCase).includes("missing required capability: details-on-demand"));
});

test("a script-free page cannot supply them either", async () => {
  const useCase = await graphCase();
  useCase.constraints = { ...useCase.constraints, scripts: "none" };
  assert.deepEqual(graphRejection(useCase), ["missing required capability: details-on-demand", "missing required capability: linked-views"]);
});

test("a capability only the view can give still rejects it", async () => {
  const useCase = await graphCase({ requiredCapabilities: ["provenance", "path-highlighting", "step-through"] });
  assert.deepEqual(graphRejection(useCase), ["missing required capability: step-through"]);
});

test("a view that has the capability itself owes the page nothing and outranks one that leans on the page", async () => {
  const useCase = await graphCase({ requiredCapabilities: ["provenance", "filter"] });
  const ranked = route(useCase, catalogs.representationCatalog, catalogs.heuristics, { limit: 50 }).accepted;
  const native = ranked.find((result) => result.candidate.capabilities.includes("filter"));
  assert.ok(native && !native.surfaceSupplied, "a view with filter of its own is accepted without a page obligation");
  const leaning = ranked.find((result) => result.surfaceSupplied?.includes("filter"));
  assert.ok(leaning.reasons.some((reason) => /page must supply filter \(-3\)/.test(reason)));
  const graph = ranked.find((result) => result.candidate.id === "node-link-graph");
  const withoutRequirement = route({ ...useCase, requiredCapabilities: ["provenance"] }, catalogs.representationCatalog, catalogs.heuristics, { limit: 50 }).accepted.find((result) => result.candidate.id === "node-link-graph");
  assert.equal(graph.score, withoutRequirement.score - 3);
});
