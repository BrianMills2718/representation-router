import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { route } from "../src/router.mjs";
import { validateContract } from "../src/schema-validation.mjs";

const readJson = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
const catalog = await readJson("../catalog/representations.json");
const heuristics = await readJson("../heuristics/core.json");

// The 2026-10-01 rating: a compact panel of links on a static dashboard, each item only a link out.
const directory = {
  id: "link-out-panel", concern: "Where are the project's tools and documents?", stakeholder: "a visitor to the dashboard",
  intent: ["navigate"], informationStructure: ["list"], tasks: ["locate", "select"],
  scale: { items: 24, density: "low" }, interaction: { mode: "exploratory", dynamics: "interactive" }, constraints: { mobile: true }
};
const top = (useCase) => route(useCase, catalog, heuristics).accepted[0].candidate.id;
const result = (useCase, id) => {
  const routed = route(useCase, catalog, heuristics);
  return [...routed.ranked, ...routed.rejected, ...(routed.setAside ?? [])].find((r) => r.candidate.id === id);
};

test("itemDetail is a valid use-case field and rejects other values", () => {
  assert.equal(validateContract("use-case", { ...directory, itemDetail: "link-out" }).valid, true);
  assert.equal(validateContract("use-case", { ...directory, itemDetail: "popup" }).valid, false);
});

test("a list whose only detail is a link gets the link directory, and master-detail is rejected with the reason", () => {
  const useCase = { ...directory, itemDetail: "link-out" };
  assert.equal(top(useCase), "link-directory");
  const md = result(useCase, "master-detail");
  assert.equal(md.rejected, true);
  assert.match(md.rejectedBecause.join(" "), /only detail is a link elsewhere/);
  assert.equal(result(useCase, "schema-explorer").rejected, true);
});

test("items with no detail beyond their row also reject detail-pane views", () => {
  const md = result({ ...directory, itemDetail: "none" }, "master-detail");
  assert.equal(md.rejected, true);
  assert.match(md.rejectedBecause.join(" "), /no detail beyond their row/);
});

test("items with detail on the page keep master-detail first and mark the link list down", () => {
  const useCase = { ...directory, itemDetail: "in-page" };
  assert.equal(top(useCase), "master-detail");
  assert.match(result(useCase, "link-directory").reasons.join(" "), /only sends the reader away/);
});

test("only detail-pane views are marked needsItemDetail", () => {
  assert.deepEqual(catalog.filter((r) => r.needsItemDetail).map((r) => r.id).sort(), ["master-detail", "schema-explorer"]);
});

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
const { buildAgentRecommendation } = await import("../src/agent-recommendation.mjs");
const { buildRenderPlan } = await import("../src/render-plan.mjs");
const linkPanel = { ...directory, itemDetail: "link-out", entities: ["tool", "category"] };

test("the preview draws groups of links, not a generic table", () => {
  const plan = buildRenderPlan(linkPanel, { representation: { pattern: "link-directory", dynamics: "interactive" } });
  assert.equal(plan.adapter, "directory");
  assert.equal(plan.data.groups[0].label, "Category 1");
  assert.equal(plan.data.groups[0].items[0].label, "Tool 1");
  assert.ok(plan.data.groups.every((g) => g.items.every((i) => i.href && i.note)));
});

test("the page plan draws rows as links under group headings and reports no missing grammar", () => {
  const { primary, compositionPlan } = buildAgentRecommendation({ useCase: linkPanel, ...catalogs });
  assert.equal(primary.representation, "link-directory");
  assert.equal(compositionPlan.primary.form, "list");
  assert.ok(!(compositionPlan.designGaps ?? []).some((gap) => /no drawing grammar/.test(gap)));
  assert.match(JSON.stringify(compositionPlan.marks), /link out/);
  assert.match(JSON.stringify(compositionPlan.marks), /group heading/);
});

test("a static list of links is written as Markdown; an interactive one is not", () => {
  const staticPanel = { ...linkPanel, interaction: { mode: "read-only", dynamics: "static" } };
  assert.equal(buildAgentRecommendation({ useCase: staticPanel, ...catalogs }).primary.implementation.renderer, "markdown");
  assert.notEqual(buildAgentRecommendation({ useCase: linkPanel, ...catalogs }).primary.implementation.renderer, "markdown");
});
