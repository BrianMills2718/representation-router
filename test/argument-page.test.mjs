import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { route } from "../src/router.mjs";
import { buildAgentRecommendation } from "../src/agent-recommendation.mjs";
import { buildRenderPlan } from "../src/render-plan.mjs";

// Skill rating 2026-09-25: reviewing a narrative portfolio site, node-link-graph and magnitude-flow ranked first.
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
const portfolio = {
  id: "portfolio-case", concern: "Why should a hiring manager believe this person can build agent systems?",
  intent: ["communicate", "understand"], informationStructure: ["document"], tasks: ["inspect"], entities: ["project", "result"],
  scale: { items: 8, density: "low" }, interaction: { mode: "read-only", dynamics: "interactive" },
  representationRole: "explanatory", surfaceContext: { medium: "portfolio" }
};
const ranking = (useCase) => route(useCase, catalog, heuristics).accepted.map((r) => r.candidate.id);

test("a narrative portfolio page gets the argument page first, not a graph or flow", () => {
  const ids = ranking(portfolio);
  assert.equal(ids[0], "argument-page");
  assert.ok(!["node-link-graph", "magnitude-flow"].includes(ids[0]));
  assert.match(route(portfolio, catalog, heuristics).accepted[0].reasons.join(" "), /medium: portfolio/);
});

test("a static narrative page gets the argument page, not a sequence diagram or timeline", () => {
  assert.equal(ranking({ ...portfolio, interaction: { mode: "read-only", dynamics: "static" } })[0], "argument-page");
});

test("a page that explains how a mechanism works still gets an explainer", () => {
  const ids = ranking({ ...portfolio, surfaceContext: undefined, intent: ["understand"], explanatoryFocus: ["mechanism"] });
  assert.ok(["staged-explanatory-machine", "scroll-linked-explainer"].includes(ids[0]), ids[0]);
});

test("the preview and page plan draw a claim with sections and evidence", () => {
  const plan = buildRenderPlan(portfolio, { representation: { pattern: "argument-page", dynamics: "interactive" } });
  assert.equal(plan.adapter, "argument");
  assert.equal(plan.data.claim, portfolio.concern);
  assert.deepEqual(plan.data.sections.map((s) => s.claim.split(":")[0]), ["Project 1", "Project 2", "Project 3"]);
  assert.match(plan.data.sections[0].evidence, /result that backs it/);
  const { primary, compositionPlan } = buildAgentRecommendation({ useCase: portfolio, ...catalogs });
  assert.equal(primary.representation, "argument-page");
  assert.equal(compositionPlan.primary.form, "argument");
  assert.ok(!compositionPlan.designGaps.some((gap) => /no drawing grammar/.test(gap)));
  assert.match(JSON.stringify(compositionPlan.marks), /sub-claim it proves/);
});

test("the claim comes from the concern, not the short page title", () => {
  const plan = buildRenderPlan({ ...portfolio, title: "Agent systems portfolio" }, { representation: { pattern: "argument-page", dynamics: "interactive" } });
  assert.equal(plan.data.claim, portfolio.concern);
});

test("a static argument page is written as Markdown", () => {
  const staticPage = { ...portfolio, interaction: { mode: "read-only", dynamics: "static" } };
  assert.equal(buildAgentRecommendation({ useCase: staticPage, ...catalogs }).primary.implementation.renderer, "markdown");
});
