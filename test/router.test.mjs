import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { buildViewSpec, route } from "../src/router.mjs";

const readJson = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
const catalog = await readJson("../catalog/representations.json");
const heuristics = await readJson("../heuristics/core.json");

async function routeExample(name) {
  const useCase = await readJson(`../examples/${name}.json`);
  return { useCase, result: route(useCase, catalog, heuristics) };
}

test("requirements verification prefers a traceability matrix", async () => {
  const { result } = await routeExample("requirements-verification");
  assert.equal(result.accepted[0].candidate.id, "requirements-traceability-matrix");
});

test("failure propagation prefers a node-link graph at modest scale", async () => {
  const { result } = await routeExample("failure-propagation");
  assert.equal(result.accepted[0].candidate.id, "node-link-graph");
});

test("startup behavior prefers a sequence diagram", async () => {
  const { result } = await routeExample("startup-sequence");
  assert.equal(result.accepted[0].candidate.id, "sequence-diagram");
});

test("very large unaggregated networks reject node-link hairballs", async () => {
  const { result } = await routeExample("large-dependency-network");
  const nodeLink = result.rejected.find((entry) => entry.candidate.id === "node-link-graph");
  assert.ok(nodeLink, "node-link graph should be hard-rejected at 20k items without aggregation");
  assert.notEqual(result.accepted[0].candidate.id, "node-link-graph");
});

test("allowAggregation does not rescue a representation that cannot aggregate", async () => {
  const { useCase } = await routeExample("failure-propagation");
  const result = route({
    ...useCase,
    scale: { ...useCase.scale, items: 301 },
    constraints: { ...useCase.constraints, allowAggregation: true }
  }, catalog, heuristics);
  const nodeLink = result.rejected.find((entry) => entry.candidate.id === "node-link-graph");
  assert.ok(nodeLink, "node-link graph should still be rejected when it exceeds its limit and lacks aggregation support");
  assert.ok(nodeLink.rejectedBecause.some((reason) => reason.includes("candidate does not support aggregation")));
});

test("ViewSpec preserves concern, projection, interaction, and provenance", async () => {
  const { useCase, result } = await routeExample("failure-propagation");
  const spec = buildViewSpec(useCase, result.accepted[0]);
  assert.equal(spec.concern, useCase.concern);
  assert.deepEqual(spec.projection.entities, useCase.entities);
  assert.equal(spec.representation.pattern, "node-link-graph");
  assert.equal(spec.provenance.linkVisualMarksToModel, true);
  assert.ok(spec.interactions.some((interaction) => interaction.effect === "highlight related path"));
});

test("ViewSpec emits aggregation only when the selected representation supports it", async () => {
  const { useCase } = await routeExample("failure-propagation");
  const adjacencyMatrix = catalog.find((candidate) => candidate.id === "adjacency-matrix");
  const nodeLink = catalog.find((candidate) => candidate.id === "node-link-graph");

  const aggregatingSpec = buildViewSpec({
    ...useCase,
    scale: { ...useCase.scale, items: adjacencyMatrix.maxItemsWithoutAggregation + 1 },
    constraints: { ...useCase.constraints, allowAggregation: true }
  }, { candidate: adjacencyMatrix, rejected: false, reasons: [] });
  assert.ok(aggregatingSpec.projection.operations.includes("aggregate"));

  const unsupportedSpec = buildViewSpec({
    ...useCase,
    scale: { ...useCase.scale, items: nodeLink.maxItemsWithoutAggregation + 1 },
    constraints: { ...useCase.constraints, allowAggregation: true }
  }, { candidate: nodeLink, rejected: false, reasons: [] });
  assert.ok(!unsupportedSpec.projection.operations.includes("aggregate"));
});

const expectedRoutes = [
  ["architecture-communication", "layered-architecture-view"],
  ["state-lifecycle", "state-machine-view"],
  ["comparative-variants", "small-multiples"],
  ["evidence-review", "master-detail"],
  ["policy-simulation", "explorable-simulation"],
  ["portfolio-qualitative-analysis", "staged-explanatory-machine"],
  ["portfolio-digimon", "staged-explanatory-machine"],
  ["portfolio-cybernetic-influence", "explorable-simulation"],
  ["portfolio-collective-competence", "explorable-simulation"],
  ["portfolio-agent-ontology", "staged-explanatory-machine"],
  ["portfolio-agent-control-plane", "staged-explanatory-machine"],
  ["multi-stage-method-explanation", "staged-explanatory-machine"],
  ["numogram-concept-explainer", "scroll-linked-explainer"],
  ["prebiological-crusoe-learning", "scroll-linked-explainer"]
];

