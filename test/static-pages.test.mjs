import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { buildAgentRecommendation } from "../src/agent-recommendation.mjs";

// Issue #2: a review of a static Markdown doc (six Mermaid diagrams) was asked for click and hover checks it
// could not have, and an ordered first-match-wins rule chain had no decision-table form to route to.

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

async function recommend(example, interaction) {
  const useCase = await readJson(`../examples/${example}.json`);
  if (interaction) useCase.interaction = interaction;
  return buildAgentRecommendation({ useCase, ...catalogs });
}

const allChecks = (quality) => [...quality.hardChecks, ...quality.softChecks, ...(quality.usabilityChecks ?? [])];
const CLICK_CHECK = "every-object-reveals-more-on-click-nothing-is-a-dead-end";
const CLICK_REPAIR = "add-reveal-on-click-for-every-dead-end";

test("a static graph page is not asked to reveal on click, and its fix list agrees", async () => {
  const recommendation = await recommend("failure-propagation", { mode: "read-only", dynamics: "static" });
  const { quality } = recommendation;
  assert.ok(!allChecks(quality).includes(CLICK_CHECK));
  assert.ok(!quality.repairOrder.includes(CLICK_REPAIR));
  assert.ok(!allChecks(quality).includes("every-drawing-fits-its-frame-on-load-and-zooms-and-pans-within-it"));
  const excused = quality.notApplicable.find((item) => item.id === CLICK_CHECK);
  assert.match(excused.because, /a reader can interact/);
  assert.ok(quality.notApplicable.some((item) => item.id === CLICK_REPAIR));
});

test("a static page gets no interaction patterns", async () => {
  const recommendation = await recommend("failure-propagation", { mode: "read-only", dynamics: "static" });
  assert.deepEqual(recommendation.primary.interaction, []);
});

test("an interactive graph page still gets the click check and its repair", async () => {
  const recommendation = await recommend("failure-propagation", { mode: "exploratory", dynamics: "interactive" });
  assert.ok(allChecks(recommendation.quality).includes(CLICK_CHECK));
  assert.ok(recommendation.quality.repairOrder.includes(CLICK_REPAIR));
  assert.ok(recommendation.primary.interaction.length > 0);
});

test("an ordered rule chain routes to a decision table, not a flowchart", async () => {
  const recommendation = await recommend("static-rule-chain-doc");
  assert.equal(recommendation.primary.representation, "decision-table");
  const flow = recommendation.alternativesDetailed.find((item) => item.representation === "directed-handoff-flow");
  if (flow) assert.equal(flow.relationshipToPrimary, "substitute");
});

test("an ordinary table does not route to the decision table", async () => {
  const useCase = await readJson("../examples/static-rule-chain-doc.json");
  useCase.informationStructure = ["table"];
  useCase.intent = ["understand", "communicate"];
  useCase.tasks = ["trace", "inspect"];
  const recommendation = buildAgentRecommendation({ useCase, ...catalogs });
  assert.notEqual(recommendation.primary.representation, "decision-table");
});

test("a static table is written as Markdown and judged by document-table checks, not SVG explainer checks", async () => {
  const recommendation = await recommend("static-rule-chain-doc");
  assert.equal(recommendation.primary.implementation.renderer, "markdown");
  assert.equal(recommendation.quality.method, "document-table-quality");
  assert.ok(allChecks(recommendation.quality).includes("rows-follow-the-order-the-source-applies-them"));
  assert.ok(!allChecks(recommendation.quality).includes("direct-manipulation-produces-an-explanatory-consequence"));
});

test("an interactive table is not sent to Markdown", async () => {
  const recommendation = await recommend("static-rule-chain-doc", { mode: "exploratory", dynamics: "interactive" });
  assert.notEqual(recommendation.primary.implementation.renderer, "markdown");
});

test("an interactive table never gets Markdown, even when the project already uses it", async () => {
  const useCase = await readJson("../examples/static-rule-chain-doc.json");
  useCase.interaction = { mode: "exploratory", dynamics: "interactive" };
  const recommendation = buildAgentRecommendation({ useCase, ...catalogs, context: { existingImplementations: ["markdown"] } });
  assert.notEqual(recommendation.primary.implementation.renderer, "markdown");
  assert.notEqual(recommendation.quality.method, "document-table-quality");
});
