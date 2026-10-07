import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import ELK from "elkjs/lib/elk.bundled.js";
import { validateTypedGraph, toElkGraph, positionsFromElk, routesFromElk, labelsFromElk, routePath, layoutCandidates, fitScale, pickLayout, bendCount, litSet, SCHEMA } from "../graph-viewer/src/model.mjs";

const graph = {
  schema: SCHEMA,
  kinds: { System: { label: "System", color: "#8dae98" }, Activity: { label: "Activity", dashed: true } },
  nodes: [
    { id: "a", label: "SIPRNET", kind: "System" },
    { id: "b", label: "Hold classified data", kind: "Activity" },
    { id: "c", label: "Radiant Mercury", kind: "System" },
  ],
  edges: [
    { id: "e1", source: "a", target: "b", label: "performs" },
    { id: "e2", source: "c", target: "b", label: "supports", dashed: true },
  ],
};

test("a valid typed graph has no problems; broken ones say exactly what is wrong", () => {
  assert.deepEqual(validateTypedGraph(graph), []);
  assert.match(validateTypedGraph({ ...graph, schema: "x" }).join(), /schema must be "typed-graph\/v1"/);
  assert.match(validateTypedGraph({ ...graph, edges: [{ id: "e", source: "a", target: "zz" }] }).join(), /target zz is not a node/);
  assert.match(validateTypedGraph({ ...graph, nodes: [...graph.nodes, { id: "a", label: "dup" }] }).join(), /duplicate node id a/);
});

test("ELK lays out measured sizes, returns positions for every node and a route for every edge", async () => {
  const sizes = { a: { width: 120, height: 44 }, b: { width: 220, height: 60 }, c: { width: 160, height: 44 } };
  const request = toElkGraph(graph, sizes, { aspectRatio: 1.5 });
  assert.equal(request.children.find((n) => n.id === "b").width, 220, "real measured width is used");
  assert.equal(request.layoutOptions["elk.layered.wrapping.strategy"], "MULTI_EDGE");
  const layout = await new ELK().layout(request);
  const pos = positionsFromElk(layout);
  assert.deepEqual(Object.keys(pos).sort(), ["a", "b", "c"]);
  const routes = routesFromElk(layout);
  assert.deepEqual(Object.keys(routes).sort(), ["e1", "e2"]);
  for (const points of Object.values(routes)) assert.ok(points.length >= 2);
});

test("ELK reserves room for edge labels: no label overlaps a box or another label", async () => {
  // Two opposite links between the same pair of boxes: the case where midpoint labels collided.
  const pair = { schema: SCHEMA, nodes: [{ id: "act", label: "Activity" }, { id: "res", label: "Resource" }],
    edges: [{ id: "p", source: "act", target: "res", label: "produces ×3" }, { id: "u", source: "res", target: "act", label: "is used by ×3" }] };
  const sizes = { act: { width: 110, height: 40 }, res: { width: 110, height: 40 } };
  const labelSizes = { p: { width: 84, height: 20 }, u: { width: 92, height: 20 } };
  const layout = await new ELK().layout(toElkGraph(pair, sizes, { labelSizes }));
  const at = labelsFromElk(layout);
  assert.deepEqual(Object.keys(at).sort(), ["p", "u"]);
  const pos = positionsFromElk(layout);
  const rect = (x, y, w, h) => ({ l: x, r: x + w, t: y, b: y + h });
  const boxes = Object.entries(sizes).map(([id, s]) => rect(pos[id].x, pos[id].y, s.width, s.height));
  const labels = Object.entries(labelSizes).map(([id, s]) => rect(at[id].x - s.width / 2, at[id].y - s.height / 2, s.width, s.height));
  const overlap = (a, b) => a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
  for (const l of labels) for (const b of boxes) assert.ok(!overlap(l, b), "label overlaps a box");
  assert.ok(!overlap(labels[0], labels[1]), "labels overlap each other");
});

test("routePath draws rounded corners and puts the label at the middle of the route", () => {
  const { d, labelX, labelY } = routePath([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }]);
  assert.match(d, /^M 0 0 L 90 0 Q 100 0 100 10 L 100 100$/);
  assert.equal(labelX, 100);
  assert.equal(labelY, 0);
});

