import assert from "node:assert/strict";
import { test } from "node:test";
import { execFile } from "node:child_process";
import { mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { collectChecklist, validateDisposition } from "../src/disposition.mjs";

// The 2026-10-04 case: the router ranked project-schedule first for a grouping decision with no
// dates, the builder built a grouped tile map, and the gate demanded choice-justified:project-schedule.
const recommendation = {
  primary: { representation: "project-schedule", implementation: { playbook: { avoid: [] } } },
  alternatives: ["data-table", "small-multiples"],
  quality: { hardChecks: ["no-critical-text-text-overlap"], softChecks: [], usabilityChecks: [] },
  viewSpec: { id: "grouping--project-schedule" }
};
const hard = { "no-critical-text-text-overlap": { status: "satisfied", why: "checked" } };

test("a choice-justified line for an alternative answers the selection item", () => {
  const checklist = collectChecklist(recommendation);
  const result = validateDisposition(checklist, { ...hard, "choice-justified:data-table": { status: "satisfied", why: "no dates; a table groups the 25 items" } });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.chosenRepresentation, "data-table");
  assert.deepEqual(result.coveredExtra, [], "the chosen line is not an unrequested extra");
});

test("the primary's own line still answers it", () => {
  const result = validateDisposition(collectChecklist(recommendation), { ...hard, "choice-justified:project-schedule": { status: "satisfied", why: "dates matter" } });
  assert.equal(result.ok, true);
  assert.equal(result.chosenRepresentation, "project-schedule");
});

test("no choice line is still refused, and two different choices are refused", () => {
  const checklist = collectChecklist(recommendation);
  const none = validateDisposition(checklist, hard);
  assert.equal(none.ok, false);
  assert.equal(none.missing[0].category, "selection");
  const two = validateDisposition(checklist, {
    ...hard,
    "choice-justified:data-table": { status: "satisfied", why: "a" },
    "choice-justified:small-multiples": { status: "satisfied", why: "b" }
  });
  assert.equal(two.ok, false);
  assert.match(two.invalid[0].reason, /name one choice/);
});

test("a chosen alternative still needs a reason, and a failed choice is counted", () => {
  const checklist = collectChecklist(recommendation);
  assert.equal(validateDisposition(checklist, { ...hard, "choice-justified:data-table": { status: "satisfied", why: " " } }).ok, false);
  const failed = validateDisposition(checklist, { ...hard, "choice-justified:data-table": { status: "failed", why: "no view fits" } });
  assert.deepEqual(failed.failed.map(({ category }) => category), ["selection"]);
});

test("the CLI records the chosen view and says which plan the checks came from", async () => {
  const dir = await mkdtemp(join(tmpdir(), "rr-choice-"));
  await writeFile(join(dir, "rec.json"), JSON.stringify(recommendation));
  await writeFile(join(dir, "disp.json"), JSON.stringify({ ...hard, "choice-justified:data-table": { status: "satisfied", why: "no dates" } }));
  const cli = new URL("../src/disposition-cli.mjs", import.meta.url).pathname;
  const { stdout, stderr } = await promisify(execFile)("node", [cli, join(dir, "rec.json"), join(dir, "disp.json"), "--out-dir", join(dir, "logs")], { env: { ...process.env, SITUATION_GATE: "", SITUATION_LOG_DIR: join(dir, "observations") } });
  assert.match(stdout, /Built data-table instead of the router's project-schedule/);
  assert.doesNotMatch(stderr, /didn't ask for/);
  const [file] = await readdir(join(dir, "logs"));
  const record = JSON.parse(await readFile(join(dir, "logs", file), "utf8"));
  assert.equal(record.chosenRepresentation, "data-table");
  assert.equal(record.primaryPattern, "project-schedule");
});
