import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { applicableHeuristics, buildCompositionPlan, compositionTags, densityBudget, COMPOSITION_TAGS } from "../src/composition-plan.mjs";
import { composePrompts } from "../src/sketch-set.mjs";
import { buildAgentRecommendation } from "../src/agent-recommendation.mjs";

const read = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
const catalog = await read("../catalog/composition-heuristics.json");
const useCase = await read("../examples/requirements-verification.json");

test("the composition catalog names a source, a plan effect, a sketch instruction, and a check for every heuristic", () => {
  assert.ok(catalog.heuristics.length >= 20);
  const ids = new Set();
  for (const h of catalog.heuristics) {
    for (const key of ["id", "source", "principle", "appliesWhen", "shapesPlan", "sketchInstruction", "check", "prevents"]) {
      assert.ok(h[key] && String(h[key]).length, `${h.id ?? "?"} lacks ${key}`);
    }
    assert.ok(!ids.has(h.id), `duplicate id ${h.id}`); ids.add(h.id);
  }
  const sources = new Set(catalog.heuristics.map((h) => h.source.split(/[;,]/)[0].trim()));
  assert.ok(sources.size >= 6, `holistic layer must draw on several bodies of work, got ${[...sources].join(" | ")}`);
});

test("heuristics apply by what the use case is, not to everything blindly", async () => {
  const tags = compositionTags(useCase);
  assert.ok(tags.has("compare") && tags.has("graph") && tags.has("explorer"));
  const ids = new Set(applicableHeuristics(catalog, useCase).map((h) => h.id));
  assert.ok(ids.has("small-multiples-for-comparison"), "compare intent pulls in small multiples");
  assert.ok(ids.has("overview-zoom-detail"), "network structure pulls in overview-zoom-detail");
  assert.ok(!ids.has("one-drawing-with-callouts"), "an inspect/compare tool is not an explainer");
  const explainer = { ...useCase, intent: ["understand", "communicate"], tasks: ["lookup"], informationStructure: ["flow"], interaction: { mode: "guided", dynamics: "static" } };
  const explainerIds = new Set(applicableHeuristics(catalog, explainer).map((h) => h.id));
  assert.ok(explainerIds.has("one-drawing-with-callouts"));
  const byRole = { ...useCase, intent: ["inspect"], tasks: ["lookup"], representationRole: "explanatory", informationStructure: ["flow"] };
  assert.ok(new Set(applicableHeuristics(catalog, byRole).map((h) => h.id)).has("one-drawing-with-callouts"), "representationRole explanatory is enough");
  const portfolioHome = JSON.parse(await readFile(new URL("../docs/evidence/portfolio-review-20260925/use-cases/analysis-pillar.json", import.meta.url), "utf8").catch(() => "null"));
  if (portfolioHome) assert.ok(new Set(applicableHeuristics(catalog, portfolioHome).map((h) => h.id)).has("one-drawing-with-callouts"), "the real portfolio homepage case now gets the callouts principle");
  assert.ok(!explainerIds.has("small-multiples-for-comparison"));
});

test("the page plan states the question, one primary element, a reading order, and an honest density verdict", () => {
  const plan = buildCompositionPlan({ useCase, selectedRepresentation: "coverage-matrix", catalog });
  assert.equal(plan.question, useCase.concern);
  assert.equal(plan.primary.representation, "coverage-matrix");
  assert.equal(plan.primary.form, "table");
  assert.deepEqual(plan.readingOrder.slice(0, 2), ["title", "primary"]);
  assert.equal(plan.densityBudget.items, 1200);
  assert.equal(plan.densityBudget.withinBudget, false, "1200 items on one screen must be flagged, not shrunk");
  assert.ok(plan.secondary.some((s) => s.id === "legend"), "recognition over recall adds an in-place legend");
  assert.ok(plan.sketchInstructions.length >= 15);
  assert.equal(densityBudget({ width: 390, height: 844 }).maxObjects, 12, "a phone gets the floor budget");
});

test("sketch prompts state the composition rules before the picture instruction", () => {
  const spec = { id: "s", shell: "a plain app shell", pictures: [{ id: "a", instruction: "the main tab" }] };
  const [withRules] = composePrompts(spec, { compositionCatalog: catalog });
  assert.ok(withRules.text.includes("Composition rules for every picture in the set:"));
  assert.ok(withRules.text.includes("One main drawing occupies most of the area"));
  assert.ok(withRules.text.indexOf("Composition rules") < withRules.text.indexOf("This picture:"));
  const [chosen] = composePrompts({ ...spec, composition: ["one-question-title"] }, { compositionCatalog: catalog });
  assert.ok(chosen.text.includes("Put one short title at the top"));
  assert.ok(!chosen.text.includes("One main drawing occupies"), "an explicit list narrows the rules");
  const [bare] = composePrompts(spec);
  assert.ok(!bare.text.includes("Composition rules"), "no catalog, no rules: never silently invent them");
});

