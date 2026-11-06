// graph-viewer 0.12.0: diamond nodes, a heavy border, and a line style per relation type, so a
// theory diagram can tell claims from categories and relation types apart without colour.
import assert from "node:assert/strict";
import { test } from "node:test";
import { validateTypedGraph, expandHyperedges, edgeLine, LINE_DASH, NODE_SHAPES } from "../graph-viewer/src/model.mjs";

const graph = (extra = {}) => ({
  schema: "typed-graph/v1",
  kinds: { claim: { label: "Claim", shape: "diamond" } },
  nodes: [{ id: "a", label: "A", strong: true }, { id: "p", label: "P1", kind: "claim" }],
  edges: [{ id: "e", source: "p", target: "a", line: "dotted", arrow: false }],
  ...extra,
});

test("diamond kinds, strong nodes and line styles are valid", () => {
  assert.deepEqual(validateTypedGraph(graph()), []);
  assert.deepEqual(NODE_SHAPES, ["box", "diamond"]);
});

test("an unknown shape or line style is named as a problem", () => {
  const g = graph({ nodes: [{ id: "a", label: "A", shape: "star" }, { id: "p", label: "P1" }], edges: [{ id: "e", source: "p", target: "a", line: "wavy" }] });
  const problems = validateTypedGraph(g);
  assert.equal(problems.length, 2, problems.join("; "));
  assert.match(problems.join(" "), /shape star/);
  assert.match(problems.join(" "), /line wavy/);
});

test("each line style draws a distinct dash pattern; dashed and arrowless links still work", () => {
  const dashes = Object.keys(LINE_DASH).map((line) => edgeLine({ line }).dash);
  assert.equal(new Set(dashes).size, Object.keys(LINE_DASH).length, "every style looks different");
  assert.equal(edgeLine({}).dash, undefined, "plain links are solid");
  assert.equal(edgeLine({ dashed: true }).dash, LINE_DASH.dashed, "the old dashed flag keeps its meaning");
  assert.equal(edgeLine({}).arrow, true);
  assert.equal(edgeLine({ arrow: false }).arrow, false);
  assert.equal(edgeLine({ line: "dotted" }).cap, "round");
});

test("a hyperedge hub keeps its shape and heavy border", () => {
  const g = { schema: "typed-graph/v1", nodes: [{ id: "x", label: "X" }], edges: [], hyperedges: [{ id: "h", label: "H", shape: "diamond", strong: true, roles: { about: ["x"] } }] };
  const hub = expandHyperedges(g).nodes.find((n) => n.id === "h");
  assert.equal(hub.shape, "diamond");
  assert.equal(hub.strong, true);
});
