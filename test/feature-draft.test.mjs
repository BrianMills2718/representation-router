import assert from "node:assert/strict";
import { test } from "node:test";
import {
  FEATURE_DRAFT_SCHEMA_VERSION,
  IMPLEMENTATION_BRIEF_SCHEMA_VERSION,
  buildImplementationBrief,
  clearFeatureDraft,
  createSavedLayoutsDraft,
  deriveImplementationImpact,
  featureDraftStorageKey,
  loadFeatureDraft,
  normalizeFeatureDraft,
  saveFeatureDraft
} from "../src/feature-draft.mjs";

const baselineRevision = "5e2845c823a8bdf951ee293a940d666549d4009b";

function memoryStorage() {
  const map = new Map();
  return {
    getItem(key) { return map.has(key) ? map.get(key) : null; },
    setItem(key, value) { map.set(key, String(value)); },
    removeItem(key) { map.delete(key); },
    raw: map
  };
}

test("saved-layout feature draft starts from one schema-valid engineering intent object", () => {
  const draft = createSavedLayoutsDraft({ baselineRevision });
  const normalized = normalizeFeatureDraft(draft);
  assert.equal(normalized.schemaVersion, FEATURE_DRAFT_SCHEMA_VERSION);
  assert.equal(normalized.baselineRevision, baselineRevision);
  assert.equal(normalized.decisions.storageScope, "browser-local");
  assert.equal(normalized.decisions.recordContents, "node-id-and-position-only");
  assert.ok(normalized.acceptanceScenarios.length >= 3);
});

test("feature draft persistence is scoped to feature and exact baseline revision", () => {
  const a = createSavedLayoutsDraft({ baselineRevision });
  const b = createSavedLayoutsDraft({ baselineRevision: "other-revision" });
  assert.notEqual(featureDraftStorageKey(a), featureDraftStorageKey(b));

  const storage = memoryStorage();
  a.outcome = "Remember my arrangement automatically.";
  assert.equal(saveFeatureDraft(storage, a).status, "saved");
  const restored = loadFeatureDraft(storage, createSavedLayoutsDraft({ baselineRevision }));
  assert.equal(restored.status, "restored");
  assert.equal(restored.draft.outcome, "Remember my arrangement automatically.");

  const other = loadFeatureDraft(storage, b);
  assert.equal(other.status, "empty");
  assert.notEqual(other.draft.baselineRevision, restored.draft.baselineRevision);
});

test("unsupported authority-expanding decisions are rejected", () => {
  const draft = createSavedLayoutsDraft({ baselineRevision });
  draft.decisions.storageScope = "cloud-account";
  assert.throws(() => normalizeFeatureDraft(draft), /browser-local/);

  const draft2 = createSavedLayoutsDraft({ baselineRevision });
  draft2.decisions.recordContents = "entire-semantic-graph";
  assert.throws(() => normalizeFeatureDraft(draft2), /node-id-and-position-only/);
});

test("implementation impact changes when meaningful authoring decisions change", () => {
  const automatic = createSavedLayoutsDraft({ baselineRevision });
  const manual = createSavedLayoutsDraft({ baselineRevision });
  manual.decisions.rememberMode = "explicit-save";
  manual.decisions.resetMode = "confirm-before-reset";

  const autoImpact = deriveImplementationImpact(automatic);
  const manualImpact = deriveImplementationImpact(manual);
  const autoGraph = autoImpact.find((item) => item.id === "graph-integration");
  const manualGraph = manualImpact.find((item) => item.id === "graph-integration");
  assert.match(autoGraph.reasons.join(" "), /automatically/);
  assert.match(manualGraph.reasons.join(" "), /explicit Save arrangement/);
  assert.match(manualImpact.find((item) => item.id === "reset-behavior").reasons.join(" "), /confirmation/);
});

test("implementation brief preserves author intent and labels verification as planned, not executed", () => {
  const draft = createSavedLayoutsDraft({ baselineRevision });
  draft.outcome = "Remember my chosen system-map layout.";
  draft.acceptanceScenarios.push({
    id: "manual-save-choice",
    title: "Save only when asked",
    given: "explicit save mode is selected",
    when: "I drag a box but do not choose Save arrangement",
    then: "the previous saved arrangement remains unchanged"
  });
  draft.decisions.rememberMode = "explicit-save";

  const brief = buildImplementationBrief(draft);
  assert.equal(brief.schemaVersion, IMPLEMENTATION_BRIEF_SCHEMA_VERSION);
  assert.equal(brief.baselineRevision, baselineRevision);
  assert.equal(brief.outcome, draft.outcome);
  assert.equal(brief.decisions.rememberMode, "explicit-save");
  assert.equal(brief.verification.status, "planned-not-executed");
  assert.match(brief.verification.statement, /not evidence that they ran or passed/i);
  assert.equal(brief.authority.repositoryWrite, false);
  assert.equal(brief.authority.planningWrite, false);
  assert.equal(brief.authority.productWrite, false);
});

test("draft clear removes only the scoped local draft", () => {
  const storage = memoryStorage();
  const draft = createSavedLayoutsDraft({ baselineRevision });
  saveFeatureDraft(storage, draft);
  const key = featureDraftStorageKey(draft);
  assert.ok(storage.raw.has(key));
  assert.equal(clearFeatureDraft(storage, draft).status, "cleared");
  assert.equal(storage.raw.has(key), false);
});

test("storage failure degrades to a usable local draft", () => {
  const draft = createSavedLayoutsDraft({ baselineRevision });
  const broken = {
    getItem() { throw new Error("blocked"); },
    setItem() { throw new Error("blocked"); },
    removeItem() { throw new Error("blocked"); }
  };
  assert.equal(loadFeatureDraft(broken, draft).status, "invalid");
  assert.equal(saveFeatureDraft(broken, draft).status, "unavailable");
  assert.equal(clearFeatureDraft(broken, draft).status, "unavailable");
});
