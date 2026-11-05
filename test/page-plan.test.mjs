import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { buildPagePlan, partUseCase } from "../src/page-plan.mjs";
import { PHONE_VIEWPORT } from "../src/composition-plan.mjs";
import { validateContract } from "../src/schema-validation.mjs";

// Skill rating 2026-09-30 (friction no-page-level-plan): compositionPlan covered one use case, so a page of
// several sections had no plan across them.
const readJson = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
const catalogs = {
  representationCatalog: await readJson("../catalog/representations.json"),
  heuristics: await readJson("../heuristics/core.json"),
  representationRelations: await readJson("../catalog/representation-relations.json"),
  interactionCatalog: await readJson("../catalog/interaction-patterns.json"),
  implementationCatalog: await readJson("../catalog/implementations.json"),
  interfacePatternCatalog: await readJson("../catalog/interface-patterns.json"),
  qualityCatalog: await readJson("../catalog/quality-methods.json"),
  playbookCatalog: await readJson("../catalog/implementation-playbooks.json"),
  compositionCatalog: await readJson("../catalog/composition-heuristics.json")
};
const page = await readJson("../examples/page-requirements-status.json");
const plan = buildPagePlan({ useCase: page, ...catalogs });

test("the use-case schema accepts parts and rejects a part without a concern", () => {
  assert.equal(validateContract("use-case", page).valid, true);
  const bad = { ...page, parts: [{ id: "a" }, page.parts[1]] };
  assert.equal(validateContract("use-case", bad).valid, false);
  assert.equal(validateContract("use-case", { ...page, parts: [page.parts[0]] }).valid, false, "one part is not a page of sections");
});

test("a part inherits the page's fields, overrides its own, and keeps the page's title and mustShow for the page", () => {
  const trend = partUseCase({ ...page, mustShow: ["owner"] }, page.parts[1]);
  assert.equal(trend.id, "requirements-status-page/trend");
  assert.deepEqual(trend.entities, ["requirement"], "the part's own entities win");
  assert.equal(trend.stakeholder, "verification engineer", "the page's stakeholder is inherited");
  assert.equal(trend.title, "Coverage this quarter");
  assert.equal(trend.mustShow, undefined);
  assert.equal(trend.parts, undefined);
});

test("one page plan: sections in order, one phone screen budget, each section routed", () => {
  assert.deepEqual(plan.viewport, PHONE_VIEWPORT, "constraints.mobile plans the whole page for a phone");
  assert.equal(plan.densityBudget.maxObjectsPerScreen, 12);
  assert.deepEqual(plan.sections.map((s) => s.id), ["coverage", "trend", "chain"]);
  assert.deepEqual(plan.readingOrder, ["title", "legend", "coverage", "trend", "chain"]);
  for (const section of plan.sections) {
    assert.ok(section.representation, `${section.id} gets a view`);
    assert.equal(plan.recommendations[section.id].compositionPlan.viewport.width, PHONE_VIEWPORT.width, `${section.id} is planned for the page's screen`);
  }
});

test("a part cannot widen the page's screen", () => {
  const wide = { ...page, parts: [{ ...page.parts[0], constraints: { viewports: [{ width: 1920, height: 1080 }] } }, page.parts[1]] };
  const p = buildPagePlan({ useCase: wide, ...catalogs });
  assert.deepEqual(p.viewport, PHONE_VIEWPORT);
});

test("each object kind keeps one colour and shape on every section, and one legend covers the page", () => {
  assert.deepEqual(plan.sharedKinds.map((k) => [k.kind, k.colour]), [["requirement", "blue"], ["verification-case", "orange"], ["evidence", "grey"]]);
  for (const section of plan.sections) {
    for (const [kind, mark] of Object.entries(section.marks)) {
      assert.equal(mark.encoding.colour, plan.sharedKinds.find((k) => k.kind === kind).colour, `${kind} in ${section.id}`);
    }
    assert.ok(!section.secondary.some((s) => s.id === "legend"), `${section.id} has no legend of its own`);
  }
  assert.equal(plan.sections[1].marks.requirement.encoding.colour, "blue", "a one-kind section still takes the page's colour");
  assert.match(plan.secondary[0].job, /requirement = blue/);
  // A section that meets the kinds in another order still gets the page's colours.
  const reordered = { ...page, parts: [{ ...page.parts[2], entities: ["evidence", "verification-case", "requirement"] }, page.parts[0]] };
  const p = buildPagePlan({ useCase: reordered, ...catalogs });
  const evidence = p.sharedKinds.find((k) => k.kind === "evidence");
  assert.equal(p.sections[1].marks.evidence.encoding.colour, evidence.colour);
});