for (const [example, expected] of expectedRoutes) {
  test(`${example} routes to ${expected}`, async () => {
    const { result } = await routeExample(example);
    assert.equal(result.accepted[0].candidate.id, expected);
  });
}

test("branching workflow can route to a first-class process representation", () => {
  const useCase = {
    id: "branching-process", concern: "Understand participant workflow with gateways and exceptions", stakeholder: "analyst",
    intent: ["understand", "trace"], informationStructure: ["process"], tasks: ["trace", "inspect"],
    interaction: { mode: "exploratory", dynamics: "interactive" }, scale: { items: 80, density: "low" },
    requiredCapabilities: ["gateways", "exceptions"], constraints: { provenance: true, allowAggregation: false }, entities: [], relationships: []
  };
  const result = route(useCase, catalog, heuristics);
  assert.equal(result.accepted[0].candidate.id, "bpmn-process");
});

test("large schema lookup can route to schema explorer", () => {
  const useCase = {
    id: "large-schema", concern: "Find and inspect logical records", stakeholder: "analyst",
    intent: ["inspect", "navigate"], informationStructure: ["table", "hierarchy", "network"], tasks: ["lookup", "filter", "inspect"],
    interaction: { mode: "exploratory", dynamics: "interactive" }, scale: { items: 4000, density: "high" },
    requiredCapabilities: ["search", "progressive-disclosure"], constraints: { provenance: true, allowAggregation: true }, entities: [], relationships: []
  };
  const result = route(useCase, catalog, heuristics);
  assert.equal(result.accepted[0].candidate.id, "schema-explorer");
});

test("learning use case preserves audience, learning contract, and success criteria in ViewSpec", async () => {
  const { useCase, result } = await routeExample("prebiological-crusoe-learning");
  const spec = buildViewSpec(useCase, result.accepted[0]);
  assert.equal(spec.viewpoint.audience.notationFamiliarity, "novice");
  assert.equal(spec.viewpoint.learning.entryMode, "guided");
  assert.ok(spec.viewpoint.learning.outcomes.includes("fluency"));
  assert.equal(spec.successCriteria.length, 4);
  assert.ok(result.accepted[0].reasons.some((reason) => reason.startsWith("learning outcomes:")));
});

test("portfolio ViewSpec preserves explanatory focus and repeated-surface context", async () => {
  const { useCase, result } = await routeExample("portfolio-agent-control-plane");
  const spec = buildViewSpec(useCase, result.accepted[0]);
  assert.deepEqual(spec.viewpoint.explanatoryFocus, ["transformation", "flow"]);
  assert.equal(spec.surfaceContext.repeatedCollection, true);
  assert.equal(spec.surfaceContext.neighboringRepresentations, "heterogeneous");
  assert.equal(spec.surfaceContext.sharedInteractionGrammar, true);
  assert.equal(spec.representationContext.role, "explanatory");
  assert.equal(spec.representationContext.abstractionLevel, "caricature");
  assert.equal(spec.representationContext.concernHierarchy.assuranceRole, "secondary");
});

test("the same network routes differently when explanatory focus changes", () => {
  const base = {
    stakeholder: "new technical reviewer",
    intent: ["understand", "communicate"],
    informationStructure: ["network"],
    tasks: ["trace", "inspect"],
    interaction: { mode: "exploratory", dynamics: "animated" },
    scale: { items: 120, density: "medium" },
    constraints: { provenance: true, allowAggregation: true },
    entities: ["project", "capability", "task"], relationships: ["depends-on", "routes-to"]
  };
  const structure = route({ ...base, id: "network-structure", concern: "Show how the ecosystem is structured", explanatoryFocus: ["structure"], representationRole: "analytic", abstractionLevel: "overview" }, catalog, heuristics);
  const transformation = route({ ...base, id: "network-transformation", concern: "Show how one task finds context and becomes coordinated work", explanatoryFocus: ["transformation", "flow"], representationRole: "explanatory", abstractionLevel: "caricature" }, catalog, heuristics);
  assert.equal(structure.accepted[0].candidate.id, "node-link-graph");
  assert.equal(transformation.accepted[0].candidate.id, "staged-explanatory-machine");
});

