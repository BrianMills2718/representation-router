import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applyLayoutPositions,
  clearLayout,
  createLayoutRecord,
  createLayoutStorageKey,
  layoutPersistenceContract,
  loadLayout,
  parseLayoutRecord,
  saveLayout
} from "../src/layout-persistence.mjs";

function memoryStorage() {
  const map = new Map();
  return {
    getItem(key) { return map.has(key) ? map.get(key) : null; },
    setItem(key, value) { map.set(key, String(value)); },
    removeItem(key) { map.delete(key); },
    dump() { return new Map(map); }
  };
}

const identity = {
  workbenchId: "rr-pr22",
  subjectRevision: "c746125d6dec518ca0ba2df0a278890bb408df35",
  lens: "component"
};

const defaults = [
  { id: "a", position: { x: 10, y: 20 }, data: { title: "A" } },
  { id: "b", position: { x: 30, y: 40 }, data: { title: "B" } }
];

test("storage keys are scoped by workbench, exact subject revision, and lens", () => {
  const a = createLayoutStorageKey(identity);
  const b = createLayoutStorageKey({ ...identity, subjectRevision: "new-revision" });
  const c = createLayoutStorageKey({ ...identity, lens: "state" });
  assert.notEqual(a, b);
  assert.notEqual(a, c);
  assert.match(a, /rr-pr22/);
});

test("saved layout records contain presentation coordinates only", () => {
  const record = createLayoutRecord({
    ...identity,
    savedAt: "2026-09-16T03:30:00.000Z",
    nodes: defaults.map((node) => ({ ...node, sourceIds: ["should-not-save"], relationships: ["should-not-save"] }))
  });
  assert.deepEqual(Object.keys(record).sort(), ["lens", "positions", "savedAt", "schemaVersion", "subjectRevision", "workbenchId"].sort());
  assert.deepEqual(record.positions, [
    { id: "a", x: 10, y: 20 },
    { id: "b", x: 30, y: 40 }
  ]);
  assert.equal(JSON.stringify(record).includes("relationships"), false);
  assert.equal(JSON.stringify(record).includes("sourceIds"), false);
});

test("save then reload restores positions without mutating defaults", () => {
  const storage = memoryStorage();
  const moved = [
    { ...defaults[0], position: { x: 510, y: 320 } },
    defaults[1]
  ];
  const before = JSON.stringify(defaults);
  assert.equal(saveLayout(storage, { ...identity, nodes: moved, savedAt: "2026-09-16T03:31:00.000Z" }).status, "saved");
  const loaded = loadLayout(storage, { ...identity, defaultNodes: defaults });
  assert.equal(loaded.status, "restored");
  assert.deepEqual(loaded.nodes.map((node) => node.position), [{ x: 510, y: 320 }, { x: 30, y: 40 }]);
  assert.equal(JSON.stringify(defaults), before);
  assert.notEqual(loaded.nodes[0], defaults[0]);
  assert.notEqual(loaded.nodes[0].data, defaults[0].data);
});

test("a stale subject revision is rejected rather than silently remapped", () => {
  const stale = createLayoutRecord({
    ...identity,
    subjectRevision: "older-revision",
    nodes: defaults,
    savedAt: "2026-09-16T03:32:00.000Z"
  });
  const parsed = parseLayoutRecord(JSON.stringify(stale), identity);
  assert.equal(parsed.status, "stale");
  assert.equal(parsed.reason, "revision-mismatch");
  assert.equal(layoutPersistenceContract.staleRevisionBehavior, "ignore-and-use-default-layout");
});

test("known saved nodes restore while new/default nodes stay deterministic and unknown saved ids are ignored", () => {
  const record = {
    schemaVersion: "review-workbench-layout/v1",
    ...identity,
    savedAt: "2026-09-16T03:33:00.000Z",
    positions: [
      { id: "a", x: 900, y: 901 },
      { id: "removed-node", x: 999, y: 999 }
    ]
  };
  const merged = applyLayoutPositions(defaults, record);
  assert.deepEqual(merged.map((node) => node.position), [{ x: 900, y: 901 }, { x: 30, y: 40 }]);
  assert.equal(merged.some((node) => node.id === "removed-node"), false);
});

test("reset removes the exact saved layout and returns subsequent loads to defaults", () => {
  const storage = memoryStorage();
  saveLayout(storage, { ...identity, nodes: [{ ...defaults[0], position: { x: 77, y: 88 } }, defaults[1]] });
  assert.equal(clearLayout(storage, identity).status, "cleared");
  const loaded = loadLayout(storage, { ...identity, defaultNodes: defaults });
  assert.equal(loaded.status, "missing");
  assert.deepEqual(loaded.nodes.map((node) => node.position), defaults.map((node) => node.position));
});

test("storage failures degrade to an honest unavailable state without breaking the graph", () => {
  const brokenStorage = {
    getItem() { throw new Error("blocked"); },
    setItem() { throw new Error("blocked"); },
    removeItem() { throw new Error("blocked"); }
  };
  const loaded = loadLayout(brokenStorage, { ...identity, defaultNodes: defaults });
  assert.equal(loaded.status, "unavailable");
  assert.deepEqual(loaded.nodes.map((node) => node.position), defaults.map((node) => node.position));
  assert.equal(saveLayout(brokenStorage, { ...identity, nodes: defaults }).status, "unavailable");
});
