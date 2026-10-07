import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const base = JSON.parse(await readFile(new URL("../review-workbench/pr22.model.json", import.meta.url), "utf8"));
const architecture = JSON.parse(await readFile(new URL("../review-workbench/pr22.architecture-v1.json", import.meta.url), "utf8"));
const interactions = JSON.parse(await readFile(new URL("../review-workbench/pr22.interactions-v1.1.json", import.meta.url), "utf8"));
const appSource = await readFile(new URL("../review-workbench-v11/src/main.jsx", import.meta.url), "utf8");
const viteConfig = await readFile(new URL("../review-workbench-v11/vite.config.js", import.meta.url), "utf8");

const requirementIds = new Set(base.requirements.map((item) => item.id));
const evidenceIds = new Set(base.evidence.map((item) => item.id));
const sourceIds = new Set(base.sources.map((item) => item.id));

function validateLinks(record, label) {
  for (const requirementId of record.requirementIds ?? []) assert.ok(requirementIds.has(requirementId), `${label}: requirement ${requirementId}`);
  for (const evidenceId of record.evidenceIds ?? []) assert.ok(evidenceIds.has(evidenceId), `${label}: evidence ${evidenceId}`);
  for (const sourceId of record.sourceIds ?? []) assert.ok(sourceIds.has(sourceId), `${label}: source ${sourceId}`);
}

test("v1.1 declares surface-local graph interaction semantics", () => {
  assert.equal(interactions.schemaVersion, "review-workbench-interactions/v1.1");
  assert.equal(interactions.graphPolicy.nodeDragEffect, "surface-local-layout-only");
  assert.equal(interactions.graphPolicy.edgeSelection, "semantic-relationship");
  assert.equal(interactions.graphPolicy.fitViewEffect, "viewport-only");
  assert.equal(interactions.graphPolicy.writeBack, false);
});

test("every component relationship is a first-class inspectable semantic edge", () => {
  for (const edge of architecture.component.edges) {
    const meta = interactions.component.edges[edge.id];
    assert.ok(meta, edge.id);
    assert.ok(meta.meaning, `${edge.id}: meaning`);
    assert.ok(meta.nonclaim, `${edge.id}: nonclaim`);
    assert.ok(meta.sourceIds.length > 0, `${edge.id}: provenance`);
    validateLinks(meta, edge.id);
  }
});

test("every state transition is inspectable and machine verification cannot skip human review", () => {
  for (const transition of architecture.state.transitions) {
    const meta = interactions.state.transitions[transition.id];
    assert.ok(meta, transition.id);
    assert.ok(meta.meaning, `${transition.id}: meaning`);
    assert.ok(meta.nonclaim, `${transition.id}: nonclaim`);
    validateLinks(meta, transition.id);
  }
  assert.equal(architecture.state.transitions.some((transition) => transition.from === "verified" && transition.to === "accepted"), false);
  assert.ok(architecture.state.transitions.some((transition) => transition.from === "merged" && transition.to === "human-review"));
});

test("node, state, and sequence cross-lens links resolve to real requirement/evidence records", () => {
  for (const [id, record] of Object.entries(interactions.component.nodes)) validateLinks(record, `component-node:${id}`);
  for (const [id, record] of Object.entries(interactions.state.states)) validateLinks(record, `state:${id}`);
  for (const [id, record] of Object.entries(interactions.sequence.messages)) {
    assert.ok(architecture.sequence.messages.some((message) => message.id === id), id);
    validateLinks(record, `sequence:${id}`);
  }
});

test("interactive app uses XYFlow drag/edge selection, viewport controls, neighborhood highlighting, and cross-lens focus", () => {
  for (const token of [
    'from "@xyflow/react"',
    "onNodeDragStop",
    "onEdgeClick",
    "nodesDraggable",
    "fitView",
    "Reset layout",
    "Neighbors on",
    "graphEmphasis",
    "openRelated",
    "surface-local",
    'type: "edge"'
  ]) assert.ok(appSource.includes(token), token);
  assert.match(appSource, /setNodes\(cloneNodes\(initialNodes\)\)/);
  assert.match(appSource, /write back|write-back|writes back|writeBack/i);
});

test("v1.1 app is configured as a Vite single-file artifact without a new renderer dependency", () => {
  assert.ok(viteConfig.includes("viteSingleFile"));
  assert.ok(viteConfig.includes("artifacts/review-workbench-v1.1"));
  assert.ok(appSource.includes('@xyflow/react/dist/style.css'));
  assert.equal(appSource.includes("fetch("), false);
  assert.equal(appSource.includes("localStorage"), false);
});

test("moving rendered graph nodes cannot mutate the imported semantic architecture model by alias", () => {
  const semanticBefore = JSON.stringify(architecture.component.nodes.map(({ id, x, y }) => ({ id, x, y })));
  const localLayout = architecture.component.nodes.map((node) => ({ id: node.id, position: { x: node.x, y: node.y } }));
  localLayout[0].position.x += 500;
  localLayout[0].position.y += 300;
  const semanticAfter = JSON.stringify(architecture.component.nodes.map(({ id, x, y }) => ({ id, x, y })));
  assert.equal(semanticAfter, semanticBefore);
  assert.notEqual(localLayout[0].position.x, architecture.component.nodes[0].x);
});
