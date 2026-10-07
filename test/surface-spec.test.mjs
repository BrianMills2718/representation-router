import assert from "node:assert/strict";
import { test } from "node:test";
import { buildSurfaceSpec } from "../src/surface-spec.mjs";

const dodafViews = [
  {
    id: "ov-2",
    concern: "Who produces each represented operational resource and who consumes it?",
    viewpoint: { stakeholder: "analyst" },
    successCriteria: ["The analyst can trace one resource handoff to exact evidence."]
  },
  {
    id: "ov-3",
    concern: "Which represented operational resource exchanges exist?",
    viewpoint: { stakeholder: "analyst" }
  }
];

test("builds read-only analytical surface with stable semantic focus", () => {
  const spec = buildSurfaceSpec(dodafViews, {
    id: "dodaf-analysis",
    lifecycleStages: ["analysis", "product-use"],
    interfacePatterns: ["primary-detail-inspector", "dashboard-progressive-disclosure"],
    sourceBindings: [{
      sourceId: "governed-corpus",
      owner: "dodaf",
      revision: "abc123",
      role: "semantic-authority"
    }],
    actions: [{ id: "inspect-evidence", label: "Inspect evidence", kind: "inspect", effect: "read-only" }]
  });
  assert.equal(spec.views[0].role, "primary");
  assert.equal(spec.views[1].role, "complementary");
  assert.equal(spec.stateContract.selectionIdentity, "semantic-id");
  assert.equal(spec.stateContract.persistAcrossViewPivots, true);
  assert.equal(spec.stateContract.whenSelectionNotRepresented, "retain-and-mark-not-represented");
  assert.equal(spec.stateContract.sourceRevisionChange, "clear-semantic-focus");
  assert.equal(spec.actions[0].destination, null);
});

test("builds revision-bound Company Planning review action", () => {
  const spec = buildSurfaceSpec([{
    id: "work-review",
    concern: "Does the submitted revision satisfy the accepted outcome?",
    viewpoint: { stakeholder: "contributor" },
    successCriteria: ["The contributor can approve or request a concrete revision against exact evidence."]
  }], {
    lifecycleStages: ["review"],
    interfacePatterns: ["review-before-completion", "requirement-to-evidence-traceability"],
    sourceBindings: [
      { sourceId: "work-unit", owner: "company-planning", revision: "WU-7@4", role: "workflow-authority" },
      { sourceId: "evidence", owner: "implementation", revision: "deadbeef", role: "evidence" }
    ],
    actions: [{
      id: "request-changes",
      label: "Request changes",
      kind: "decide",
      effect: "authoritative-write",
      destination: { owner: "company-planning", target: "review-decision/WU-7", targetRevision: "WU-7@4" },
      subjectRevision: "deadbeef",
      authority: { actor: "contributor", basis: "review authority", scope: "WU-7@4 completion disposition" },
      staleSubmission: "reject",
      retainEvidence: true
    }]
  });
  assert.equal(spec.actions[0].effect, "authoritative-write");
  assert.equal(spec.actions[0].staleSubmission, "reject");
  assert.equal(spec.actions[0].retainEvidence, true);
});

test("rejects authoritative writes without revision and authority contract", () => {
  assert.throws(() => buildSurfaceSpec([{
    id: "review",
    concern: "Review work",
    viewpoint: { stakeholder: "reviewer" },
    successCriteria: ["A disposition is bound to the reviewed revision."]
  }], {
    sourceBindings: [{ sourceId: "work", owner: "planning", revision: "r1", role: "workflow-authority" }],
    actions: [{
      id: "approve",
      label: "Approve",
      kind: "decide",
      effect: "authoritative-write",
      destination: { owner: "planning", target: "decision", targetRevision: "r1" }
    }]
  }), /subjectRevision|authority/);
});

