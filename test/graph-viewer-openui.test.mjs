import assert from "node:assert/strict";
import { test } from "node:test";
import { z } from "zod";
import { validateTypedGraph } from "../graph-viewer/src/model.mjs";
import { toTypedGraph, defineGraphViewerComponent, EDGE_DIRECTION_RULE } from "../graph-viewer/src/openui.mjs";

const props = {
  nodes: [{ id: "auth-db", kind: "root" }, { id: "auth-service", label: "Auth service", kind: "failed" }, { id: "payments", kind: "ok" }],
  edges: [{ source: "auth-service", target: "auth-db", label: "depends on" }, { source: "checkout", target: "payments", label: "depends on" }],
  legend: [{ kind: "failed", label: "Fails", explain: "A dependency is down." }]
};

test("OpenUI props become a valid typed graph, keeping each edge's stated direction", () => {
  const { graph, dropped } = toTypedGraph(props);
  assert.deepEqual(validateTypedGraph(graph), []);
  assert.deepEqual(graph.edges, [{ id: "e1", source: "auth-service", target: "auth-db", label: "depends on" }]);
  assert.equal(dropped.length, 1, "an edge naming an unlisted node is dropped and reported");
  assert.equal(graph.nodes[0].label, "auth-db", "a missing label falls back to the id");
  assert.equal(graph.kinds.failed.label, "Fails");
  assert.equal(graph.kinds.failed.explain, "A dependency is down.");
  assert.equal(graph.kinds.root.label, "root");
});

test("no direction leaves layout to the viewer's best-fit choice; a given one is kept", () => {
  assert.equal(toTypedGraph(props).graph.layout, undefined);
  assert.deepEqual(toTypedGraph({ ...props, direction: "DOWN" }).graph.layout, { direction: "DOWN" });
  assert.equal(toTypedGraph({ ...props, direction: "SIDEWAYS" }).graph.layout, undefined);
});

test("the OpenUI component is named GraphViewer and tells the model the edge rule", () => {
  let spec;
  const component = defineGraphViewerComponent({ React: {}, defineComponent: (s) => (spec = s), z, mount: () => ({}) });
  assert.equal(component.name, "GraphViewer");
  assert.ok(spec.description.includes(EDGE_DIRECTION_RULE));
  assert.ok(spec.props.safeParse({ nodes: [{ id: "a" }], edges: [{ source: "a", target: "a", label: "x" }] }).success);
  assert.equal(spec.props.safeParse({ nodes: [], edges: [{ from: "a", to: "b" }] }).success, false, "old from/to edges are rejected");
});
