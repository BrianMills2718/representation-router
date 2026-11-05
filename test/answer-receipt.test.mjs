import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { route } from "../src/router.mjs";
import { buildAgentRecommendation } from "../src/agent-recommendation.mjs";
import { buildRenderPlan } from "../src/render-plan.mjs";

// Skill rating 2026-09-29: a live-demo result panel got a staged machine; no view for one run's answer plus its receipt.
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
import { renderPreview } from "../web/renderers.js";

const demo = {
  id: "live-demo-result", concern: "What did this one run answer, and can I trust it?",
  intent: ["understand", "communicate"], informationStructure: ["document", "list"], tasks: ["inspect", "confirm"],
  entities: ["answer", "evidence", "receipt"], scale: { items: 6, density: "low" },
  interaction: { mode: "read-only", dynamics: "interactive" }, surfaceContext: { medium: "embedded-widget", repeatedCollection: true }
};
const ranking = (useCase) => route(useCase, catalog, heuristics).accepted.map((r) => r.candidate.id);

test("the demo use case is valid", () => assert.equal(validateContract("use-case", demo).valid, true));

test("a live-demo result panel gets the answer-receipt card, not a staged machine or explainer", () => {
  const ids = ranking(demo);
  assert.equal(ids[0], "answer-receipt-card");
  assert.match(route(demo, catalog, heuristics).accepted[0].reasons.join(" "), /medium: embedded-widget/);
});

test("a portfolio page that argues a case still gets the argument page", () => {
  const ids = ranking({ ...demo, concern: "Why should a hiring manager believe this person can build agent systems?", informationStructure: ["document"], tasks: ["inspect"], entities: ["project", "result"], surfaceContext: { medium: "portfolio" } });
  assert.equal(ids[0], "argument-page");
});

test("the preview draws the answer first, evidence with sources, the receipt, and a failed run in the same layout", () => {
  const plan = buildRenderPlan(demo, { representation: { pattern: "answer-receipt-card", dynamics: "interactive" } });
  assert.equal(plan.adapter, "receipt");
  assert.equal(plan.data.question, demo.concern);
  assert.match(plan.data.evidence[0].label, /^Evidence/);
  assert.ok(plan.data.evidence.every((e) => e.source));
  assert.deepEqual(plan.data.receipt.map((r) => r.field), ["ran", "on", "took", "cost"]);
  assert.ok(plan.data.trace && plan.data.failure.keepsLayout);
});

test("the plan names headline, evidence and receipt marks, and the receipt and unavailable-state patterns surface", () => {
  const rec = buildAgentRecommendation({ useCase: demo, ...catalogs });
  assert.equal(rec.primary.representation, "answer-receipt-card");
  assert.equal(rec.compositionPlan.primary.form, "card");
  assert.match(JSON.stringify(rec.compositionPlan.marks), /headline: the answer/);
  assert.match(JSON.stringify(rec.compositionPlan.marks), /receipt strip/);
  const patterns = rec.interfacePatterns.map((p) => p.id);
  assert.ok(patterns.includes("completion-receipt"), patterns.join(","));
  assert.ok(patterns.includes("honest-unavailable-state"), patterns.join(","));
});

test("a static card can be plain Markdown", () => {
  const rec = buildAgentRecommendation({ useCase: { ...demo, interaction: { mode: "read-only", dynamics: "static" } }, ...catalogs });
  assert.equal(rec.primary.representation, "answer-receipt-card");
  assert.equal(rec.primary.implementation.renderer, "markdown");
});

test("the preview draws one run's card, with the failed state apart and labelled", () => {
  const container = { innerHTML: "", querySelector: () => null, querySelectorAll: () => [] };
  renderPreview(container, demo, { concern: demo.concern, representation: { pattern: "answer-receipt-card", dynamics: "interactive" } });
  const html = container.innerHTML;
  const [main, variant = ""] = html.split('<details class="receipt-variant">');
  assert.equal((main.match(/class="receipt-card /g) ?? []).length, 1);
  assert.match(main, /receipt-card answered/);
  assert.doesNotMatch(main, /receipt-card failed/);
  assert.match(variant, /The same card when a run fails/);
  assert.match(variant, /receipt-card failed/);
});

test("a document page with no run does not get the card; results that arrive count as a run", () => {
  const report = { ...demo, concern: "What does the design document say about retries?", surfaceContext: { medium: "technical-document" } };
  const top = route(report, catalog, heuristics).accepted[0];
  assert.notEqual(top.candidate.id, "answer-receipt-card");
  const card = route(report, catalog, heuristics).ranked.find((r) => r.candidate.id === "answer-receipt-card");
  assert.match(card.reasons.join(" "), /a run receipt needs a run/);
  const streamed = { ...demo, surfaceContext: undefined, constraints: { arrival: { mode: "streaming" } } };
  assert.equal(ranking(streamed)[0], "answer-receipt-card");
});