test("rejects primary view ids outside the supplied view set", () => {
  assert.throws(() => buildSurfaceSpec(dodafViews, {
    primaryViewId: "sv-2",
    sourceBindings: [{ sourceId: "corpus", owner: "dodaf", revision: "r1", role: "semantic-authority" }]
  }), /primaryViewId/);
});

test("rejects values outside SurfaceSpec schema vocabularies", () => {
  assert.throws(() => buildSurfaceSpec(dodafViews, {
    sourceBindings: [{ sourceId: "corpus", owner: "dodaf", revision: "r1", role: "truth-store" }]
  }), /unsupported value/);

  assert.throws(() => buildSurfaceSpec(dodafViews, {
    sourceBindings: [{ sourceId: "corpus", owner: "dodaf", revision: "r1", role: "semantic-authority" }],
    viewRoles: { "ov-2": "hero" }
  }), /unsupported value/);
});

test("rejects ambiguous duplicate source and action ids", () => {
  assert.throws(() => buildSurfaceSpec(dodafViews, {
    sourceBindings: [
      { sourceId: "corpus", owner: "dodaf", revision: "r1", role: "semantic-authority" },
      { sourceId: "corpus", owner: "dodaf", revision: "r2", role: "context" }
    ]
  }), /sourceBindings ids must be unique/);

  assert.throws(() => buildSurfaceSpec(dodafViews, {
    sourceBindings: [{ sourceId: "corpus", owner: "dodaf", revision: "r1", role: "semantic-authority" }],
    actions: [
      { id: "inspect", label: "Inspect one", kind: "inspect", effect: "read-only" },
      { id: "inspect", label: "Inspect two", kind: "inspect", effect: "read-only" }
    ]
  }), /actions ids must be unique/);
});

test("rejects view-role mappings for unknown ViewSpecs", () => {
  assert.throws(() => buildSurfaceSpec(dodafViews, {
    sourceBindings: [{ sourceId: "corpus", owner: "dodaf", revision: "r1", role: "semantic-authority" }],
    viewRoles: { "sv-2": "supporting" }
  }), /unknown ViewSpec/);
});

test("surface-local actions cannot smuggle external write authority", () => {
  assert.throws(() => buildSurfaceSpec(dodafViews, {
    sourceBindings: [{ sourceId: "corpus", owner: "dodaf", revision: "r1", role: "semantic-authority" }],
    actions: [{
      id: "local-note",
      label: "Save local note",
      kind: "annotate",
      effect: "surface-local",
      destination: { owner: "external-system", target: "notes/1", targetRevision: "r1" },
      subjectRevision: "r1",
      authority: { actor: "reviewer", basis: "repository access", scope: "notes" }
    }]
  }), /surface-local action cannot declare/);

  const spec = buildSurfaceSpec(dodafViews, {
    sourceBindings: [{ sourceId: "corpus", owner: "dodaf", revision: "r1", role: "semantic-authority" }],
    actions: [{
      id: "local-note",
      label: "Save local note",
      kind: "annotate",
      effect: "surface-local",
      retainEvidence: true
    }]
  });
  assert.equal(spec.actions[0].destination, null);
  assert.equal(spec.actions[0].authority, null);
  assert.equal(spec.actions[0].retainEvidence, true);
});

test("read-only actions reject write-like stale/evidence inputs instead of silently normalizing them", () => {
  const base = {
    sourceBindings: [{ sourceId: "corpus", owner: "dodaf", revision: "r1", role: "semantic-authority" }]
  };
  assert.throws(() => buildSurfaceSpec(dodafViews, {
    ...base,
    actions: [{
      id: "inspect",
      label: "Inspect",
      kind: "inspect",
      effect: "read-only",
      staleSubmission: "reject"
    }]
  }), /read-only action must use staleSubmission=not-applicable/);

  assert.throws(() => buildSurfaceSpec(dodafViews, {
    ...base,
    actions: [{
      id: "inspect",
      label: "Inspect",
      kind: "inspect",
      effect: "read-only",
      retainEvidence: true
    }]
  }), /read-only action requires retainEvidence=false/);
});
