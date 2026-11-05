import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { buildCompositionPlan, compositionTags } from "../src/composition-plan.mjs";

const readJson = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
const catalog = await readJson("../catalog/composition-heuristics.json");
const representations = await readJson("../catalog/representations.json");
const rep = (id) => representations.find((item) => item.id === id);
const base = {
  concern: "Which parts fail together?", informationStructure: ["network"], intent: ["inspect"], tasks: ["inspect", "trace"],
  entities: ["component", "failure-mode"], relationships: ["depends-on", "failure-propagates-to"], interaction: { mode: "exploratory", dynamics: "interactive" }
};
const plan = (useCase, id) => buildCompositionPlan({ useCase, selectedRepresentation: id, representation: rep(id), catalog });

test("marks, links and groups follow the chosen view's grammar, not one sentence per entity kind", () => {
  const graph = plan(base, "node-link-graph");
  const matrix = plan(base, "adjacency-matrix");
  assert.equal(graph.primary.form, "node-link");
  assert.equal(matrix.primary.form, "matrix");
  assert.deepEqual([graph.marks.component.role, graph.marks["failure-mode"].role], ["node", "node"]);
  assert.deepEqual([matrix.marks.component.role, matrix.marks["failure-mode"].role], ["row", "column"]);
  assert.notEqual(graph.marks.component.encoding.colour, graph.marks["failure-mode"].encoding.colour, "two drawn kinds get two colours");
  assert.ok(["blue", "orange", "grey"].includes(graph.marks.component.encoding.colour), "colours a red-green colourblind reader can tell apart");
  assert.deepEqual(graph.groups, [], "a graph tells kinds apart by mark, not by enclosing each kind in a region");
  const swimlane = plan({ ...base, informationStructure: ["process"], entities: ["team", "task"] }, "process-swimlane");
  assert.deepEqual(swimlane.groups.map((group) => group.id), ["team"], "lanes are the one enclosure a swimlane has");
  assert.equal(swimlane.marks.task.role, "step box inside its lane");
});

test("reveal-on-click lists each kind's own links when relationshipEnds says what joins what, and names the gap when it does not", () => {
  const without = plan(base, "node-link-graph");
  assert.ok(without.designGaps.some((gap) => gap.includes("relationshipEnds")));
  const withEnds = plan({ ...base, relationshipEnds: [
    { relationship: "depends-on", from: "component", to: "component" },
    { relationship: "failure-propagates-to", from: "failure-mode", to: "component" }
  ] }, "node-link-graph");
  assert.ok(!withEnds.designGaps.some((gap) => gap.includes("relationshipEnds")));
  assert.equal(withEnds.revealOnClick["failure-mode"][0], "its links: failure-propagates-to -> component");
  assert.notDeepEqual(withEnds.revealOnClick.component, withEnds.revealOnClick["failure-mode"]);
  assert.deepEqual(withEnds.links[1], { relationship: "failure-propagates-to", drawnAs: withEnds.links[1].drawnAs, from: "failure-mode", to: "component" });
});

test("reveal content follows the reader's tasks, and too many kinds is reported instead of handed more channels", () => {
  const lookup = plan({ ...base, tasks: ["lookup"] }, "node-link-graph");
  assert.ok(!lookup.revealOnClick.component.some((line) => line.includes("next step")), "no tracing offered when the reader does not trace");
  const many = Array.from({ length: 12 }, (_, i) => `kind-${i}`);
  const crowded = plan({ ...base, entities: many }, "node-link-graph");
  assert.ok(crowded.designGaps.some((gap) => gap.startsWith("12 object kinds")));
  assert.equal(crowded.marks["kind-11"].encoding.tellApartBy, "label only");
});

test("an interactive page without dated structure gets no time strip", () => {
  assert.ok(!compositionTags(base).has("over-time"));
  assert.ok(compositionTags({ ...base, informationStructure: ["timeline"] }).has("over-time"));
  assert.ok(!plan(base, "node-link-graph").secondary.some((item) => item.id === "time-strip"));
});

test("the page title is the use case's short title; a long concern without one is a named gap, and the full question stays", () => {
  const long = { ...base, concern: "Which parts of the payment system fail together when the ledger service slows down under end-of-month load?" };
  const untitled = plan(long, "node-link-graph");
  assert.equal(untitled.title, null);
  assert.equal(untitled.question, long.concern);
  assert.ok(untitled.designGaps.some((gap) => gap.startsWith("No short title")));
  const titled = plan({ ...long, title: "Payment parts that fail together" }, "node-link-graph");
  assert.equal(titled.title, "Payment parts that fail together");
  assert.equal(titled.question, long.concern);
  assert.ok(!titled.designGaps.some((gap) => gap.startsWith("No short title")));
  assert.ok(!plan(base, "node-link-graph").designGaps.some((gap) => gap.startsWith("No short title")), "a short concern can head the page itself");
});
