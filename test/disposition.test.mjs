import assert from "node:assert/strict";
import { test } from "node:test";
import { buildDispositionRecord, collectChecklist, validateDisposition } from "../src/disposition.mjs";

const sampleRecommendation = {
  primary: {
    representation: "scroll-linked-explainer",
    implementation: { playbook: { avoid: ["one-fixed-label-coordinate-per-mark"] } }
  },
  avoid: ["giant-hairball-graph"],
  quality: {
    hardChecks: ["no-critical-text-text-overlap"],
    softChecks: ["edge-label-clearance"],
    usabilityChecks: ["terms-are-defined-before-first-use"]
  },
  viewSpec: { id: "example--scroll-linked-explainer" }
};

test("collectChecklist gathers every named category and dedupes", () => {
  const checklist = collectChecklist(sampleRecommendation);
  assert.equal(checklist.length, 5);
  const ids = checklist.map((item) => item.id);
  assert.ok(ids.includes("giant-hairball-graph"));
  assert.ok(ids.includes("one-fixed-label-coordinate-per-mark"));
  assert.ok(ids.includes("no-critical-text-text-overlap"));
  assert.ok(ids.includes("edge-label-clearance"));
  assert.ok(ids.includes("terms-are-defined-before-first-use"));
});

test("collectChecklist tolerates a recommendation with no checklist fields", () => {
  assert.deepEqual(collectChecklist({}), []);
});

test("validateDisposition passes when every item has a status and a reason", () => {
  const checklist = collectChecklist(sampleRecommendation);
  const dispositions = Object.fromEntries(
    checklist.map((item) => [item.id, { status: "satisfied", why: "checked by hand" }])
  );
  const result = validateDisposition(checklist, dispositions);
  assert.equal(result.ok, true);
  assert.deepEqual(result.missing, []);
  assert.deepEqual(result.invalid, []);
});

test("validateDisposition refuses a silently omitted item", () => {
  const checklist = collectChecklist(sampleRecommendation);
  const { [checklist[0].id]: _dropped, ...rest } = Object.fromEntries(
    checklist.map((item) => [item.id, { status: "satisfied", why: "checked by hand" }])
  );
  const result = validateDisposition(checklist, rest);
  assert.equal(result.ok, false);
  assert.equal(result.missing.length, 1);
  assert.equal(result.missing[0].id, checklist[0].id);
});

test("validateDisposition refuses an unstated reason even with a valid status", () => {
  const checklist = collectChecklist(sampleRecommendation);
  const dispositions = Object.fromEntries(checklist.map((item) => [item.id, { status: "skipped", why: "" }]));
  const result = validateDisposition(checklist, dispositions);
  assert.equal(result.ok, false);
  assert.equal(result.invalid.length, checklist.length);
});

test("validateDisposition rejects an unrecognized status word", () => {
  const checklist = collectChecklist(sampleRecommendation);
  const dispositions = Object.fromEntries(
    checklist.map((item) => [item.id, { status: "probably-fine", why: "seems ok" }])
  );
  const result = validateDisposition(checklist, dispositions);
  assert.equal(result.ok, false);
  assert.equal(result.invalid.length, checklist.length);
});

test("validateDisposition flags disposition entries the recommendation never asked for", () => {
  const checklist = collectChecklist(sampleRecommendation);
  const dispositions = Object.fromEntries(
    checklist.map((item) => [item.id, { status: "satisfied", why: "checked by hand" }])
  );
  dispositions["not-a-real-checklist-item"] = { status: "satisfied", why: "n/a" };
  const result = validateDisposition(checklist, dispositions);
  assert.equal(result.ok, true);
  assert.deepEqual(result.coveredExtra, ["not-a-real-checklist-item"]);
});

test("buildDispositionRecord captures actor, pattern, and the disposition map", () => {
  const checklist = collectChecklist(sampleRecommendation);
  const dispositions = Object.fromEntries(checklist.map((item) => [item.id, { status: "satisfied", why: "x" }]));
  const record = buildDispositionRecord({
    recommendationId: "example--scroll-linked-explainer",
    primaryPattern: "scroll-linked-explainer",
    actor: "brian",
    dispositions,
    checklist
  });
  assert.equal(record.recommendationId, "example--scroll-linked-explainer");
  assert.equal(record.primaryPattern, "scroll-linked-explainer");
  assert.equal(record.actor, "brian");
  assert.equal(record.checklistSize, checklist.length);
  assert.ok(record.recordedAt);
});

