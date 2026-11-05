import assert from "node:assert/strict";
import { test } from "node:test";
import { execFile } from "node:child_process";
import { mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { buildDispositionRecord, collectChecklist, parseJsonAfterBanner, validateDisposition } from "../src/disposition.mjs";

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

test("validateDisposition refuses a silently omitted required item", () => {
  const checklist = collectChecklist(sampleRecommendation);
  const hard = checklist.find((item) => item.category === "hard-check");
  assert.equal(hard.required, true);
  const { [hard.id]: _dropped, ...rest } = Object.fromEntries(
    checklist.map((item) => [item.id, { status: "satisfied", why: "checked by hand" }])
  );
  const result = validateDisposition(checklist, rest);
  assert.equal(result.ok, false);
  assert.equal(result.missing.length, 1);
  assert.equal(result.missing[0].id, hard.id);
});

test("advisory items may be left unanswered; they are counted, and --strict requires them", () => {
  const checklist = collectChecklist(sampleRecommendation);
  const advisory = checklist.filter((item) => !item.required).map((item) => item.category).sort();
  assert.deepEqual(advisory, ["avoid", "soft-check", "usability-check"]);
  const requiredOnly = Object.fromEntries(
    checklist.filter((item) => item.required).map((item) => [item.id, { status: "satisfied", why: "checked by hand" }])
  );
  const result = validateDisposition(checklist, requiredOnly);
  assert.equal(result.ok, true);
  assert.equal(result.advisoryUnanswered.length, 3);
  const strict = validateDisposition(checklist, requiredOnly, { strict: true });
  assert.equal(strict.ok, false);
  assert.equal(strict.missing.length, 3);
  const record = buildDispositionRecord({ recommendationId: "x", primaryPattern: "y", actor: "t", dispositions: requiredOnly, checklist });
  assert.equal(record.requiredCount, 2);
  assert.equal(record.advisoryUnanswered.length, 3);
});

test("an advisory line that is given must still be valid", () => {
  const checklist = collectChecklist(sampleRecommendation);
  const dispositions = Object.fromEntries(
    checklist.filter((item) => item.required).map((item) => [item.id, { status: "satisfied", why: "checked by hand" }])
  );
  dispositions["edge-label-clearance"] = { status: "fine" };
  const result = validateDisposition(checklist, dispositions);
  assert.equal(result.ok, false);
  assert.deepEqual(result.invalid.map((item) => item.id), ["edge-label-clearance"]);
});

test("validateDisposition refuses an unstated reason even with a valid status", () => {
  const checklist = collectChecklist(sampleRecommendation);
  const dispositions = Object.fromEntries(checklist.map((item) => [item.id, { status: "skipped", why: "" }]));
  const result = validateDisposition(checklist, dispositions);
  assert.equal(result.ok, false);
  assert.equal(result.invalid.length, checklist.length);
});

test("a review can record a check as failed; it is complete but listed as failed", () => {
  const checklist = collectChecklist(sampleRecommendation);
  const dispositions = Object.fromEntries(
    checklist.map((item, index) => [item.id, index === 0
      ? { status: "failed", why: "labels overlap at 390px wide" }
      : { status: "satisfied", why: "checked by hand" }])
  );
  const result = validateDisposition(checklist, dispositions);
  assert.equal(result.ok, true);
  assert.deepEqual(result.failed.map((item) => item.id), [checklist[0].id]);
  const record = buildDispositionRecord({ recommendationId: "x", primaryPattern: "y", actor: "t", dispositions, checklist });
  assert.deepEqual(record.failed.map((item) => item.id), [checklist[0].id]);
});

test("the disposition CLI writes the log and exits 3 when any item failed", async () => {
  const dir = await mkdtemp(join(tmpdir(), "rr-disposition-"));
  const checklist = collectChecklist(sampleRecommendation);
  const dispositions = Object.fromEntries(checklist.map((item, index) => [item.id, { status: index === 0 ? "failed" : "na", why: "test" }]));
  // the recommendation file carries npm's lifecycle banner, as `npm run recommend -- x > rec.json` writes it
  await writeFile(join(dir, "rec.json"), "\n> representation-router@0.2.0 recommend\n> node src/recommend-cli.mjs x.json\n\n" + JSON.stringify(sampleRecommendation));
  await writeFile(join(dir, "disp.json"), JSON.stringify(dispositions));
  const cli = new URL("../src/disposition-cli.mjs", import.meta.url).pathname;
  const error = await promisify(execFile)("node", [cli, join(dir, "rec.json"), join(dir, "disp.json"), "--out-dir", join(dir, "logs")], { env: { ...process.env, SITUATION_GATE: "", SITUATION_LOG_DIR: join(dir, "observations") } }).then(() => null, (e) => e);
  assert.equal(error?.code, 3, error?.stderr);
  assert.match(error.stdout, /FAILED/);
  assert.match(error.stdout, /Log: /);
});

test("without --out-dir the disposition CLI appends one line to a daily log file", async () => {
  const dir = await mkdtemp(join(tmpdir(), "rr-disposition-daily-"));
  const checklist = collectChecklist(sampleRecommendation);
  const dispositions = Object.fromEntries(checklist.map((item) => [item.id, { status: "satisfied", why: "test" }]));
  await writeFile(join(dir, "rec.json"), JSON.stringify(sampleRecommendation));
  await writeFile(join(dir, "disp.json"), JSON.stringify(dispositions));
  const cli = new URL("../src/disposition-cli.mjs", import.meta.url).pathname;
  const env = { ...process.env, SITUATION_GATE: "", SITUATION_LOG_DIR: join(dir, "observations"), DISPOSITION_LOG_DIR: join(dir, "daily") };
  for (let run = 0; run < 2; run += 1) await promisify(execFile)("node", [cli, join(dir, "rec.json"), join(dir, "disp.json")], { env, cwd: dir });
  const files = await readdir(join(dir, "daily"));
  assert.equal(files.length, 1, "one file per day");
  assert.match(files[0], /^\d{4}-\d{2}-\d{2}\.jsonl$/);
  const lines = (await readFile(join(dir, "daily", files[0]), "utf8")).trim().split("\n");
  assert.equal(lines.length, 2, "one line per record");
  assert.equal(JSON.parse(lines[0]).cwd, dir);
});

test("parseJsonAfterBanner reads JSON with or without an npm banner above it", () => {
  assert.deepEqual(parseJsonAfterBanner('{"a":1}'), { a: 1 });
  assert.deepEqual(parseJsonAfterBanner('\n> pkg@1.0.0 recommend\n> node x\n\n{\n  "a": 1\n}\n'), { a: 1 });
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
