import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const script = new URL("../scripts/build-project-template.mjs", import.meta.url).pathname;
const projection = new URL("../examples/company-planning-rr-project-template-v2.json", import.meta.url).pathname;
const run = (...args) => spawnSync(process.execPath, [script, ...args], { encoding: "utf8" });

test("a projection without --surfaces is refused instead of borrowing the example bundle", () => {
  const out = join(mkdtempSync(join(tmpdir(), "rr-")), "x.html");
  const r = run("--projection", projection, "--output", out);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /--projection was given without --surfaces/);
});

test("--no-surfaces renders the plan with no other project's surfaces", () => {
  const out = join(mkdtempSync(join(tmpdir(), "rr-")), "x.html");
  const r = run("--projection", projection, "--no-surfaces", "--output", out);
  assert.equal(r.status, 0, r.stderr);
  assert.doesNotMatch(readFileSync(out, "utf8"), /twitter-prospecting/);
});