// --- approved references (acceptance.json) ---------------------------------

import { ACCEPTANCE_REFERENCE_PREFIX, validateAcceptance } from "../src/disposition.mjs";

const sampleAcceptance = {
  references: [
    {
      id: "work-map-gamified-v1",
      kind: "approved-mockup",
      path: "approved/work-map.png",
      sha256: "ebaf58901f4c9fac1119b611d780534fcb7f9458cb8fbcbb285946338b73626a",
      approvedBy: "brian",
      approvedAt: "2026-09-10T21:13:00-07:00"
    }
  ]
};

test("validateAcceptance accepts a complete reference and rejects a missing field or bad digest", () => {
  assert.equal(validateAcceptance(sampleAcceptance).ok, true);
  assert.equal(validateAcceptance(null).ok, true);
  const noApprover = { references: [{ ...sampleAcceptance.references[0], approvedBy: "" }] };
  assert.equal(validateAcceptance(noApprover).ok, false);
  const shortDigest = { references: [{ ...sampleAcceptance.references[0], sha256: "abc" }] };
  assert.equal(validateAcceptance(shortDigest).ok, false);
  assert.equal(validateAcceptance({ references: [] }).ok, false);
});

test("collectChecklist adds one required item per approved reference", () => {
  const checklist = collectChecklist(sampleRecommendation, sampleAcceptance);
  assert.equal(checklist.length, 6);
  const item = checklist.find((entry) => entry.category === "acceptance-reference");
  assert.equal(item.id, `${ACCEPTANCE_REFERENCE_PREFIX}work-map-gamified-v1`);
});

test("an approved reference cannot be dispositioned satisfied without evidence of the comparison", () => {
  const checklist = collectChecklist(sampleRecommendation, sampleAcceptance);
  const base = Object.fromEntries(checklist.map((item) => [item.id, { status: "satisfied", why: "checked by hand" }]));
  const parityId = `${ACCEPTANCE_REFERENCE_PREFIX}work-map-gamified-v1`;

  const withoutEvidence = validateDisposition(checklist, base);
  assert.equal(withoutEvidence.ok, false);
  assert.deepEqual(withoutEvidence.invalid.map((entry) => entry.id), [parityId]);

  const withEvidence = validateDisposition(checklist, {
    ...base,
    [parityId]: { status: "satisfied", why: "side-by-side at 1180px", evidence: "screenshots/work-map-1180.png" }
  });
  assert.equal(withEvidence.ok, true);

  // Admitting drift needs no evidence path; the honesty is the point.
  const skipped = validateDisposition(checklist, {
    ...base,
    [parityId]: { status: "skipped", why: "renderer diverged from the approved mockup; see follow-up" }
  });
  assert.equal(skipped.ok, true);
});

test("buildDispositionRecord carries the approved references into the log", () => {
  const checklist = collectChecklist(sampleRecommendation, sampleAcceptance);
  const record = buildDispositionRecord({
    recommendationId: "x",
    primaryPattern: "y",
    actor: "brian",
    dispositions: {},
    checklist,
    acceptance: sampleAcceptance
  });
  assert.equal(record.version, "0.2");
  assert.equal(record.acceptanceReferences.length, 1);
  assert.equal(record.acceptanceReferences[0].sha256, sampleAcceptance.references[0].sha256);
});

test("collectChecklist accepts the recommender's { pattern, reason } avoid entries", () => {
  const checklist = collectChecklist({
    ...sampleRecommendation,
    avoid: [{ pattern: "node-link-graph", reason: "missing required capability: linked-views" }]
  });
  const avoidIds = checklist.filter((item) => item.category === "avoid").map((item) => item.id);
  assert.deepEqual(avoidIds, ["node-link-graph"]);
  assert.ok(!checklist.some((item) => String(item.id).includes("[object Object]")));
});
