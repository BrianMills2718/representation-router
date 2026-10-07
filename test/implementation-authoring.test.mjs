import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildImplementationBriefV1,
  createAuthoringDraft,
  listAuthoringFeatures,
  updateDraftDecision
} from "../src/implementation-authoring.mjs";
import { routeImplementationBrief } from "../src/implementation-runner.mjs";

test("generic authoring registry exposes both current implementation feature families", () => {
  const features = listAuthoringFeatures();
  assert.deepEqual(features.map((item) => item.featureId), ["saved-graph-layouts", "evidence-gap-focus"]);
  for (const feature of features) {
    assert.ok(feature.decisions.length >= 3);
    assert.ok(feature.constraints.length >= 4);
    assert.ok(feature.acceptanceScenarios.length >= 3);
  }
});

test("Saved Graph Layouts authoring produces implementation-brief/v1 accepted by the existing runner", () => {
  let draft = createAuthoringDraft("saved-graph-layouts");
  draft = updateDraftDecision(draft, "remember-mode", "explicit-save");
  draft = updateDraftDecision(draft, "reset-mode", "confirm-before-reset");
  const brief = buildImplementationBriefV1(draft);
  assert.equal(brief.schemaVersion, "implementation-brief/v1");
  assert.equal(brief.featureId, "saved-graph-layouts");
  assert.equal(brief.decisions.find((item) => item.id === "remember-mode").value, "explicit-save");
  assert.equal(brief.constraints.find((item) => item.id === "storage-scope").value, "browser-local");
  const routed = routeImplementationBrief(brief);
  assert.equal(routed.status, "supported");
  assert.equal(routed.adapterId, "saved-graph-layouts/v0");
});

test("Evidence Gap Focus authoring produces implementation-brief/v1 accepted by the other runner adapter", () => {
  let draft = createAuthoringDraft("evidence-gap-focus");
  draft = updateDraftDecision(draft, "grouping", "flat-list");
  const brief = buildImplementationBriefV1(draft);
  assert.equal(brief.featureId, "evidence-gap-focus");
  assert.equal(brief.decisions.find((item) => item.id === "grouping").value, "flat-list");
  assert.equal(brief.constraints.find((item) => item.id === "source-authority").value, "read-only-source-owned");
  const routed = routeImplementationBrief(brief);
  assert.equal(routed.status, "supported");
  assert.equal(routed.adapterId, "evidence-gap-focus/v0");
});

test("generic authoring rejects unknown decisions instead of leaking feature branches into the core", () => {
  const draft = createAuthoringDraft("evidence-gap-focus");
  draft.decisions.push({ id: "remember-mode", value: "explicit-save" });
  assert.throws(() => buildImplementationBriefV1(draft), /unknown feature decision/);
});

test("exported briefs remain handoff-only and planned-not-executed", () => {
  for (const featureId of ["saved-graph-layouts", "evidence-gap-focus"]) {
    const brief = buildImplementationBriefV1(createAuthoringDraft(featureId));
    assert.equal(brief.verification.status, "planned-not-executed");
    assert.equal(brief.authority.effect, "handoff-only");
    assert.equal(brief.authority.repositoryWrite, false);
    assert.equal(brief.authority.productWrite, false);
  }
});
