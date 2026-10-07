// typed-graph/v1 hyperedges: a fact joining several things in named roles is drawn as one hub with
// role-labelled spokes, never split into pairs (heuristic keep-n-ary-relations-whole; plan
// agentic-engineering-system-canonical proposals/hypergraph-views, H2). Pure model code: no DOM, no ELK.
import assert from "node:assert/strict";
import { test } from "node:test";
import { validateTypedGraph, expandHyperedges, relatedTo, layoutCandidates, toElkGraph, forceLayout } from "../graph-viewer/src/model.mjs";

const base = {
  schema: "typed-graph/v1",
  nodes: [
    { id: "perry", label: "USS Matthew Perry", kind: "Platform" },
    { id: "shiloh", label: "USS Shiloh", kind: "Platform" },
    { id: "pallets", label: "HADR pallets", kind: "Resource" },
    { id: "hachinohe", label: "Hachinohe", kind: "Location" },
  ],
  edges: [],
};
const transfer = { id: "fact-transfer", label: "transfer", roles: { giver: ["perry"], receiver: ["shiloh"], cargo: ["pallets"], place: ["hachinohe"] } };

test("a graph without hyperedges is unchanged and still valid", () => {
  assert.deepEqual(validateTypedGraph(base), []);
  assert.equal(expandHyperedges(base), base);
});

test("a four-role fact becomes one hub with four role-labelled spokes", () => {
  const g = { ...base, hyperedges: [transfer] };
  assert.deepEqual(validateTypedGraph(g), []);
  const out = expandHyperedges(g);
  assert.equal(out.hyperedges, undefined, "expanded graphs carry plain nodes and edges only");
  const hubs = out.nodes.filter((n) => n.hub);
  assert.deepEqual(hubs.map((n) => [n.id, n.label]), [["fact-transfer", "transfer"]]);
  const spokes = out.edges.filter((e) => e.source === "fact-transfer");
  assert.deepEqual(spokes.map((e) => [e.target, e.label]).sort(), [["hachinohe", "place"], ["pallets", "cargo"], ["perry", "giver"], ["shiloh", "receiver"]]);
  assert.deepEqual(validateTypedGraph(out), [], "the expansion is itself a valid typed graph");
});

test("facts sharing a participant connect through it instead of falling apart", () => {
  const clearance = { id: "fact-clearance", label: "harbor clearance", roles: { place: ["hachinohe"] } };
  const out = expandHyperedges({ ...base, hyperedges: [transfer, clearance] });
  const near = relatedTo(out, "hachinohe");
  assert.ok(near.has("fact-transfer") && near.has("fact-clearance"), "both facts reach Hachinohe");
});

test("invalid hyperedges are refused with a reason", () => {
  const problems = (h) => validateTypedGraph({ ...base, hyperedges: h });
  assert.match(problems("x").join(), /hyperedges must be an array/);
  assert.match(problems([{ id: "f", label: "x", roles: {} }]).join(), /at least one role/);
  assert.match(problems([{ id: "f", label: "x", roles: { giver: ["ghost"] } }]).join(), /ghost, which is not a node/);
  assert.match(problems([{ id: "perry", label: "x", roles: { giver: ["shiloh"] } }]).join(), /already used/);
  assert.match(problems([{ id: "f", label: "x", roles: { giver: [] } }]).join(), /needs a list of node ids/);
});

test("layout.algorithm force lays out every node without overlaps, deterministically; default stays ELK layered", () => {
  const g = expandHyperedges({ ...base, hyperedges: [transfer], layout: { algorithm: "force" } });
  assert.deepEqual(validateTypedGraph(g), []);
  const sizes = Object.fromEntries(g.nodes.map((n) => [n.id, { width: 140, height: n.hub ? 30 : 46 }]));
  const a = forceLayout(g, sizes), b = forceLayout(g, sizes);
  assert.deepEqual(a, b, "same input, same drawing");
  assert.deepEqual(a.children.map((c) => c.id).sort(), g.nodes.map((n) => n.id).sort());
  for (let i = 0; i < a.children.length; i++) for (let j = i + 1; j < a.children.length; j++) {
    const p = a.children[i], q = a.children[j];
    const overlap = p.x < q.x + q.width && q.x < p.x + p.width && p.y < q.y + q.height && q.y < p.y + p.height;
    assert.ok(!overlap, `${p.id} overlaps ${q.id}`);
  }
  assert.ok(a.children.every((c) => c.x >= 0 && c.y >= 0 && c.x + c.width <= a.width && c.y + c.height <= a.height));
  assert.equal(toElkGraph(base, {}).layoutOptions["elk.algorithm"], "layered");
  assert.equal(layoutCandidates(base).length, 3);
});
