import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { renderReviewWorkbench, validateReviewWorkbenchModel } from "../src/review-workbench.mjs";

const model = JSON.parse(await readFile(
  new URL("../review-workbench/pr22.model.json", import.meta.url),
  "utf8"
));

const html = renderReviewWorkbench(model);

const byId = (items, id) => items.find(item => item.id === id);

test("review workbench is pinned to the merged PR22 subject and successful execution evidence", () => {
  validateReviewWorkbenchModel(model);
  assert.equal(model.subject.baseRevision, "52c694a0dc44a040550f69e2ed6e7cf0aa4b21f6");
  assert.equal(model.subject.verifiedHeadRevision, "03a74c99fe277daf2a75aac327b1649ad21b996f");
  assert.equal(model.subject.mergeRevision, "c746125d6dec518ca0ba2df0a278890bb408df35");
  assert.equal(model.subject.ciRun, "35044053698");
  assert.equal(byId(model.sources, "ci").role, "execution-evidence");
  assert.match(byId(model.sources, "ci").note, /npm ci and npm test/i);
});

test("human usefulness stays open even though implementation, CI, and merge are complete", () => {
  assert.equal(byId(model.status, "implemented").state, "complete");
  assert.equal(byId(model.status, "verified").state, "passed");
  assert.equal(byId(model.status, "merged").state, "complete");
  assert.equal(byId(model.status, "human-review").state, "needs-review");
  assert.equal(byId(model.requirements, "R6").state, "needs-human-review");
  assert.match(model.reviewQuestion, /materially easier/i);
  assert.ok(model.review.nonclaims.some(item => /green tests/i.test(item)));
});

test("requirements expose implementation and evidence instead of one completion percentage", () => {
  assert.deepEqual(model.requirements.map(row => row.id), ["R1", "R2", "R3", "R4", "R5", "R6"]);
  for (const row of model.requirements) {
    assert.ok(row.question);
    assert.ok(row.implementation.length > 0, row.id);
    assert.ok(row.evidence.length > 0, row.id);
    assert.ok(row.sourceIds.length > 0, row.id);
  }
  assert.ok(byId(model.requirements, "R3").evidence.some(item => /authority regression/i.test(item)));
  assert.ok(byId(model.requirements, "R5").evidence.some(item => /CI run 35044053698/i.test(item)));
});

test("evidence cards keep proofs adjacent to explicit nonclaims", () => {
  for (const item of model.evidence) {
    assert.ok(item.proves.length > 0, item.id);
    assert.ok(item.doesNotProve.length > 0, item.id);
  }
  const ci = byId(model.evidence, "ci-executed");
  assert.equal(ci.state, "passed");
  assert.ok(ci.proves.some(item => /npm test succeeded/i.test(item)));
  assert.ok(ci.doesNotProve.some(item => /Human comprehension/i.test(item)));
});

test("renderer emits one self-contained, keyboard-navigable responsive HTML artifact", () => {
  assert.match(html, /^<!doctype html>/i);
  assert.match(html, /role="tablist"/);
  assert.match(html, /role="tabpanel"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /ArrowLeft/);
  assert.match(html, /ArrowRight/);
  assert.match(html, /@media\(max-width:640px\)/);
  assert.match(html, /window\.__REVIEW_WORKBENCH_MODEL__/);
  assert.doesNotMatch(html, /<script[^>]+src=/i);
  assert.doesNotMatch(html, /<link[^>]+stylesheet/i);
});

test("rendered first screen and lenses name the human checkpoint instead of leading with raw code", () => {
  assert.match(html, /Review Workbench v0/);
  assert.match(html, /Open checkpoint/);
  assert.match(html, /Does this make it materially easier/);
  for (const lens of ["Change", "Architecture", "Requirements", "Evidence", "Review"]) {
    assert.match(html, new RegExp(`>${lens}<`));
  }
  assert.match(html, /What this does not prove/);
  assert.match(html, /Your review question/);
});

test("source entrypoint is a thin loader over the same model and renderer", async () => {
  const source = await readFile(new URL("../review-workbench/index.html", import.meta.url), "utf8");
  assert.match(source, /renderReviewWorkbench/);
  assert.match(source, /pr22\.model\.json/);
  assert.match(source, /npm run build:review-workbench/);
});
