import { normalizeImplementationBrief } from "./implementation-brief.mjs";
import { evidenceGapFocusAdapter } from "./implementation-adapters/evidence-gap-focus.mjs";
import { savedGraphLayoutsAdapter } from "./implementation-adapters/saved-graph-layouts.mjs";

export const IMPLEMENTATION_AUTHORING_DRAFT_VERSION = "implementation-authoring-draft/v0";

const DEFAULT_ADAPTERS = [savedGraphLayoutsAdapter, evidenceGapFocusAdapter];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function text(value, label) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} must be a non-empty string`);
  return value.trim();
}

function adaptersWithAuthoring(adapters = DEFAULT_ADAPTERS) {
  return adapters.filter((adapter) => adapter?.authoring && Array.isArray(adapter.authoring.decisions));
}

function adapterForFeature(featureId, adapters = DEFAULT_ADAPTERS) {
  const matches = adaptersWithAuthoring(adapters).filter((adapter) => adapter.featureId === featureId);
  if (matches.length === 0) throw new Error(`No authoring metadata is registered for featureId ${featureId}`);
  if (matches.length > 1) throw new Error(`More than one authoring adapter is registered for featureId ${featureId}`);
  return matches[0];
}

function normalizeScenario(value, index) {
  if (!value || typeof value !== "object") throw new Error(`acceptance scenario ${index + 1} must be an object`);
  return {
    id: text(value.id ?? `scenario-${index + 1}`, `acceptance scenario ${index + 1} id`),
    title: text(value.title, `acceptance scenario ${index + 1} title`),
    given: text(value.given, `acceptance scenario ${index + 1} given`),
    when: text(value.when, `acceptance scenario ${index + 1} when`),
    then: text(value.then, `acceptance scenario ${index + 1} then`)
  };
}

export function listAuthoringFeatures(options = {}) {
  return adaptersWithAuthoring(options.adapters ?? DEFAULT_ADAPTERS).map((adapter) => ({
    featureId: adapter.featureId,
    adapterId: adapter.adapterId,
    adapterVersion: adapter.version,
    runtimeId: adapter.runtime.id,
    title: adapter.authoring.title,
    summary: adapter.authoring.summary,
    baselineRevision: adapter.authoring.baselineRevision,
    decisions: clone(adapter.authoring.decisions),
    constraints: clone(adapter.authoring.constraints),
    defaultOutcome: adapter.authoring.defaultOutcome,
    defaultSuccessCriterion: adapter.authoring.defaultSuccessCriterion,
    acceptanceScenarios: clone(adapter.authoring.acceptanceScenarios)
  }));
}

export function createAuthoringDraft(featureId, options = {}) {
  const adapter = adapterForFeature(featureId, options.adapters ?? DEFAULT_ADAPTERS);
  return {
    schemaVersion: IMPLEMENTATION_AUTHORING_DRAFT_VERSION,
    featureId: adapter.featureId,
    adapterId: adapter.adapterId,
    baselineRevision: adapter.authoring.baselineRevision,
    outcome: adapter.authoring.defaultOutcome,
    successCriterion: adapter.authoring.defaultSuccessCriterion,
    decisions: adapter.authoring.decisions.map((definition) => ({
      id: definition.id,
      value: definition.defaultValue
    })),
    acceptanceScenarios: clone(adapter.authoring.acceptanceScenarios),
    authority: "local-draft-only"
  };
}

export function normalizeAuthoringDraft(input, options = {}) {
  if (!input || typeof input !== "object") throw new Error("authoring draft must be an object");
  if (input.schemaVersion !== IMPLEMENTATION_AUTHORING_DRAFT_VERSION) throw new Error(`unsupported authoring draft schema: ${input.schemaVersion}`);
  const adapter = adapterForFeature(text(input.featureId, "featureId"), options.adapters ?? DEFAULT_ADAPTERS);
  if (input.adapterId && input.adapterId !== adapter.adapterId) throw new Error("authoring draft adapterId does not match feature adapter");
  if (input.baselineRevision !== adapter.authoring.baselineRevision) throw new Error("authoring draft baselineRevision does not match the adapter authoring baseline");

  const decisionMap = new Map((input.decisions ?? []).map((item) => [item.id, item.value]));
  const decisions = adapter.authoring.decisions.map((definition) => {
    const value = decisionMap.has(definition.id) ? decisionMap.get(definition.id) : definition.defaultValue;
    const allowed = definition.options.map((option) => option.value);
    if (!allowed.includes(value)) throw new Error(`decision ${definition.id} has unsupported value: ${value}`);
    return { id: definition.id, value };
  });
  if ((input.decisions ?? []).some((item) => !adapter.authoring.decisions.some((definition) => definition.id === item.id))) {
    throw new Error("authoring draft contains an unknown feature decision");
  }

  const scenarios = (input.acceptanceScenarios ?? []).map(normalizeScenario);
  if (scenarios.length === 0) throw new Error("at least one acceptance scenario is required");
  const ids = new Set();
  for (const scenario of scenarios) {
    if (ids.has(scenario.id)) throw new Error(`duplicate acceptance scenario id: ${scenario.id}`);
    ids.add(scenario.id);
  }

  return {
    schemaVersion: IMPLEMENTATION_AUTHORING_DRAFT_VERSION,
    featureId: adapter.featureId,
    adapterId: adapter.adapterId,
    baselineRevision: adapter.authoring.baselineRevision,
    outcome: text(input.outcome, "outcome"),
    successCriterion: text(input.successCriterion, "successCriterion"),
    decisions,
    acceptanceScenarios: scenarios,
    authority: "local-draft-only"
  };
}

export function buildImplementationBriefV1(draftInput, options = {}) {
  const draft = normalizeAuthoringDraft(draftInput, options);
  const adapter = adapterForFeature(draft.featureId, options.adapters ?? DEFAULT_ADAPTERS);
  const decisionDefinitions = new Map(adapter.authoring.decisions.map((definition) => [definition.id, definition]));

  const brief = {
    schemaVersion: "implementation-brief/v1",
    featureId: draft.featureId,
    baselineRevision: draft.baselineRevision,
    outcome: draft.outcome,
    successCriterion: draft.successCriterion,
    decisions: draft.decisions.map((item) => ({
      id: item.id,
      label: decisionDefinitions.get(item.id)?.label ?? item.id,
      value: item.value
    })),
    constraints: adapter.authoring.constraints.map((constraint) => ({
      id: constraint.id,
      label: constraint.label,
      value: constraint.value
    })),
    acceptanceScenarios: clone(draft.acceptanceScenarios),
    implementationImpact: [],
    verification: {
      status: "planned-not-executed",
      statement: "Acceptance scenarios are planned checks. Exporting this brief does not mean implementation exists or that any check ran."
    },
    authority: {
      effect: "handoff-only",
      repositoryWrite: false,
      planningWrite: false,
      productWrite: false,
      nextOwner: "authorized implementation workflow"
    }
  };

  normalizeImplementationBrief(brief);
  const support = adapter.supports(normalizeImplementationBrief(brief));
  if (!support.supported) throw new Error(`generated brief is not supported by ${adapter.adapterId}: ${support.reasons.join("; ")}`);
  return brief;
}

export function updateDraftDecision(draftInput, decisionId, value, options = {}) {
  const draft = normalizeAuthoringDraft(draftInput, options);
  const next = clone(draft);
  const target = next.decisions.find((item) => item.id === decisionId);
  if (!target) throw new Error(`unknown decision: ${decisionId}`);
  target.value = value;
  return normalizeAuthoringDraft(next, options);
}
