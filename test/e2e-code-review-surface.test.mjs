import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { buildSurfaceSpec } from "../src/surface-spec.mjs";

const fixture = JSON.parse(await readFile(
  new URL("../examples/e2e-code-review-pr22.json", import.meta.url),
  "utf8"
));
const evidenceState = JSON.parse(await readFile(
  new URL("../examples/e2e-code-review-pr22-evidence-state.json", import.meta.url),
  "utf8"
));

const viewById = (id) => fixture.viewSpecs.find((view) => view.id === id);

function validateCodeReviewEvidenceState(reviewFixture, localEvidenceState) {
  if (localEvidenceState.reviewId !== reviewFixture.id) throw new Error("Code-review evidence state targets a different review fixture");
  const subjectRevision = reviewFixture.source_snapshot.subject_revision;
  const reviewedHead = reviewFixture.surfaceOptions.sourceBindings.find((binding) => binding.sourceId === "reviewed-head");
  if (!reviewedHead || reviewedHead.revision !== subjectRevision) throw new Error("Code-review source binding does not match the reviewed subject revision");
  if (localEvidenceState.subjectRevision !== subjectRevision) throw new Error("Code-review evidence state is stale for the reviewed subject revision");

  const obligations = new Map(reviewFixture.review_model.obligations.map((obligation) => [obligation.id, obligation]));
  for (const item of localEvidenceState.obligations) {
    const obligation = obligations.get(item.id);
    if (!obligation) throw new Error(`Unknown code-review obligation: ${item.id}`);
    if (!Array.isArray(item.required) || !Array.isArray(item.observedRefs)) throw new Error(`Invalid local evidence state for ${item.id}`);
    if (item.status === "unobserved") {
      if (item.observedRefs.length) throw new Error(`Unobserved obligation ${item.id} cannot carry observed evidence refs`);
      const missing = new Set(obligation.missing_evidence ?? []);
      if (!item.required.every((required) => missing.has(required))) throw new Error(`Unobserved obligation ${item.id} must correspond to explicit missing evidence`);
    } else if (item.status === "definition-only") {
      const definitions = new Set(obligation.verified_by_definition ?? []);
      if (!item.observedRefs.length || !item.observedRefs.every((ref) => definitions.has(ref))) {
        throw new Error(`Definition-only obligation ${item.id} must point only to executable check definitions`);
      }
    } else {
      throw new Error(`Unsupported consumer-local evidence status: ${item.status}`);
    }
  }
  return localEvidenceState;
}

test("real PR review snapshot composes code-review concerns without Git-specific SurfaceSpec fields", () => {
  const spec = buildSurfaceSpec(fixture.viewSpecs, fixture.surfaceOptions);

  assert.equal(spec.id, "representation-router-pr22-code-review");
  assert.deepEqual(spec.purpose.lifecycleStages, ["implementation", "verification", "review"]);
  assert.equal(spec.views[0].viewSpecId, "change-map");
  assert.ok(spec.views.some((view) => view.viewSpecId === "requirement-trace" && view.role === "primary"));
  assert.equal("pullRequest" in spec, false);
  assert.equal("git" in spec, false);
  assert.equal("changedFiles" in spec, false);

  const trace = viewById("requirement-trace");
  assert.deepEqual(trace.projection.relationships, ["implemented-by", "documented-by", "verified-by-definition"]);
  assert.equal(spec.views.every((view) => !("projection" in view)), true);
});

test("review snapshot pins exact base/head and treats the PR diff as change evidence", () => {
  const spec = buildSurfaceSpec(fixture.viewSpecs, fixture.surfaceOptions);
  const bindings = Object.fromEntries(spec.sourceBindings.map((binding) => [binding.sourceId, binding]));

  assert.equal(bindings["base-tree"].revision, fixture.source_snapshot.base_revision);
  assert.equal(bindings["reviewed-head"].revision, fixture.source_snapshot.subject_revision);
  assert.equal(bindings["pr-state"].revision, `PR-22@${fixture.source_snapshot.subject_revision}`);
  assert.equal(bindings["pr-diff"].role, "evidence");
  assert.equal(bindings["reviewed-head"].role, "implementation");
  assert.equal(bindings["change-plan"].role, "workflow-authority");
});

