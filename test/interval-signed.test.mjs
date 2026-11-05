import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { route } from "../src/router.mjs";
import { buildAgentRecommendation } from "../src/agent-recommendation.mjs";
import { buildRenderPlan } from "../src/render-plan.mjs";

// Skill rating 2026-09-30: no view for estimates with uncertainty or for effects that go either way from zero.
const readJson = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
const catalog = await readJson("../catalog/representations.json");
const heuristics = await readJson("../heuristics/core.json");
const catalogs = {
  representationCatalog: catalog, heuristics,
  representationRelations: await readJson("../catalog/representation-relations.json"),
  interactionCatalog: await readJson("../catalog/interaction-patterns.json"),
  implementationCatalog: await readJson("../catalog/implementations.json"),
  interfacePatternCatalog: await readJson("../catalog/interface-patterns.json"),
  qualityCatalog: await readJson("../catalog/quality-methods.json"),
  playbookCatalog: await readJson("../catalog/implementation-playbooks.json"),
  compositionCatalog: await readJson("../catalog/composition-heuristics.json")
};
import { validateContract } from "../src/schema-validation.mjs";

const estimates = {
  id: "trial-effects", concern: "Which of six interventions clearly improved retention, given each estimate's confidence interval?",
  intent: ["compare", "decide"], informationStructure: ["scalar", "table"], tasks: ["compare", "rank"], entities: ["intervention"],
  scale: { items: 6, density: "low" }, interaction: { mode: "read-only", dynamics: "static" }, valueShape: "interval"
};
const effects = {
  id: "cause-effect-grid", concern: "Which policy levers raise or lower which outcomes, and how strongly?",
  intent: ["compare", "understand"], informationStructure: ["matrix"], tasks: ["compare", "locate"], entities: ["lever", "outcome"],
  scale: { items: 48, density: "medium" }, interaction: { mode: "exploratory", dynamics: "interactive" }, valueShape: "signed"
};
const accepted = (useCase) => route(useCase, catalog, heuristics).accepted;
const ranking = (useCase) => accepted(useCase).map((r) => r.candidate.id);

test("both use cases are valid against the schema", () => {
  assert.equal(validateContract("use-case", estimates).valid, true);
  assert.equal(validateContract("use-case", effects).valid, true);
});

test("estimates with intervals get the interval plot first, with the reason named", () => {
  const top = accepted(estimates)[0];
  assert.equal(top.candidate.id, "interval-plot");
  assert.match(top.reasons.join(" "), /range around each estimate/);
});

test("a bar chart is marked down when it would hide the range", () => {
  const bar = route(estimates, catalog, heuristics).ranked.find((r) => r.candidate.id === "bar-chart");
  assert.match(bar.reasons.join(" "), /would hide the range/);
});

test("without a value shape, plain amounts do not get the interval plot first", () => {
  const { valueShape, ...plain } = estimates;
  assert.notEqual(ranking(plain)[0], "interval-plot");
});

test("signed effects in a grid get the signed-effect matrix over the plain heatmap", () => {
  const ids = ranking(effects);
  assert.equal(ids[0], "signed-effect-matrix");
  const heat = route(effects, catalog, heuristics).ranked.find((r) => r.candidate.id === "heatmap");
  assert.match(heat.reasons.join(" "), /would hide the sign/);
  const { valueShape, ...plain } = effects;
  assert.notEqual(ranking(plain)[0], "signed-effect-matrix");
});

test("the previews draw intervals against a reference and signed cells with printed signs", () => {
  const iv = buildRenderPlan(estimates, { representation: { pattern: "interval-plot", dynamics: "static" } });
  assert.equal(iv.adapter, "interval");
  assert.equal(iv.data.reference, 0);
  assert.ok(iv.data.rows.every((r) => r.low <= r.estimate && r.estimate <= r.high));
  assert.ok(iv.data.rows.some((r) => r.crossesReference) && iv.data.rows.some((r) => !r.crossesReference));
  assert.match(iv.data.rows[0].label, /^Intervention/);
  const sm = buildRenderPlan(effects, { representation: { pattern: "signed-effect-matrix", dynamics: "interactive" } });
  assert.equal(sm.adapter, "signed-matrix");
  assert.ok(sm.data.cells.some((c) => c.value > 0) && sm.data.cells.some((c) => c.value < 0) && sm.data.cells.some((c) => c.value === 0));
  assert.match(sm.data.rows[0], /^Lever/);
  assert.match(sm.data.columns[0], /^Outcome/);
  assert.match(JSON.stringify(sm.data.legend), /blue.*grey.*orange/);
});

test("the composition plan names interval and diverging marks, not generic bars", () => {
  const a = buildAgentRecommendation({ useCase: estimates, ...catalogs });
  assert.equal(a.primary.representation, "interval-plot");
  assert.match(JSON.stringify(a.compositionPlan.marks), /line across its interval/);
  assert.match(a.compositionPlan.primary.valueEncoding, /reference line/);
  const b = buildAgentRecommendation({ useCase: effects, ...catalogs });
  assert.equal(b.primary.representation, "signed-effect-matrix");
  assert.match(b.compositionPlan.primary.valueEncoding, /grey at zero/);
  assert.ok(Object.values(b.compositionPlan.marks).every((m) => !m.encoding.colour), "colour is reserved for the sign");
  assert.doesNotMatch(JSON.stringify(b.compositionPlan), /\bred\b/);
});

test("a forecast with ranges over time keeps the interval plot, and a plain bar chart is not credited with signs", () => {
  const forecast = { ...estimates, id: "forecast", concern: "How sure is the monthly demand forecast for the next six months?", informationStructure: ["timeline", "scalar"], entities: ["month"] };
  assert.equal(ranking(forecast)[0], "interval-plot");
  const signedBars = { ...estimates, valueShape: "signed" };
  const bar = route(signedBars, catalog, heuristics).ranked.find((r) => r.candidate.id === "bar-chart");
  assert.match(bar.reasons.join(" "), /would hide the sign/);
});