test("assurance can become the primary story when the stakeholder concern changes", () => {
  const useCase = {
    id: "verification-primary",
    concern: "Audit which findings are supported and which controls failed",
    stakeholder: "reviewer responsible for verification",
    intent: ["inspect", "trace", "decide"],
    informationStructure: ["table", "matrix", "network"],
    tasks: ["lookup", "filter", "trace", "inspect"],
    explanatoryFocus: ["provenance", "comparison"],
    representationRole: "audit",
    abstractionLevel: "detailed",
    concernHierarchy: { primary: "verification and evidence sufficiency", secondary: ["underlying workflow"], assuranceRole: "primary" },
    interaction: { mode: "exploratory", dynamics: "interactive" },
    scale: { items: 400, density: "medium" },
    constraints: { provenance: true, allowAggregation: true },
    entities: ["finding", "evidence", "control"], relationships: ["supported-by", "checked-by"]
  };
  const result = route(useCase, catalog, heuristics);
  assert.notEqual(result.accepted[0].candidate.id, "staged-explanatory-machine");
  assert.ok(["requirements-traceability-matrix", "data-table", "composite-linked-view", "adjacency-matrix"].includes(result.accepted[0].candidate.id));
});

test("unavailable semantic views are rejected before representation ranking", () => {
  const useCase = {
    id: "missing-hierarchy", concern: "Navigate a hierarchy that is not represented", stakeholder: "analyst",
    intent: ["navigate"], informationStructure: ["hierarchy"], tasks: ["inspect"],
    interaction: { mode: "exploratory", dynamics: "interactive" }, scale: { items: 20, density: "low" },
    constraints: { provenance: true, allowAggregation: false },
    semanticAvailability: { status: "unavailable", present: ["entities"], missing: ["parent-child relationships"], note: "Inventory exists but hierarchy semantics do not." }
  };
  const result = route(useCase, catalog, heuristics);
  assert.equal(result.accepted.length, 0);
  assert.ok(result.rejected.every((entry) => entry.rejectedBecause.some((reason) => reason.includes("semantic view unavailable"))));
});

test("partial semantic availability is preserved in the ViewSpec", () => {
  const useCase = {
    id: "partial-process", concern: "Trace the represented process while keeping missing ownership explicit", stakeholder: "analyst",
    intent: ["understand", "trace"], informationStructure: ["process"], tasks: ["trace", "inspect"],
    interaction: { mode: "exploratory", dynamics: "interactive" }, scale: { items: 12, density: "low" },
    constraints: { provenance: true, allowAggregation: false },
    semanticAvailability: { status: "partial", present: ["activities", "sequence"], missing: ["accountable owner"], note: "One ownership assertion is explicitly missing." }
  };
  const result = route(useCase, catalog, heuristics);
  assert.ok(result.accepted.length > 0);
  const spec = buildViewSpec(useCase, result.accepted[0]);
  assert.equal(spec.availability.status, "partial");
  assert.deepEqual(spec.availability.missing, ["accountable owner"]);
  assert.ok(spec.rationale.some((reason) => reason.includes("semantic availability: partial")));
});

test("buildViewSpec does not aggregate a candidate that declares no item limit", async () => {
  const { useCase } = await routeExample("failure-propagation");
  const adjacencyMatrix = catalog.find((candidate) => candidate.id === "adjacency-matrix");
  const { maxItemsWithoutAggregation, ...unlimited } = adjacencyMatrix;
  const spec = buildViewSpec({
    ...useCase,
    scale: { ...useCase.scale, items: 10 },
    constraints: { ...useCase.constraints, allowAggregation: true }
  }, { candidate: { ...unlimited, maxItemsWithoutAggregation: null }, rejected: false, reasons: [] });
  assert.ok(!spec.projection.operations.includes("aggregate"));
});