test("design gaps across sections: the same view twice in a row, an untitled section, a section over the screen budget", () => {
  assert.ok(!plan.designGaps.some((g) => /both use/.test(g)), plan.designGaps.join("\n"));
  const twice = buildPagePlan({ useCase: { ...page, parts: [page.parts[0], { ...page.parts[0], id: "coverage-again", title: "Again" }] }, ...catalogs });
  assert.ok(twice.designGaps.some((g) => /coverage and coverage-again both use/.test(g)), twice.designGaps.join("\n"));
  const { title, ...untitled } = page.parts[0];
  const p = buildPagePlan({ useCase: { ...page, parts: [{ ...untitled, scale: { items: 40, density: "medium" } }, page.parts[1]] }, ...catalogs });
  assert.ok(p.designGaps.some((g) => /Section coverage has no title/.test(g)));
  assert.ok(p.designGaps.some((g) => /Section coverage shows 40 items but one 390x844 screen holds 12/.test(g)));
  assert.equal(p.densityBudget.withinBudget, false);
});

test("a trend section says follow-trend and gets a line chart (issue #156)", () => {
  assert.equal(plan.sections.find((s) => s.id === "trend").representation, "line-chart");
  const asLookup = { ...page, parts: [page.parts[0], { ...page.parts[1], tasks: ["compare", "lookup"] }] };
  assert.notEqual(buildPagePlan({ useCase: asLookup, ...catalogs }).sections[1].representation, "line-chart", "without the task the router has no sign the values form a trend");
});

test("follow-trend picks a line chart on a static phone page too; ranges still get the interval plot, and small multiples do not take a single trend (Codex review 2026-10-26)", async () => {
  const { route } = await import("../src/router.mjs");
  const weekly = {
    id: "weekly-rate", concern: "How did the pass rate move week by week?", intent: ["compare"], informationStructure: ["timeline"],
    tasks: ["compare", "follow-trend"], entities: ["week"], scale: { items: 12, density: "low" },
    interaction: { mode: "read-only", dynamics: "static" }, constraints: { mobile: true, accessibility: "high" }
  };
  assert.equal(route(weekly, catalogs.representationCatalog, catalogs.heuristics).accepted[0].candidate.id, "line-chart");
  assert.equal(route({ ...weekly, valueShape: "interval" }, catalogs.representationCatalog, catalogs.heuristics).accepted[0].candidate.id, "interval-plot");
});

test("sections carry their alternatives with the recorded relation and reason", () => {
  const coverage = plan.sections[0];
  assert.ok(coverage.alternatives.length > 0);
  for (const alt of coverage.alternatives) assert.ok(alt.relationshipToPrimary && alt.reason, alt.representation);
});

test("a bad part is named in the error", () => {
  const bad = { ...page, parts: [page.parts[0], { ...page.parts[1], tasks: ["not-a-task"] }] };
  assert.throws(() => buildPagePlan({ useCase: bad, ...catalogs }), /Part trend:/);
});

test("the recommend CLI emits the page plan for a use case with parts", () => {
  const cli = fileURLToPath(new URL("../src/recommend-cli.mjs", import.meta.url));
  const out = JSON.parse(execFileSync(process.execPath, [cli, fileURLToPath(new URL("../examples/page-requirements-status.json", import.meta.url))], { encoding: "utf8" }));
  assert.deepEqual(out.sections.map((s) => s.id), ["coverage", "trend", "chain"]);
  assert.ok(out.recommendations.coverage.primary);
});

test("page-wide constraints survive a part that sets its own (Codex review 2026-10-26)", () => {
  const strict = { ...page, constraints: { ...page.constraints, scripts: "none" } };
  const merged = partUseCase(strict, { id: "x", concern: "q", constraints: { print: true } });
  assert.equal(merged.constraints.scripts, "none");
  assert.equal(merged.constraints.print, true);
  assert.equal(merged.constraints.mobile, true);
});

test("repeated part ids are rejected (Codex review 2026-10-26)", () => {
  assert.throws(() => buildPagePlan({ useCase: { ...page, parts: [page.parts[0], page.parts[0]] }, ...catalogs }), /repeated: coverage/);
});

test("a section whose colour shows a value keeps its own key and the page key says so (Codex review 2026-10-26)", () => {
  const signed = {
    id: "effects", title: "Effects by group", concern: "Which changes raised or lowered each requirement group's pass rate?",
    intent: ["compare", "understand"], informationStructure: ["matrix"], tasks: ["compare", "locate"], valueShape: "signed",
    entities: ["requirement", "change"], relationships: [], relationshipEnds: [], scale: { items: 12, density: "medium" }
  };
  const p = buildPagePlan({ useCase: { ...page, parts: [page.parts[0], signed] }, ...catalogs });
  const effects = p.sections.find((s) => s.id === "effects");
  assert.equal(effects.representation, "signed-effect-matrix");
  assert.ok(Object.values(effects.marks).every((m) => !m.encoding.colour), "kinds are told apart by label, not the page colour");
  assert.ok(effects.secondary.some((s) => s.id === "legend"));
  assert.match(p.secondary[0].job, /in effects colour shows the value/);
});