test("a recommendation carries the page plan and its checks reach the disposition checklist", async () => {
  const [representationCatalog, representationRelations, heuristics, interactionCatalog, implementationCatalog, interfacePatternCatalog, qualityCatalog, playbookCatalog] = await Promise.all([
    read("../catalog/representations.json"), read("../catalog/representation-relations.json"), read("../heuristics/core.json"),
    read("../catalog/interaction-patterns.json"), read("../catalog/implementations.json"), read("../catalog/interface-patterns.json"),
    read("../catalog/quality-methods.json"), read("../catalog/implementation-playbooks.json")
  ]);
  const rec = buildAgentRecommendation({ useCase, representationCatalog, representationRelations, heuristics, interactionCatalog, implementationCatalog, interfacePatternCatalog, qualityCatalog, playbookCatalog, compositionCatalog: catalog, context: {} });
  assert.ok(rec.compositionPlan, "recommendation must carry a compositionPlan when the catalog is supplied");
  assert.equal(rec.compositionPlan.primary.representation, rec.primary.representation);
  assert.ok(rec.quality.softChecks.includes("one-element-dominates-by-size-weight-or-contrast"));
  assert.ok(rec.quality.softChecks.includes("comparisons-use-identical-small-frames"));
  assert.equal(new Set(rec.quality.softChecks).size, rec.quality.softChecks.length, "no duplicate checks after merge");
});

test("every heuristic is reachable: appliesWhen names a tag compositionTags can emit (issue #62)", () => {
  const known = new Set(COMPOSITION_TAGS);
  for (const h of catalog.heuristics) {
    assert.ok(h.appliesWhen.some((tag) => known.has(tag)), `${h.id} names no emitted tag, so it can never enter a plan: ${h.appliesWhen.join(" | ")}`);
    for (const tag of h.appliesWhen) {
      if (!/\s/.test(tag)) assert.ok(known.has(tag), `${h.id} uses unknown tag "${tag}"`);
    }
  }
});

test("use-case fields produce the tags the catalog relies on", () => {
  const base = { intent: ["inspect"], tasks: ["lookup"], informationStructure: ["table"], interaction: { mode: "read-only", dynamics: "static" } };
  const tags = (extra) => compositionTags({ ...base, ...extra });
  assert.ok(!tags({}).has("interactive"));
  assert.ok(tags({ interaction: { mode: "exploratory", dynamics: "static" } }).has("interactive"));
  assert.ok(tags({ interaction: { mode: "read-only", dynamics: "interactive" } }).has("interactive"));
  assert.ok(tags({ surfaceContext: { medium: "dashboard" } }).has("dashboard"));
  assert.ok(tags({ surfaceContext: { medium: "application" } }).has("application-ui"));
  assert.ok(tags({ surfaceContext: { medium: "portfolio" } }).has("portfolio"));
  assert.ok(tags({ surfaceContext: { medium: "presentation" } }).has("presentation"));
  assert.ok(tags({ surfaceContext: { repeatedCollection: true } }).has("variants"));
  assert.ok(tags({ abstractionLevel: "overview" }).has("overview"));
  assert.ok(tags({ constraints: { mobile: true } }).has("multi-device"));
  assert.ok(tags({ constraints: { realtime: true } }).has("live"));
  assert.ok(tags({ learning: { entryMode: "guided" } }).has("guided"));
  assert.ok(tags({ interaction: { mode: "authoring", dynamics: "static" } }).has("authoring"));
  assert.ok(!tags({}).has("authoring"));
  // n-ary facts in named roles route to keep-n-ary-relations-whole and the graph family
  assert.ok(tags({ informationStructure: ["hypergraph"] }).has("hypergraph"));
  assert.ok(tags({ informationStructure: ["hypergraph"] }).has("graph"));
  const emittable = new Set();
  for (const extra of [{}, { intent: ["compare", "understand", "communicate", "decide", "monitor", "plan"] },
    { informationStructure: ["network", "hypergraph", "spatial", "flow", "timeline"] }, { interaction: { mode: "exploratory", dynamics: "interactive" } }, { interaction: { mode: "authoring", dynamics: "static" } },
    ...["dashboard", "application", "portfolio"].map((medium) => ({ surfaceContext: { medium, repeatedCollection: true } })),
    { abstractionLevel: "overview", constraints: { mobile: true, realtime: true }, learning: { entryMode: "guided" } }]) {
    for (const tag of tags(extra)) emittable.add(tag);
  }
  assert.deepEqual([...COMPOSITION_TAGS].filter((tag) => !emittable.has(tag)), [], "every declared tag has a use-case field that emits it");
});

test("the formerly unreachable heuristics enter plans for fitting use cases (issue #62)", () => {
  const ids = (uc) => new Set(applicableHeuristics(catalog, uc).map((h) => h.id));
  const base = { intent: ["inspect"], tasks: ["lookup"], informationStructure: ["table"], interaction: { mode: "read-only", dynamics: "static" } };
  const expect = {
    "merge-overlapping-views": { informationStructure: ["network", "process"] },
    "quote-source-claims-no-invented-symmetry": { intent: ["communicate"] },
    "follow-the-presenters-argument-order": { learning: { entryMode: "guided" } },
    "auto-layout-then-enrich": { informationStructure: ["network"] },
    "shape-mirrors-behaviour": { informationStructure: ["flow"] },
    "every-mark-opens-its-subject": { interaction: { mode: "exploratory", dynamics: "interactive" } },
    "no-truncated-text": {},
    "every-label-explains-itself": { interaction: { mode: "read-only", dynamics: "interactive" } },
    "layout-fits-the-device": { constraints: { mobile: true } },
    "live-surface-refreshes-itself": { constraints: { realtime: true } },
    "tour-shows-where-you-are": { learning: { entryMode: "guided" } },
  };
  for (const [id, extra] of Object.entries(expect)) {
    assert.ok(ids({ ...base, ...extra }).has(id), `${id} should apply to ${JSON.stringify(extra)}`);
  }
  assert.ok(!ids(base).has("live-surface-refreshes-itself"), "a static read-only table is not a live surface");
  assert.ok(!ids(base).has("layout-fits-the-device"), "desktop-only cases are not told to fit phones");
});
