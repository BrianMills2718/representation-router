import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { evaluateLedger } from "../scripts/friction-gate.mjs";

const ledger = JSON.parse(await readFile(new URL("../docs/friction-ledger.json", import.meta.url), "utf8"));

test("the friction ledger is well formed", () => {
  const ids = ledger.entries.map((entry) => entry.id);
  assert.equal(new Set(ids).size, ids.length, "unique ids");
  assert.ok(!Number.isNaN(Date.parse(ledger.triagedThrough)));
  for (const entry of ledger.entries) {
    assert.ok(["open", "fixed"].includes(entry.status), `${entry.id} status`);
    assert.ok(entry.summary.length > 20, `${entry.id} summary`);
    assert.ok(entry.reports.length > 0 && entry.reports.every((date) => /^\d{4}-\d{2}-\d{2}$/.test(date)), `${entry.id} reports`);
    if (entry.status === "fixed") assert.ok(entry.fixedBy, `${entry.id} names what fixed it`);
  }
});

test("the gate blocks on open entries at the threshold, then on untriaged ratings", () => {
  const sample = {
    triagedThrough: "2026-10-14T00:00:00Z",
    threshold: 3,
    entries: [
      { id: "a", summary: "x", reports: ["2026-10-01", "2026-10-02", "2026-10-03"], status: "open" },
      { id: "b", summary: "x", reports: ["2026-10-01", "2026-10-02"], status: "open" },
      { id: "c", summary: "x", reports: ["2026-10-01", "2026-10-02", "2026-10-03"], status: "fixed" }
    ]
  };
  const ratings = [
    { ts: "2026-10-13T00:00:00Z", friction: "old" },
    { ts: "2026-10-15T00:00:00Z", friction: "new" },
    { ts: "2026-10-16T00:00:00Z", friction: "" }
  ];
  const result = evaluateLedger(sample, ratings);
  assert.deepEqual(result.blocking.map((entry) => entry.id), ["a"]);
  assert.deepEqual(result.untriaged.map((row) => row.friction), ["new"]);
});
