import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendObservation, observationRow } from "../src/observation.mjs";

test("a refused disposition is recorded as not ok with its problem count", async () => {
  const dir = await mkdtemp(join(tmpdir(), "obs-"));
  const row = observationRow({ artifact: "page-x", situation: "flow-diagram", ok: false, problems: 3, gate: "manual", now: new Date("2026-10-06T18:00:00Z") });
  assert.equal(await appendObservation(row, { dir }), true);
  const lines = (await readFile(join(dir, "2026-10-06.jsonl"), "utf8")).trim().split("\n").map((l) => JSON.parse(l));
  assert.deepEqual(lines, [{ ts: "2026-10-06T18:00:00+00:00", domain: "representation", artifact: "page-x", form: "flow-diagram", ok: false, problems: 3, gate: "manual" }]);
});

test("rows append to the same daily file instead of creating one file per run", async () => {
  const dir = await mkdtemp(join(tmpdir(), "obs-"));
  const now = new Date("2026-10-06T19:00:00Z");
  await appendObservation(observationRow({ artifact: "a", situation: "s", ok: true, now }), { dir });
  await appendObservation(observationRow({ artifact: "b", situation: "s", ok: true, now }), { dir });
  const text = await readFile(join(dir, "2026-10-06.jsonl"), "utf8");
  assert.equal(text.trim().split("\n").length, 2);
});
