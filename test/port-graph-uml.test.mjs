import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { buildAgentRecommendation } from "../src/agent-recommendation.mjs";
import { route } from "../src/router.mjs";
import { assertContract } from "../src/schema-validation.mjs";

const read = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
const [representationCatalog, representationRelations, heuristics, interactionCatalog, implementationCatalog, interfacePatternCatalog, qualityCatalog, playbookCatalog, compositionCatalog] = await Promise.all([
  read("../catalog/representations.json"), read("../catalog/representation-relations.json"), read("../heuristics/core.json"),
  read("../catalog/interaction-patterns.json"), read("../catalog/implementations.json"), read("../catalog/interface-patterns.json"),
  read("../catalog/quality-methods.json"), read("../catalog/implementation-playbooks.json"), read("../catalog/composition-heuristics.json")
]);
const recommend = (useCase, context = {}) => buildAgentRecommendation({ useCase, representationCatalog, representationRelations, heuristics, interactionCatalog, implementationCatalog, interfacePatternCatalog, qualityCatalog, playbookCatalog, compositionCatalog, context });

// "Show which steps pass which data to which" -- a Zapier/n8n-shaped question.
const dataflowUseCase = {
  id: "automation-dataflow",
  concern: "Show which steps pass which data to which",
  stakeholder: "builder of an automation",
  intent: ["understand", "trace"],
  informationStructure: ["process", "network"],
  tasks: ["trace", "inspect"],
  explanatoryFocus: ["dataflow", "flow"],
  entities: ["step", "port", "payload"],
  relationships: ["passes-payload-to"],
  scale: { items: 12, density: "low" },
  interaction: { mode: "exploratory", dynamics: "interactive" }
};

// "Show the structure of components and their contracts/interfaces".
const componentUseCase = {
  id: "component-contracts",
  concern: "Show the structure of components and their contracts and interfaces",
  stakeholder: "engineer planning a change",
  intent: ["understand", "inspect"],
  informationStructure: ["network", "hierarchy"],
  tasks: ["locate", "inspect"],
  explanatoryFocus: ["structure", "interface"],
  abstractionLevel: "overview",
  entities: ["component", "interface"],
  relationships: ["provides", "requires"],
  scale: { items: 20, density: "low" },
  interaction: { mode: "read-only", dynamics: "static" }
};

test("both use cases are valid use-case contracts (dataflow and interface are accepted focus values)", () => {
  assertContract("use-case", dataflowUseCase);
  assertContract("use-case", componentUseCase);
});

test("a which-step-passes-which-data use case recommends the port graph, laid out by ELK with ports", () => {
  const rec = recommend(dataflowUseCase);
  assert.equal(rec.primary.representation, "port-graph");
  const ranked = route(dataflowUseCase, representationCatalog, heuristics).accepted;
  assert.equal(ranked[0].candidate.id, "port-graph");
  assert.ok(ranked[0].score > ranked[1].score, "port-graph must win outright, not on catalog order");
  assert.ok(ranked.slice(1).some((r) => r.candidate.id === "directed-handoff-flow"), "the lighter handoff flow remains the runner-up alternative");
  assert.equal(rec.primary.implementation.renderer, "react-flow");
  assert.equal(rec.primary.implementation.layout, "elkjs");
});

test("without the dataflow signal, a plain flow question does not get the port graph", () => {
  const plain = { ...dataflowUseCase, id: "plain-flow", explanatoryFocus: ["flow"] };
  assert.notEqual(route(plain, representationCatalog, heuristics).accepted[0].candidate.id, "port-graph");
});

test("a component-contracts use case recommends the UML component view over the layered view", () => {
  const rec = recommend(componentUseCase);
  assert.equal(rec.primary.representation, "uml-component-diagram");
  const ranked = route(componentUseCase, representationCatalog, heuristics).accepted;
  const score = (id) => ranked.find((r) => r.candidate.id === id)?.score ?? Number.NEGATIVE_INFINITY;
  assert.ok(score("uml-component-diagram") > score("layered-architecture-view"));
  assert.ok(score("uml-component-diagram") > score("uml-class-diagram"));
  const text = recommend(componentUseCase, { preferTextSource: true });
  assert.ok(["plantuml", "structurizr"].includes(text.primary.implementation.renderer), `diagrams-as-code route, got ${text.primary.implementation.renderer}`);
});

test("a detailed code-type question gets the UML class diagram", () => {
  const detailed = { ...componentUseCase, id: "code-types", concern: "Show the classes, their operations, and what implements which interface", abstractionLevel: "detailed", entities: ["class", "interface"], relationships: ["implements", "extends"] };
  assert.equal(route(detailed, representationCatalog, heuristics).accepted[0].candidate.id, "uml-class-diagram");
});

test("new representations are related to the views they compete with or complement", () => {
  const pairs = new Set(representationRelations.relations.map((r) => `${r.a}|${r.b}|${r.relationship}`));
  assert.ok(pairs.has("port-graph|directed-handoff-flow|substitute"));
  assert.ok(pairs.has("uml-component-diagram|layered-architecture-view|complement"));
  assert.ok(pairs.has("uml-class-diagram|data-model-diagram|substitute"));
  for (const id of ["rete-js", "plantuml", "structurizr"]) assert.ok(implementationCatalog.implementations.some((i) => i.id === id), `missing implementation ${id}`);
});

test("diagram-earns-its-space exists, is wired as a soft check, and agrees with picture-before-prose", () => {
  const heuristic = compositionCatalog.heuristics.find((h) => h.id === "diagram-earns-its-space");
  assert.ok(heuristic, "heuristic missing");
  assert.equal(heuristic.check, "each-drawing-shows-relations-a-list-cannot-linear-sequences-are-lists");
  assert.match(heuristic.source, /Larkin & Simon/);
  assert.match(heuristic.source, /Tufte/);
  assert.match(heuristic.source, /Brian 2026-10-04/);
  assert.match(heuristic.principle, /numbered list/);
  const method = qualityCatalog.methods.find((m) => m.id === "one-page-composition-quality");
  assert.ok(method.softChecks.includes(heuristic.check), "check not in one-page-composition-quality softChecks");
  const picture = compositionCatalog.heuristics.find((h) => h.id === "picture-before-prose");
  assert.match(picture.principle, /when the picture carries relations or magnitudes/);
  assert.match(picture.principle, /diagram-earns-its-space/);
  const rec = recommend(dataflowUseCase);
  assert.ok(rec.quality.softChecks.includes(heuristic.check), "check does not reach the recommendation's disposition checklist");
});

test("docs/composition.md has a row for the new check", async () => {
  const doc = await readFile(new URL("../docs/composition.md", import.meta.url), "utf8");
  assert.match(doc, /each-drawing-shows-relations-a-list-cannot-linear-sequences-are-lists/);
});
