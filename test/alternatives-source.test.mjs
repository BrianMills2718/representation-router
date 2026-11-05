import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { buildAgentRecommendation } from "../src/agent-recommendation.mjs";

const readJson = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
const catalogs = {
  representationCatalog: await readJson("../catalog/representations.json"),
  heuristics: await readJson("../heuristics/core.json"),
  interactionCatalog: await readJson("../catalog/interaction-patterns.json"),
  implementationCatalog: await readJson("../catalog/implementations.json")
};
const useCase = await readJson("../examples/comparative-variants.json");

test("alternatives say whether their label was reviewed or model-drafted, and unrecorded pairs stay unclassified", () => {
  const baseline = buildAgentRecommendation({ useCase, ...catalogs, representationRelations: { relations: [] } });
  const primary = baseline.primary.representation;
  const [first, second, third] = baseline.alternativesDetailed.map((alternative) => alternative.representation);
  assert.ok(third, "the example yields at least three alternatives");
  const relations = [
    { id: "x", a: first, b: primary, relationship: "substitute", reason: "drafted relation for the test, both orders", drafted: { models: ["m1", "m2"], date: "2026-10-25", evidence: "docs/evidence/x" } },
    { id: "y", a: primary, b: second, relationship: "complement", reason: "reviewed relation for the test fixture", reviewed: "2026-10-25" }
  ];
  const recommendation = buildAgentRecommendation({ useCase, ...catalogs, representationRelations: { relations } });
  const byId = Object.fromEntries(recommendation.alternativesDetailed.map((alternative) => [alternative.representation, alternative]));
  assert.deepEqual([byId[first].relationshipToPrimary, byId[first].source], ["substitute", "drafted"]);
  assert.deepEqual([byId[second].relationshipToPrimary, byId[second].source], ["complement", "reviewed"]);
  assert.equal(byId[third].relationshipToPrimary, "unclassified");
  assert.equal(byId[third].source, undefined);
});
