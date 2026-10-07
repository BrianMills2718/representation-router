import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { route } from "../src/router.mjs";

const readJson = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
const catalog = await readJson("../catalog/representations.json");
const heuristics = await readJson("../heuristics/core.json");
const relations = await readJson("../catalog/representation-relations.json");

test("requirements verification exposes a real complement/projection mismatch", async () => {
  const useCase = await readJson("../examples/requirements-verification.json");
  const result = route(useCase, catalog, heuristics, { limit: catalog.length });

  assert.equal(result.accepted[0].candidate.id, "requirements-traceability-matrix");

  const graph = result.rejected.find((entry) => entry.candidate.id === "node-link-graph");
  assert.ok(graph, "the full 1200-item node-link projection must remain rejected");
  assert.ok(
    graph.rejectedBecause.some((reason) => reason.includes("exceeds 300 items")),
    "the rejection must remain a scale/projection constraint, not semantic unavailability"
  );

  const relation = relations.relations.find((entry) =>
    entry.relationship === "complement" &&
    [entry.a, entry.b].includes("requirements-traceability-matrix") &&
    [entry.a, entry.b].includes("node-link-graph")
  );
  assert.ok(relation, "the reviewed matrix/graph complement relation must remain explicit");
});

test("a zero score margin is ambiguity, not evidence that RR should abstain", async () => {
  const useCase = await readJson("../examples/portfolio-qualitative-analysis.json");
  const result = route(useCase, catalog, heuristics, { limit: catalog.length });

  assert.equal(result.accepted[0].candidate.id, "staged-explanatory-machine");
  assert.equal(result.accepted[1].candidate.id, "scroll-linked-explainer");
  assert.equal(result.accepted[0].score, result.accepted[1].score);
  assert.ok(result.accepted[0].score > 0);

  // The scoring model is ordinal/explanatory, not calibrated probability.
  // A tie between two plausible survivors must not become an arbitrary
  // "confidence below threshold => no representation" rule.
});
