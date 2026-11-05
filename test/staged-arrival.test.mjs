import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { route } from "../src/router.mjs";
import { buildCompositionPlan } from "../src/composition-plan.mjs";
import { validateContract } from "../src/schema-validation.mjs";

// Friction no-staged-arrival: a live demo whose results arrive over 30-90 seconds in stages could only say
// realtime true or false, and a scroll-driven explainer tied for first (skill rating 2026-09-30).

const readJson = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
const catalog = await readJson("../catalog/representations.json");
const heuristics = await readJson("../heuristics/core.json");
const composition = await readJson("../catalog/composition-heuristics.json");

const demo = (constraints = {}) => ({
  id: "staged-demo", concern: "What did this pipeline answer for my input, and how did it get there?",
  intent: ["understand", "communicate"], informationStructure: ["process", "sequence"], tasks: ["trace", "inspect"],
  entities: ["stage", "result"], relationships: ["feeds"], scale: { items: 6, density: "low" },
  interaction: { mode: "read-only", dynamics: "animated" }, explanatoryFocus: ["flow", "mechanism"],
  constraints, successCriteria: ["A visitor sees each stage finish and the answer."]
});
const staged = { arrival: { mode: "staged", stages: ["extract", "answer"], typicalSeconds: 60 } };
const scores = (useCase) => Object.fromEntries(route(useCase, catalog, heuristics, { limit: 50 }).ranked.map((r) => [r.candidate.id, r]));

test("staged arrival breaks the tie for the view whose objects keep their place", () => {
  const before = scores(demo()), after = scores(demo(staged));
  assert.equal(before["staged-explanatory-machine"].score, before["scroll-linked-explainer"].score, "the reported tie");
  assert.ok(after["staged-explanatory-machine"].score > after["scroll-linked-explainer"].score);
  assert.ok(after["scroll-linked-explainer"].reasons.some((r) => r.startsWith("scroll-driven while results arrive staged")));
  assert.ok(after["staged-explanatory-machine"].reasons.some((r) => r.startsWith("objects keep their place")));
  assert.equal(route(demo(staged), catalog, heuristics).accepted[0].candidate.id, "staged-explanatory-machine");
  // Keeping identity is not keeping place: the scroll-driven view gets only the penalty, no bonus.
  assert.equal(after["scroll-linked-explainer"].score, before["scroll-linked-explainer"].score - heuristics.penalties.cannotShowArrival);
  assert.equal(after["staged-explanatory-machine"].score, before["staged-explanatory-machine"].score + heuristics.weights.stablePlacesWhileArriving);
});

test("only views marked fills-in-place get the arrival bonus", () => {
  const marked = catalog.filter((r) => r.capabilities.includes("fills-in-place")).map((r) => r.id).sort();
  assert.deepEqual(marked, ["answer-receipt-card", "data-table", "directed-handoff-flow", "link-directory", "small-multiples", "staged-explanatory-machine"]);
});

test("the generated-UI plan and the per-turn answer carry the arrival instruction", async () => {
  const { buildAgentRecommendation } = await import("../src/agent-recommendation.mjs");
  const { buildGenerativeUiPlan, buildTurnAnswer } = await import("../src/generative-ui-plan.mjs");
  const components = await readJson("../catalog/generative-ui-components.json");
  const catalogs = {
    representationCatalog: catalog, representationRelations: await readJson("../catalog/representation-relations.json"), heuristics,
    interactionCatalog: await readJson("../catalog/interaction-patterns.json"), implementationCatalog: await readJson("../catalog/implementations.json"),
    interfacePatternCatalog: await readJson("../catalog/interface-patterns.json"), qualityCatalog: await readJson("../catalog/quality-methods.json"),
    playbookCatalog: await readJson("../catalog/implementation-playbooks.json"), compositionCatalog: composition
  };
  const useCase = demo(staged);
  const plan = buildGenerativeUiPlan(buildAgentRecommendation({ useCase, ...catalogs }), components, { constraints: useCase.constraints });
  assert.match(plan.instruction, /Results arrive in stages \(extract → answer, about 60 seconds\)/);
  assert.match(plan.instruction, /keep what arrived and offer a retry/);
  assert.match(buildTurnAnswer(demo({ arrival: { mode: "streaming" } }), catalog, heuristics, components).instruction, /Items keep arriving/);
  assert.doesNotMatch(buildTurnAnswer(demo(), catalog, heuristics, components).instruction, /arriv/);
});

test("a recorded clip cannot show a live run arriving", () => {
  const playback = (constraints) => ({ ...demo(constraints), interaction: { mode: "read-only", dynamics: "playback" } });
  const before = scores(playback({}))["animated-explainer-clip"], after = scores(playback(staged))["animated-explainer-clip"];
  assert.equal(after.score, before.score - heuristics.penalties.cannotShowArrival);
  assert.ok(!after.reasons.some((r) => r.startsWith("objects keep their place")));
});

test("at-once arrival changes nothing", () => {
  const plain = scores(demo()), atOnce = scores(demo({ arrival: { mode: "at-once" } }));
  for (const id of Object.keys(plain)) assert.equal(atOnce[id].score, plain[id].score, id);
});

test("the page plan gets progress and failure slots naming the stages and the usual time", () => {
  const plan = buildCompositionPlan({ useCase: demo(staged), catalog: composition });
  const progress = plan.secondary.find((s) => s.id === "progress-state"), failure = plan.secondary.find((s) => s.id === "failure-state");
  assert.match(progress.job, /extract → answer/);
  assert.match(progress.job, /usual 60 seconds/);
  assert.match(failure.job, /which stage failed/);
  assert.ok(plan.readingOrder.includes("progress-state") && plan.readingOrder.includes("failure-state"));
  const streaming = buildCompositionPlan({ useCase: demo({ arrival: { mode: "streaming" } }), catalog: composition });
  assert.match(streaming.secondary.find((s) => s.id === "progress-state").job, /still arriving/);
  assert.match(streaming.secondary.find((s) => s.id === "failure-state").job, /reconnect/);
  const none = buildCompositionPlan({ useCase: demo({ arrival: { mode: "at-once" } }), catalog: composition });
  assert.ok(!none.secondary.some((s) => s.id === "progress-state" || s.id === "failure-state"));
});

test("the schema accepts arrival and rejects malformed values", () => {
  assert.equal(validateContract("use-case", demo(staged)).valid, true);
  for (const bad of [{ mode: "later" }, { stages: ["a"] }, { mode: "staged", stages: [] }, { mode: "staged", stages: [""] }, { mode: "staged", typicalSeconds: 0 }, { mode: "staged", eta: 5 }]) {
    assert.equal(validateContract("use-case", demo({ arrival: bad })).valid, false, JSON.stringify(bad));
  }
});