test("test definitions and CI configuration do not masquerade as executed test evidence", () => {
  const spec = buildSurfaceSpec(fixture.viewSpecs, fixture.surfaceOptions);
  const bindings = Object.fromEntries(spec.sourceBindings.map((binding) => [binding.sourceId, binding]));
  const verification = viewById("verification-state");
  const trace = viewById("requirement-trace");

  assert.equal(bindings["test-definitions"].role, "implementation");
  assert.equal(bindings["ci-configuration"].role, "implementation");
  assert.equal(verification.availability.status, "partial");
  assert.ok(verification.availability.missing.includes("executed npm test result for reviewed subject revision"));
  assert.ok(trace.availability.missing.includes("executed npm test result for reviewed subject revision"));
  assert.match(fixture.review_model.evidence_semantics.test_definition, /not evidence/i);
  assert.match(fixture.review_model.evidence_semantics.ci_configuration, /not evidence/i);
});

test("consumer-local evidence state distinguishes definitions from unobserved execution without extending ViewSpec", () => {
  const local = validateCodeReviewEvidenceState(fixture, evidenceState);
  const byId = Object.fromEntries(local.obligations.map((item) => [item.id, item]));

  assert.equal(byId["authority-boundary"].status, "definition-only");
  assert.deepEqual(byId["authority-boundary"].observedRefs, ["test/surface-spec.test.mjs"]);
  assert.equal(byId["repository-verification"].status, "unobserved");
  assert.deepEqual(byId["repository-verification"].observedRefs, []);
  assert.match(byId["repository-verification"].limitation, /no execution receipt/i);
  assert.equal(fixture.viewSpecs.some((view) => "evidenceState" in view || "epistemicState" in view), false);
});

test("code-review evidence state fails closed when its subject revision is stale", () => {
  const stale = structuredClone(evidenceState);
  stale.subjectRevision = "f".repeat(40);
  assert.throws(
    () => validateCodeReviewEvidenceState(fixture, stale),
    /evidence state is stale for the reviewed subject revision/
  );
});

test("code-review surface exposes only local/read-only actions without an external reviewer authority contract", () => {
  const spec = buildSurfaceSpec(fixture.viewSpecs, fixture.surfaceOptions);

  assert.equal(spec.actions.some((action) => action.effect === "authoritative-write"), false);
  const local = spec.actions.find((action) => action.effect === "surface-local");
  assert.ok(local);
  assert.equal(local.destination, null);
  assert.equal(local.subjectRevision, null);
  assert.equal(local.authority, null);
  assert.equal(local.retainEvidence, true);
  assert.match(spec.notes.join(" "), /does not by itself supply reviewer authority/i);
});

test("review fixture makes contract coverage visible without claiming a green suite", () => {
  const files = new Set(fixture.review_model.changed_files);
  const obligations = Object.fromEntries(fixture.review_model.obligations.map((row) => [row.id, row]));

  for (const path of [
    "schemas/surface-spec.schema.json",
    "src/surface-spec.mjs",
    "test/surface-spec.test.mjs",
    "test/e2e-surface.test.mjs",
    ".github/workflows/ci.yml"
  ]) assert.ok(files.has(path), path);

  for (const path of ["src/router.mjs", "src/render-plan.mjs", "catalog/representations.json"]) {
    assert.equal(files.has(path), false, path);
  }

  assert.deepEqual(obligations["authority-boundary"].implemented_by, [
    "schemas/surface-spec.schema.json",
    "src/surface-spec.mjs"
  ]);
  assert.deepEqual(obligations["authority-boundary"].verified_by_definition, ["test/surface-spec.test.mjs"]);
  assert.ok(obligations["repository-verification"].missing_evidence.includes(
    "executed npm test result for the reviewed subject revision"
  ));
});

test("a changed subject revision requires a fresh review focus rather than label-based carryover", () => {
  const spec = buildSurfaceSpec(fixture.viewSpecs, fixture.surfaceOptions);

  assert.equal(spec.stateContract.selectionIdentity, "semantic-id");
  assert.equal(spec.stateContract.persistAcrossViewPivots, true);
  assert.equal(spec.stateContract.sourceRevisionChange, "clear-semantic-focus");
  assert.match(spec.notes.join(" "), /later commits.*fresh review snapshot/i);
});
