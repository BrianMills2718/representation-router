import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { buildAgentRecommendation, deliveryAllows } from "../src/agent-recommendation.mjs";
import { buildGenerativeUiPlan, buildTurnAnswer } from "../src/generative-ui-plan.mjs";

// Friction no-offline-or-print-constraint: a use case could not say "no external scripts" or "must print",
// so D3 or Plot was recommended for a page that forbade them.

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
const byId = new Map(catalogs.implementationCatalog.implementations.map((entry) => [entry.id, entry]));

async function recommend(example, constraints, context) {
  const useCase = await readJson(`../examples/${example}.json`);
  useCase.constraints = { ...(useCase.constraints ?? {}), ...constraints };
  return buildAgentRecommendation({ useCase, ...catalogs, context });
}

test("every implementation states whether it needs a script when the page is read", () => {
  for (const entry of catalogs.implementationCatalog.implementations) {
    assert.ok(["none", "optional", "required"].includes(entry.viewTimeScript), entry.id);
  }
});

test("a page with no JavaScript never gets a script-only library", async () => {
  for (const example of ["failure-propagation", "static-rule-chain-doc"]) {
    const { primary } = await recommend(example, { scripts: "none" });
    assert.notEqual(byId.get(primary.implementation.renderer).viewTimeScript, "required", `${example}: ${primary.implementation.renderer}`);
  }
});

test("a chart that would use Plot is pre-rendered when no JavaScript is allowed", () => {
  assert.equal(deliveryAllows(byId.get("observable-plot"), { scripts: "none" }), true);
  assert.equal(deliveryAllows(byId.get("d3"), { scripts: "none" }), false);
  assert.equal(deliveryAllows(byId.get("d3"), { scripts: "self-contained" }), true);
});

test("a self-contained page never depends on a running service, even one that wins without the constraint", async () => {
  for (const [example, context] of [
    ["failure-propagation", { formalModeling: true, requiresEditing: true, existingImplementations: ["sirius-web"] }],
    ["architecture-communication", { generativeUi: true, existingImplementations: ["openui"] }]
  ]) {
    const before = (await recommend(example, {}, context)).primary.implementation.renderer;
    assert.ok(byId.get(before).needsService, `${example}: precondition, ${before} should need a service`);
    const { primary } = await recommend(example, { scripts: "self-contained" }, context);
    assert.ok(!byId.get(primary.implementation.renderer).needsService, `${example}: ${primary.implementation.renderer}`);
    assert.ok(primary.implementation.notes.some((note) => /inline the library/.test(note)));
  }
});

test("generated-UI plans refuse a page that must be self-contained or script-free", async () => {
  const componentCatalog = await readJson("../catalog/generative-ui-components.json");
  const useCase = await readJson("../examples/architecture-communication.json");
  useCase.constraints = { ...(useCase.constraints ?? {}), scripts: "none" };
  const turn = buildTurnAnswer(useCase, catalogs.representationCatalog, catalogs.heuristics, componentCatalog);
  assert.deepEqual(turn.components, []);
  assert.match(turn.unavailable, /scripts is "none"/);
  const recommendation = buildAgentRecommendation({ useCase, ...catalogs, context: { generativeUi: true } });
  const plan = buildGenerativeUiPlan(recommendation, componentCatalog, { constraints: useCase.constraints });
  assert.deepEqual(plan.components, []);
  assert.match(plan.instruction, /static page/);
});

test("a recommendation without a quality catalog does not crash, with or without print", async () => {
  const useCase = await readJson("../examples/failure-propagation.json");
  assert.doesNotThrow(() => buildAgentRecommendation({ useCase, ...catalogs, qualityCatalog: null }));
  useCase.constraints = { ...(useCase.constraints ?? {}), print: true };
  assert.doesNotThrow(() => buildAgentRecommendation({ useCase, ...catalogs, qualityCatalog: null }));
});

test("a page that must print gets the print check and no video or WebGL renderer", async () => {
  const recommendation = await recommend("failure-propagation", { print: true }, { existingImplementations: ["sigma-js"] });
  assert.notEqual(recommendation.primary.implementation.renderer, "sigma-js");
  assert.ok(recommendation.quality.hardChecks.some((check) => check.startsWith("prints-on-paper")));
  assert.ok(recommendation.primary.implementation.notes.some((note) => /print stylesheet/.test(note)));
});

test("without delivery constraints nothing changes", async () => {
  const recommendation = await recommend("failure-propagation", {});
  assert.ok(!recommendation.quality.hardChecks.some((check) => check.startsWith("prints-on-paper")));
});

test("a no-JavaScript graph is drawn by a static-file tool and gets no click or zoom checks", async () => {
  const recommendation = await recommend("failure-propagation", { scripts: "none" });
  assert.equal(byId.get(recommendation.primary.implementation.renderer).viewTimeScript, "none", recommendation.primary.implementation.renderer);
  assert.deepEqual(recommendation.primary.interaction, []);
  const checks = [...recommendation.quality.hardChecks, ...recommendation.quality.softChecks, ...(recommendation.quality.usabilityChecks ?? [])];
  assert.ok(!checks.includes("every-object-reveals-more-on-click-nothing-is-a-dead-end"));
});