test("the input contract is published as a JSON schema", async () => {
  const schema = JSON.parse(await readFile(new URL("../schemas/typed-graph.schema.json", import.meta.url), "utf8"));
  assert.equal(schema.properties.schema.const, SCHEMA);
  assert.deepEqual(schema.required, ["schema", "nodes", "edges"]);
});

test("edge routes start and end on their own boxes when components are packed apart", async () => {
  const g = { schema: SCHEMA, nodes: ["a", "b", "c", "d"].map((id) => ({ id, label: id })),
    edges: [{ id: "ab", source: "a", target: "b", label: "x" }, { id: "cd", source: "c", target: "d", label: "y" }] };
  const sizes = Object.fromEntries(["a", "b", "c", "d"].map((id) => [id, { width: 100, height: 40 }]));
  const layout = await new ELK().layout(toElkGraph(g, sizes));
  const pos = positionsFromElk(layout), routes = routesFromElk(layout);
  const near = (p, id) => p.x >= pos[id].x - 1 && p.x <= pos[id].x + 101 && p.y >= pos[id].y - 1 && p.y <= pos[id].y + 41;
  for (const [id, s, t] of [["ab", "a", "b"], ["cd", "c", "d"]]) {
    const pts = routes[id];
    assert.ok(near(pts[0], s), `${id} starts on ${s}`);
    assert.ok(near(pts.at(-1), t), `${id} ends on ${t}`);
  }
});

test("layout candidates cover both directions unless fixed, and fitScale prefers the drawing that fits larger", () => {
  assert.deepEqual(layoutCandidates({ layout: {} }), [{ direction: "RIGHT", wrap: true }, { direction: "RIGHT", wrap: false }, { direction: "DOWN", wrap: false }]);
  assert.ok(layoutCandidates({ layout: { direction: "DOWN" } }).every((c) => c.direction === "DOWN" && !c.wrap), "top-to-bottom never wraps");
  const frame = { width: 800, height: 600 };
  assert.ok(fitScale({ width: 700, height: 500 }, frame) > fitScale({ width: 2000, height: 300 }, frame));
});

test("the viewer shields its SVGs from host-page svg sizing rules", async () => {
  // A host rule like svg{width:100%;height:auto} (DoDAF's tokens.css) hid every edge.
  const src = await readFile(new URL("../graph-viewer/src/index.jsx", import.meta.url), "utf8");
  assert.match(src, /\.gv-root svg\{display:inline;width:auto;height:auto;max-width:none;max-height:none\}/);
  const demo = await readFile(new URL("../graph-viewer/demo.html", import.meta.url), "utf8");
  assert.match(demo, /svg\{display:block;width:100%;height:auto\}/, "the demo page carries the hostile rule, so a visual check covers it");
});

test("pickLayout prefers a straighter drawing when it fits nearly as large", () => {
  const frame = { width: 800, height: 600 };
  const bent = (n) => [{ sections: [{ bendPoints: Array.from({ length: n }, () => ({ x: 0, y: 0 })) }] }];
  const tangled = { id: "tangled", width: 700, height: 500, edges: bent(6) };
  const straight = { id: "straight", width: 740, height: 520, edges: bent(1) };   // ~5% smaller fit
  const tiny = { id: "tiny", width: 2000, height: 1500, edges: bent(0) };         // far smaller fit: never chosen
  assert.equal(bendCount(tangled), 6);
  assert.equal(pickLayout([tangled, straight, tiny], frame).id, "straight");
  assert.equal(pickLayout([tangled, tiny], frame).id, "tangled");
});

test("litSet: a selection lights its neighbours; otherwise a highlight set; otherwise nothing is dimmed", () => {
  assert.equal(litSet(graph, null, null), null, "nothing picked: nothing dims");
  const hl = new Set(["a", "e1"]);
  assert.equal(litSet(graph, null, hl), hl, "a highlighted source lights exactly its ids");
  assert.deepEqual([...litSet(graph, "c", hl)].sort(), ["b", "c", "e2"], "a click overrides the highlight and lights the neighbours");
});
