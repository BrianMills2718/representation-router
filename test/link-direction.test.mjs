import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { buildAgentRecommendation, linksAreDirected } from "../src/agent-recommendation.mjs";

const readJson = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
const catalogs = {
  representationCatalog: await readJson("../catalog/representations.json"),
  representationRelations: await readJson("../catalog/representation-relations.json"),
  heuristics: await readJson("../heuristics/core.json"),
  interactionCatalog: await readJson("../catalog/interaction-patterns.json"),
  implementationCatalog: await readJson("../catalog/implementations.json")
};
const failure = await readJson("../examples/failure-propagation.json");

test("link direction is what relationshipEnds states, never guessed from relationship names", () => {
  assert.equal(linksAreDirected({ relationships: ["depends-on"] }), null, "a name that sounds directed decides nothing");
  assert.equal(linksAreDirected({ relationshipEnds: [{ relationship: "x", from: "a", to: "b" }] }), true);
  assert.equal(linksAreDirected({ relationshipEnds: [{ relationship: "x", from: "a", to: "b", directed: false }] }), false);
});

test("a force-or-layered graph is laid out by stated direction, and says what it assumed when direction is missing", () => {
  const stated = buildAgentRecommendation({ useCase: failure, ...catalogs }).primary.implementation;
  assert.equal(stated.layout, "elkjs");
  const { relationshipEnds, ...unstated } = failure;
  const missing = buildAgentRecommendation({ useCase: unstated, ...catalogs }).primary.implementation;
  assert.equal(missing.layout, "elkjs", "force-or-layered falls back to layers, as before");
  assert.ok(missing.notes.some((note) => note.startsWith("link direction not stated, so links are assumed one-way")));
  const twoWay = { ...failure, relationshipEnds: relationshipEnds.map((end) => ({ ...end, directed: false })) };
  assert.equal(buildAgentRecommendation({ useCase: twoWay, ...catalogs }).primary.implementation.layout, null);
});
