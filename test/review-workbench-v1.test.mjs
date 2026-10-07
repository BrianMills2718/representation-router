import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { renderReviewWorkbenchV1, validateArchitecturePack } from "../src/review-workbench-v1.mjs";

const base = JSON.parse(await readFile(new URL("../review-workbench/pr22.model.json", import.meta.url), "utf8"));
const architecture = JSON.parse(await readFile(new URL("../review-workbench/pr22.architecture-v1.json", import.meta.url), "utf8"));

test("architecture pack validates against review-workbench sources", () => {
  assert.equal(validateArchitecturePack(architecture, base), architecture);
  assert.equal(architecture.component.nodes.length >= 5, true);
  assert.equal(architecture.sequence.messages.length >= 6, true);
  assert.equal(architecture.state.states.length >= 6, true);
});

test("component view keeps router contracts distinct from product authority", () => {
  const owners = Object.fromEntries(architecture.component.nodes.map(node => [node.id, node.owner]));
  assert.equal(owners.viewspec, "Representation Router");
  assert.equal(owners.surfacespec, "Representation Router");
  assert.equal(owners.product, "Consuming product");
  assert.equal(owners.domain, "Consuming system");
  assert.equal(architecture.component.edges.some(edge => edge.from === "surfacespec" && edge.to === "product"), true);
});

test("sequence view separates CI artifact production from human review", () => {
  const participants = new Set(architecture.sequence.participants.map(item => item.id));
  assert.ok(participants.has("ci"));
  assert.ok(participants.has("reviewer"));
  assert.ok(architecture.sequence.messages.some(message => message.from === "ci" && message.to === "reviewer"));
  assert.ok(architecture.sequence.messages.some(message => /does not mean the reviewer accepts/i.test(message.note)));
});

test("state view cannot equate machine verification with human acceptance", () => {
  assert.equal(architecture.state.transitions.some(t => t.from === "verified" && t.to === "accepted"), false);
  assert.ok(architecture.state.transitions.some(t => t.from === "merged" && t.to === "human-review"));
  assert.ok(architecture.state.transitions.some(t => t.from === "human-review" && t.to === "accepted" && t.authority === "human reviewer"));
  assert.match(architecture.state.nonclaim, /no transition from Machine verified directly to Accepted/i);
});

test("v1 renders actual component, sequence, and state diagrams in one self-contained page", () => {
  const html = renderReviewWorkbenchV1(base, architecture);
  for (const token of [
    'data-tab="component"',
    'data-tab="sequence"',
    'data-tab="state"',
    'UML-style component view',
    'Sequence view',
    'State / gate view',
    '<svg class="diagram"',
    '<svg class="diagram sequence"',
    'Shared inspector',
    'Machine verified',
    'Human review'
  ]) assert.ok(html.includes(token), token);
  assert.equal(/<script[^>]+src=/.test(html), false);
  assert.equal(/<script[^>]+src=["']https?:/.test(html), false);
  assert.ok(html.includes('@media(max-width:980px)'));
  assert.ok(html.includes('overflow:auto'));
});

test("diagram elements remain linked to exact provenance sources", () => {
  const sourceIds = new Set(base.sources.map(source => source.id));
  for (const item of [
    ...architecture.component.nodes,
    ...architecture.sequence.participants,
    ...architecture.sequence.messages,
    ...architecture.state.states
  ]) {
    assert.ok(Array.isArray(item.sourceIds) && item.sourceIds.length > 0, item.id);
    for (const sourceId of item.sourceIds) assert.ok(sourceIds.has(sourceId), `${item.id}:${sourceId}`);
  }
});
