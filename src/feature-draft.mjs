export const FEATURE_DRAFT_SCHEMA_VERSION = "feature-draft/v0";
export const IMPLEMENTATION_BRIEF_SCHEMA_VERSION = "implementation-brief/v0";

const ALLOWED_REMEMBER_MODES = new Set(["automatic-after-drag", "explicit-save"]);
const ALLOWED_RECEIPT_MODES = new Set(["visible-after-save", "quiet"]);
const ALLOWED_RESET_MODES = new Set(["immediate-reset", "confirm-before-reset"]);

function text(value, label) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} must be a non-empty string`);
  return value.trim();
}

function assertEnum(value, allowed, label) {
  if (!allowed.has(value)) throw new Error(`${label} is not supported: ${value}`);
  return value;
}

function cloneScenario(scenario) {
  return {
    id: scenario.id,
    title: scenario.title,
    given: scenario.given,
    when: scenario.when,
    then: scenario.then
  };
}

function normalizeScenario(scenario, index) {
  if (!scenario || typeof scenario !== "object") throw new Error(`scenario ${index + 1} must be an object`);
  return {
    id: text(scenario.id ?? `scenario-${index + 1}`, `scenario ${index + 1} id`),
    title: text(scenario.title, `scenario ${index + 1} title`),
    given: text(scenario.given, `scenario ${index + 1} given`),
    when: text(scenario.when, `scenario ${index + 1} when`),
    then: text(scenario.then, `scenario ${index + 1} then`)
  };
}

export function createSavedLayoutsDraft(options = {}) {
  const baselineRevision = text(options.baselineRevision, "baselineRevision");
  return {
    schemaVersion: FEATURE_DRAFT_SCHEMA_VERSION,
    featureId: "saved-graph-layouts",
    baselineRevision,
    outcome: "When I rearrange a system diagram so it makes sense to me, remember that arrangement on this browser when I come back — without changing the actual system architecture.",
    successCriterion: "After moving a box, reopening the same exact software revision restores that arrangement; Reset positions returns to deterministic defaults.",
    decisions: {
      rememberMode: "automatic-after-drag",
      saveReceipt: "visible-after-save",
      resetMode: "immediate-reset",
      storageScope: "browser-local",
      revisionPolicy: "exact-revision-only",
      recordContents: "node-id-and-position-only",
      storageFailure: "continue-without-persistence"
    },
    acceptanceScenarios: [
      {
        id: "restore-same-revision",
        title: "Restore a moved box",
        given: "I moved a box in a diagram and the browser can store local data",
        when: "I reopen the same workbench for the same exact software revision",
        then: "the box returns to the saved position"
      },
      {
        id: "reset-layout",
        title: "Reset to the default arrangement",
        given: "a saved arrangement exists",
        when: "I choose Reset positions",
        then: "the saved arrangement is deleted and deterministic default positions return"
      },
      {
        id: "reject-stale-revision",
        title: "Do not reuse a stale layout",
        given: "a layout was saved for an older software revision",
        when: "I open a different revision",
        then: "the older layout is not silently applied"
      }
    ],
    metadata: {
      createdFrom: "review-workbench-v1.3",
      authority: "local-draft-only"
    }
  };
}

export function normalizeFeatureDraft(input) {
  if (!input || typeof input !== "object") throw new Error("feature draft must be an object");
  if (input.schemaVersion !== FEATURE_DRAFT_SCHEMA_VERSION) throw new Error(`unsupported feature draft schema: ${input.schemaVersion}`);

  const scenarios = (input.acceptanceScenarios ?? []).map(normalizeScenario);
  if (!scenarios.length) throw new Error("at least one acceptance scenario is required");
  const scenarioIds = new Set();
  for (const scenario of scenarios) {
    if (scenarioIds.has(scenario.id)) throw new Error(`duplicate acceptance scenario id: ${scenario.id}`);
    scenarioIds.add(scenario.id);
  }

  return {
    schemaVersion: FEATURE_DRAFT_SCHEMA_VERSION,
    featureId: text(input.featureId, "featureId"),
    baselineRevision: text(input.baselineRevision, "baselineRevision"),
    outcome: text(input.outcome, "outcome"),
    successCriterion: text(input.successCriterion, "successCriterion"),
    decisions: {
      rememberMode: assertEnum(input.decisions?.rememberMode, ALLOWED_REMEMBER_MODES, "rememberMode"),
      saveReceipt: assertEnum(input.decisions?.saveReceipt, ALLOWED_RECEIPT_MODES, "saveReceipt"),
      resetMode: assertEnum(input.decisions?.resetMode, ALLOWED_RESET_MODES, "resetMode"),
      storageScope: input.decisions?.storageScope === "browser-local" ? "browser-local" : (() => { throw new Error("storageScope must remain browser-local in Feature Studio v0"); })(),
      revisionPolicy: input.decisions?.revisionPolicy === "exact-revision-only" ? "exact-revision-only" : (() => { throw new Error("revisionPolicy must remain exact-revision-only in Feature Studio v0"); })(),
      recordContents: input.decisions?.recordContents === "node-id-and-position-only" ? "node-id-and-position-only" : (() => { throw new Error("recordContents must remain node-id-and-position-only"); })(),
      storageFailure: input.decisions?.storageFailure === "continue-without-persistence" ? "continue-without-persistence" : (() => { throw new Error("storageFailure must remain continue-without-persistence"); })()
    },
    acceptanceScenarios: scenarios,
    metadata: {
      createdFrom: text(input.metadata?.createdFrom ?? "feature-studio-v0", "metadata.createdFrom"),
      authority: "local-draft-only"
    }
  };
}

export function deriveImplementationImpact(draftInput) {
  const draft = normalizeFeatureDraft(draftInput);
  const areas = new Map();
  const add = (id, label, files, reasons) => {
    if (!areas.has(id)) areas.set(id, { id, label, files: [...files], reasons: [] });
    const item = areas.get(id);
    for (const reason of reasons) if (!item.reasons.includes(reason)) item.reasons.push(reason);
  };

  add("persistence-contract", "Layout persistence contract", ["src/layout-persistence.mjs", "test/layout-persistence.test.mjs"], ["Every draft remains revision-bound, positions-only, and browser-local."]);
  add("graph-integration", "Graph interaction", ["review-workbench-v13/src/main.jsx"], [draft.decisions.rememberMode === "automatic-after-drag" ? "Moving a node triggers save automatically." : "The graph needs an explicit Save arrangement action and must not save on drag."]);
  add("product-feedback", "Product feedback and copy", ["review-workbench-v13/src/main.jsx", "review-workbench-v13/src/styles.css"], [draft.decisions.saveReceipt === "visible-after-save" ? "Show a save receipt after persistence succeeds." : "Keep successful saving quiet while still exposing failure honestly."]);
  add("reset-behavior", "Reset behavior", ["review-workbench-v13/src/main.jsx", "test/review-workbench-v13.test.mjs"], [draft.decisions.resetMode === "immediate-reset" ? "Reset positions clears the saved record immediately." : "Reset positions requires a confirmation step before clearing local state."]);
  add("verification", "Verification", ["test/layout-persistence.test.mjs", "test/review-workbench-v13.test.mjs"], draft.acceptanceScenarios.map((scenario) => `Planned check: ${scenario.title}`));
  add("release", "Release artifact", [".github/workflows/ci.yml", "package.json"], ["The implementation must build a self-contained artifact and retain exact CI evidence."]);

  return [...areas.values()];
}

export function buildImplementationBrief(draftInput, options = {}) {
  const draft = normalizeFeatureDraft(draftInput);
  const impact = deriveImplementationImpact(draft);
  return {
    schemaVersion: IMPLEMENTATION_BRIEF_SCHEMA_VERSION,
    featureId: draft.featureId,
    baselineRevision: draft.baselineRevision,
    outcome: draft.outcome,
    successCriterion: draft.successCriterion,
    decisions: { ...draft.decisions },
    acceptanceScenarios: draft.acceptanceScenarios.map(cloneScenario),
    implementationImpact: impact,
    verification: {
      status: "planned-not-executed",
      statement: "Acceptance scenarios in this brief are planned checks. Their presence is not evidence that they ran or passed."
    },
    authority: {
      effect: "handoff-only",
      repositoryWrite: false,
      planningWrite: false,
      productWrite: false,
      nextOwner: options.nextOwner ?? "authorized implementation workflow"
    }
  };
}

export function featureDraftStorageKey({ featureId, baselineRevision }) {
  return `rr:feature-draft:v0:${encodeURIComponent(text(featureId, "featureId"))}:${encodeURIComponent(text(baselineRevision, "baselineRevision"))}`;
}

export function saveFeatureDraft(storage, draftInput) {
  const draft = normalizeFeatureDraft(draftInput);
  if (!storage || typeof storage.setItem !== "function") return { status: "unavailable", draft };
  try {
    storage.setItem(featureDraftStorageKey(draft), JSON.stringify(draft));
    return { status: "saved", draft };
  } catch (error) {
    return { status: "unavailable", draft, error: error instanceof Error ? error.message : String(error) };
  }
}

export function loadFeatureDraft(storage, baselineDraftInput) {
  const baseline = normalizeFeatureDraft(baselineDraftInput);
  if (!storage || typeof storage.getItem !== "function") return { status: "unavailable", draft: baseline };
  try {
    const raw = storage.getItem(featureDraftStorageKey(baseline));
    if (!raw) return { status: "empty", draft: baseline };
    const parsed = normalizeFeatureDraft(JSON.parse(raw));
    if (parsed.featureId !== baseline.featureId || parsed.baselineRevision !== baseline.baselineRevision) return { status: "stale", draft: baseline };
    return { status: "restored", draft: parsed };
  } catch (error) {
    return { status: "invalid", draft: baseline, error: error instanceof Error ? error.message : String(error) };
  }
}

export function clearFeatureDraft(storage, identity) {
  if (!storage || typeof storage.removeItem !== "function") return { status: "unavailable" };
  try {
    storage.removeItem(featureDraftStorageKey(identity));
    return { status: "cleared" };
  } catch (error) {
    return { status: "unavailable", error: error instanceof Error ? error.message : String(error) };
  }
}