import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { applyApproval, composePrompts, draftAcceptance, threadIdFrom, validateSpec } from "../src/sketch-set.mjs";
import { validateAcceptance } from "../src/disposition.mjs";

const spec = JSON.parse(await readFile(new URL("../examples/sketch-sets/planning-review-surface.json", import.meta.url), "utf8"));

test("the shipped example spec is valid and composes one prompt per picture with the shared shell", () => {
  assert.deepEqual(validateSpec(spec), []);
  const prompts = composePrompts(spec);
  assert.equal(prompts.length, 4);
  for (const [i, p] of prompts.entries()) {
    assert.ok(p.text.includes("SCHEMATIC SKETCH"), "every prompt says it is a schematic");
    assert.ok(p.text.includes("Work unit W-3"), "every prompt carries the shared shell");
    assert.ok(p.text.includes(`picture ${i + 1} of 4`));
    assert.ok(p.text.includes(spec.pictures[i].instruction.slice(0, 30)));
  }
});

test("validateSpec names missing shell, missing pictures, and duplicate ids", () => {
  assert.ok(validateSpec({ id: "x", pictures: [] }).some((e) => e.includes("shell")));
  assert.ok(validateSpec({ id: "x", shell: "s", pictures: [] }).some((e) => e.includes("non-empty")));
  const dup = validateSpec({ id: "x", shell: "s", pictures: [{ id: "a", instruction: "i" }, { id: "a", instruction: "j" }] });
  assert.ok(dup.some((e) => e.includes("duplicates")));
});

test("threadIdFrom finds the thread in a bridge reply or a timeout error body", () => {
  assert.equal(threadIdFrom('{"thread_id":"6ab650d3-0cf8-83e9-9841-a49d998980eb","reply":"x"}'), "6ab650d3-0cf8-83e9-9841-a49d998980eb");
  assert.equal(threadIdFrom('{"error":"No finished reply within 60s (last seen: {\\"thread_id\\":\\"6ab65d06-37cc-83ea-bf84-b6bd5af607e4\\"})"}'), "6ab65d06-37cc-83ea-bf84-b6bd5af607e4");
  assert.equal(threadIdFrom("nothing here"), null);
});

test("a drafted acceptance is rejected until approved, then accepted by the disposition validator", () => {
  const saved = [{ id: "1-work", path: "1-work-0.png", sha256: "a".repeat(64), thread: "6ab65d06-37cc-83ea-bf84-b6bd5af607e4" }];
  const draft = draftAcceptance(spec, saved);
  assert.equal(draft.references[0].approvedBy, null);
  assert.equal(validateAcceptance(draft).ok, false, "draft must not pass as an acceptance");
  const stamped = applyApproval(draft, { approvedBy: "brian", approvedAt: "2026-09-25T09:05:00-04:00", words: "ok this is fine" });
  assert.equal(validateAcceptance(stamped).ok, true);
  assert.equal(stamped.approvalWords, "ok this is fine");
  assert.deepEqual(stamped.conditions, spec.conditions);
});
