// graph-viewer 0.13.0 arc layout: a small network read whole on a phone. Main nodes in one column
// ordered to keep linked nodes close, links as nested arcs on the left, side nodes on the right.
import assert from "node:assert/strict";
import { test } from "node:test";
import { arcOrder, arcLevels, arcLayout } from "../graph-viewer/src/model.mjs";

// The qc theory of 2026-11-05: four categories, six relations, four propositions, a core process.
const theory = {
  schema: "typed-graph/v1",
  kinds: { prop: { label: "Proposition", shape: "diamond", side: true } },
  nodes: [
    { id: "core", label: "Core" },
    ...[1, 2, 3, 4].map((i) => ({ id: `c${i}`, label: `C${i}` })),
    ...[1, 2, 3, 4].map((i) => ({ id: `p${i}`, label: `P${i}`, kind: "prop" })),
  ],
  edges: [
    ["c1", "c2"], ["c2", "c1"], ["c3", "c2"], ["c3", "c4"], ["c4", "c2"], ["c4", "c1"],
  ].map(([s, t], i) => ({ id: `r${i}`, source: s, target: t, label: "x" })).concat(
    [["p1", "c1"], ["p1", "c2"], ["p2", "c2"], ["p2", "c3"], ["p3", "c1"], ["p3", "c2"], ["p3", "c4"], ["p4", "c3"], ["p4", "c4"]]
      .map(([s, t]) => ({ id: `${s}-${t}`, source: s, target: t, line: "dotted", arrow: false }))),
};
const sizes = Object.fromEntries(theory.nodes.map((n) => [n.id, n.kind ? { width: 90, height: 56 } : { width: 170, height: 60 }]));

test("linked nodes are ordered close together; unlinked ones stay first", () => {
  const main = ["core", "c1", "c2", "c3", "c4"];
  const order = arcOrder(main, theory.edges.filter((e) => e.id.startsWith("r")));
  assert.equal(order[0], "core");
  const at = new Map(order.map((id, i) => [id, i]));
  const span = theory.edges.filter((e) => e.id.startsWith("r")).reduce((t, e) => t + Math.abs(at.get(e.source) - at.get(e.target)), 0);
  assert.equal(span, 8, "the best of the 24 orders spans 8 rows in total");
});

test("arcs nest: an arc that overlaps another sits outside it; arcs meeting at one row may share a level", () => {
  const level = arcLevels([{ id: "a", a: 0, b: 1 }, { id: "b", a: 1, b: 2 }, { id: "c", a: 0, b: 2 }, { id: "d", a: 1, b: 2 }]);
  assert.equal(level.a, 0);
  assert.equal(level.b, 0, "meets a only at row 1");
  assert.equal(level.d, 1, "same rows as b, so outside it");
  assert.equal(level.c, 2, "spans a, b and d");
});

test("the theory fits one phone column: no overlapping boxes, every link routed, words along the arcs", () => {
  const out = arcLayout(theory, sizes);
  assert.ok(out.width <= 400, `drawing is ${out.width}px wide`);
  const boxes = out.children;
  for (const p of boxes) for (const q of boxes) if (p.id < q.id)
    assert.ok(p.x + p.width <= q.x || q.x + q.width <= p.x || p.y + p.height <= q.y || q.y + q.height <= p.y, `${p.id} overlaps ${q.id}`);
  assert.deepEqual(Object.keys(out.routes).sort(), theory.edges.map((e) => e.id).sort());
  for (const e of theory.edges.filter((x) => x.id.startsWith("r"))) assert.equal(out.labelAt[e.id].rotate, -90);
  const mainX = new Set(boxes.filter((b) => b.id.startsWith("c") || b.id === "core").map((b) => b.x));
  assert.equal(mainX.size, 1, "main nodes share one column");
  const sideLeft = Math.min(...boxes.filter((b) => b.id.startsWith("p")).map((b) => b.x));
  assert.ok(sideLeft > Math.max(...boxes.filter((b) => b.id.startsWith("c")).map((b) => b.x + b.width)), "propositions stand to the right");
});

test("words on neighbouring arcs slide along their arcs until they no longer overlap", () => {
  const labelled = { ...theory, edges: theory.edges.map((e) => (e.id.startsWith("r") ? { ...e, label: "− influences" } : e)) };
  const out = arcLayout(labelled, sizes);
  const words = theory.edges.filter((e) => e.id.startsWith("r")).map((e) => out.labelAt[e.id]);
  const len = 12 * 6.4 + 12;
  let clashes = 0;
  for (let i = 0; i < words.length; i++) for (let j = i + 1; j < words.length; j++)
    if (Math.abs(words[i].x - words[j].x) < 20 && Math.abs(words[i].y - words[j].y) < len) clashes += 1;
  assert.equal(clashes, 0);
  for (const e of theory.edges.filter((x) => x.id.startsWith("r"))) {
    const r = out.routes[e.id], w = out.labelAt[e.id];
    assert.ok(w.y >= Math.min(r[1].y, r[2].y) && w.y <= Math.max(r[1].y, r[2].y), `${e.id} word stays on its arc`);
  }
});
