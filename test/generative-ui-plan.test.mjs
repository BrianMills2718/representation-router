import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildAgentRecommendation } from "../src/agent-recommendation.mjs";
import { buildGenerativeUiPlan, buildTurnAnswer, componentsFor } from "../src/generative-ui-plan.mjs";

const readJson = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
const representationCatalog = await readJson("../catalog/representations.json");
const heuristics = await readJson("../heuristics/core.json");
const componentCatalog = await readJson("../catalog/generative-ui-components.json");
const openui = componentCatalog.libraries.find((library) => library.id === "openui");
const catalogs = {
  representationCatalog,
  representationRelations: await readJson("../catalog/representation-relations.json"),
  heuristics,
  interactionCatalog: await readJson("../catalog/interaction-patterns.json"),
  implementationCatalog: await readJson("../catalog/implementations.json"),
  interfacePatternCatalog: await readJson("../catalog/interface-patterns.json"),
  qualityCatalog: await readJson("../catalog/quality-methods.json"),
  playbookCatalog: await readJson("../catalog/implementation-playbooks.json"),
  compositionCatalog: await readJson("../catalog/composition-heuristics.json")
};

test("every representation has OpenUI components or a named custom component", () => {
  const mapped = new Set([...Object.keys(openui.patterns), ...Object.keys(openui.uncovered)]);
  assert.deepEqual(representationCatalog.map((entry) => entry.id).filter((id) => !mapped.has(id)), []);
  assert.deepEqual([...mapped].filter((id) => !representationCatalog.some((entry) => entry.id === id)), []);
});

test("mapped OpenUI components exist in the library's component set", () => {
  const known = new Set(openui.knownComponents);
  const used = [...openui.layoutComponents, ...Object.values(openui.patterns).flatMap((entry) => entry.components)];
  assert.deepEqual(used.filter((name) => !known.has(name)), []);
});

test("a graph answer names graph-viewer instead of letting the model fake a graph with cards", async () => {
  const useCase = await readJson("../examples/failure-propagation.json");
  const recommendation = buildAgentRecommendation({ useCase, ...catalogs, context: { generativeUi: true } });
  const plan = buildGenerativeUiPlan(recommendation, componentCatalog);
  assert.equal(plan.representation, "node-link-graph");
  assert.deepEqual(plan.customComponents.map((entry) => entry.name), ["GraphViewer"]);
  assert.match(plan.instruction, /do not imitate it with cards or tables/);
  assert.match(plan.library.installNote, /OPENUI_TELEMETRY_DISABLED=1/);
});

test("the compact turn answer matches the full router's view and lists OpenUI components", async () => {
  const useCase = await readJson("../examples/comparative-variants.json");
  const turn = buildTurnAnswer(useCase, representationCatalog, heuristics, componentCatalog);
  const full = buildAgentRecommendation({ useCase, ...catalogs, context: {} });
  assert.equal(turn.view, full.primary.representation);
  assert.ok(turn.components.includes("BarChart"));
  assert.equal(turn.why.length, 3);
  assert.ok(!("compositionPlan" in turn));
});

test("OpenUI is not chosen as a renderer unless generated UI was asked for", async () => {
  const useCase = await readJson("../examples/comparative-variants.json");
  const plain = buildAgentRecommendation({ useCase, ...catalogs, context: {} });
  assert.notEqual(plain.primary.implementation.renderer, "openui");
});

test("an unknown representation or library is reported, not silently mapped", () => {
  assert.match(componentsFor("made-up-view", openui).note, /No mapping/);
  assert.throws(() => buildTurnAnswer({}, representationCatalog, heuristics, componentCatalog, { library: "nope" }), /Unknown generative-UI library/);
});

test("a graph plan offers a recorded complement the library can draw, never a view the router rejected", async () => {
  const useCase = await readJson("../examples/failure-propagation.json");
  const recommendation = buildAgentRecommendation({ useCase, ...catalogs, context: { generativeUi: true } });
  const plan = buildGenerativeUiPlan(recommendation, componentCatalog, { relations: catalogs.representationRelations });
  const companions = plan.companions.map((entry) => entry.representation);
  assert.ok(companions.includes("directed-handoff-flow"));
  assert.ok(plan.components.includes("Steps"));
  // Barred: views ruled out for a reason the main view does not cover (lacking path highlighting is covered by the graph).
  const barred = new Set(recommendation.avoid.filter((entry) => entry.kind === "ruled-out" && !entry.lacks).map((entry) => entry.pattern));
  assert.deepEqual(companions.filter((id) => barred.has(id)), []);
  assert.deepEqual(recommendation.avoid.find((entry) => entry.pattern === "directed-handoff-flow")?.lacks, ["path-highlighting"]);
  assert.ok(!plan.removeFromLibrary.includes("Steps"));
  assert.match(plan.instruction, /one companion view/);
  const forbidden = plan.instruction.match(/Do not use as the main view: ([^.]*)\./)?.[1].split(", ") ?? [];
  assert.deepEqual(forbidden.filter((id) => companions.includes(id)), [], "an offered companion is never also forbidden");
});

test("the remove list leaves exactly the allowed components when applied to the known set", async () => {
  const useCase = await readJson("../examples/comparative-variants.json");
  const recommendation = buildAgentRecommendation({ useCase, ...catalogs, context: { generativeUi: true } });
  const plan = buildGenerativeUiPlan(recommendation, componentCatalog);
  const left = openui.knownComponents.filter((name) => !plan.removeFromLibrary.includes(name));
  assert.deepEqual(left.sort(), [...plan.components].sort());
});
