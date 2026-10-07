import { normalizeImplementationBrief } from "./implementation-brief.mjs";
import { savedGraphLayoutsAdapter } from "./implementation-adapters/saved-graph-layouts.mjs";
import { evidenceGapFocusAdapter } from "./implementation-adapters/evidence-gap-focus.mjs";

export const IMPLEMENTATION_PLAN_SCHEMA_VERSION = "implementation-plan/v0";
export const IMPLEMENTATION_RUN_SCHEMA_VERSION = "implementation-run/v0";
export const IMPLEMENTATION_RUNNER_RECEIPT_SCHEMA_VERSION = "implementation-runner-receipt/v0";

const DEFAULT_ADAPTERS = [savedGraphLayoutsAdapter, evidenceGapFocusAdapter];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function requiredText(value, label) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} must be a non-empty string`);
  return value.trim();
}

function ensureAdapters(adapters) {
  if (!Array.isArray(adapters) || adapters.length === 0) throw new Error("at least one implementation adapter is required");
  const ids = new Set();
  for (const adapter of adapters) {
    if (!adapter?.adapterId || !adapter?.featureId || typeof adapter.supports !== "function" || typeof adapter.plan !== "function" || typeof adapter.candidateSpec !== "function") {
      throw new Error("implementation adapters must expose adapterId, featureId, supports(), plan(), and candidateSpec()");
    }
    if (!Array.isArray(adapter.briefSchemaVersions) || adapter.briefSchemaVersions.length === 0) {
      throw new Error(`implementation adapter ${adapter.adapterId} must declare briefSchemaVersions`);
    }
    if (!adapter.runtime?.id || !adapter.runtime?.configFile || !adapter.runtime?.generatedDir) {
      throw new Error(`implementation adapter ${adapter.adapterId} must declare runtime id, configFile, and generatedDir`);
    }
    if (ids.has(adapter.adapterId)) throw new Error(`duplicate implementation adapter: ${adapter.adapterId}`);
    ids.add(adapter.adapterId);
  }
  return adapters;
}

export function routeImplementationBrief(briefInput, options = {}) {
  let brief;
  try {
    brief = normalizeImplementationBrief(clone(briefInput));
  } catch (error) {
    return {
      status: "unsupported",
      featureId: briefInput?.featureId ?? null,
      reasons: [error instanceof Error ? error.message : String(error)]
    };
  }

  const adapters = ensureAdapters(options.adapters ?? DEFAULT_ADAPTERS);
  const featureAdapters = adapters.filter((adapter) => adapter.featureId === brief.featureId);
  if (featureAdapters.length === 0) {
    return {
      status: "unsupported",
      featureId: brief.featureId,
      reasons: [`No implementation adapter is registered for featureId ${brief.featureId}.`]
    };
  }

  const supported = [];
  const rejectedReasons = [];
  for (const adapter of featureAdapters) {
    const result = adapter.supports(brief);
    if (result?.supported) supported.push(adapter);
    else rejectedReasons.push(...(result?.reasons ?? [`${adapter.adapterId} rejected the brief.`]));
  }

  if (supported.length === 0) {
    return {
      status: "unsupported",
      featureId: brief.featureId,
      reasons: rejectedReasons.length ? rejectedReasons : ["No registered adapter accepts this brief."]
    };
  }
  if (supported.length > 1) {
    return {
      status: "ambiguous",
      featureId: brief.featureId,
      reasons: [`More than one implementation adapter accepts this brief: ${supported.map((adapter) => adapter.adapterId).join(", ")}.`]
    };
  }

  return {
    status: "supported",
    featureId: brief.featureId,
    adapterId: supported[0].adapterId,
    adapterVersion: supported[0].version,
    adapter: supported[0],
    brief
  };
}

export function buildImplementationPlan(briefInput, options = {}) {
  const routed = routeImplementationBrief(briefInput, options);
  if (routed.status !== "supported") return routed;

  const adapterPlan = routed.adapter.plan(routed.brief);
  if (adapterPlan.runtimeId !== routed.adapter.runtime.id) {
    throw new Error(`adapter ${routed.adapterId} plan runtimeId does not match declared runtime`);
  }

  return {
    schemaVersion: IMPLEMENTATION_PLAN_SCHEMA_VERSION,
    status: "planned",
    featureId: routed.brief.featureId,
    briefSchemaVersion: routed.brief.sourceSchemaVersion,
    baselineRevision: routed.brief.baselineRevision,
    adapter: {
      id: routed.adapterId,
      version: routed.adapterVersion
    },
    runtime: {
      id: routed.adapter.runtime.id
    },
    intent: {
      outcome: routed.brief.outcome,
      successCriterion: routed.brief.successCriterion
    },
    behaviorChanges: clone(adapterPlan.behaviorChanges),
    fixedConstraints: [...adapterPlan.fixedConstraints],
    generatedFiles: [...adapterPlan.generatedFiles],
    plannedChecks: [...adapterPlan.plannedChecks],
    authority: {
      effect: "generated-candidate-workspace",
      browserRepositoryWrite: false,
      browserPlanningWrite: false,
      browserProductWrite: false,
      automaticMerge: false
    }
  };
}

export function prepareImplementationRun(briefInput, options = {}) {
  const routed = routeImplementationBrief(briefInput, options);
  if (routed.status !== "supported") return routed;

  const plan = buildImplementationPlan(briefInput, options);
  if (plan.status !== "planned") return plan;
  const candidateSpec = routed.adapter.candidateSpec(routed.brief);
  if (candidateSpec.runtimeId !== routed.adapter.runtime.id) {
    throw new Error(`adapter ${routed.adapterId} candidate runtimeId does not match declared runtime`);
  }

  return {
    schemaVersion: IMPLEMENTATION_RUN_SCHEMA_VERSION,
    status: "ready",
    plan,
    candidateSpec,
    normalizedBrief: clone(routed.brief),
    runtime: clone(routed.adapter.runtime)
  };
}

export function describeDryRun(briefInput, options = {}) {
  const plan = buildImplementationPlan(briefInput, options);
  if (plan.status !== "planned") return plan;
  return {
    status: "dry-run",
    plan,
    sideEffects: []
  };
}

export function validateImplementationRunnerReceipt(receipt, plan) {
  if (!receipt || typeof receipt !== "object") throw new Error("runner receipt must be an object");
  if (receipt.schemaVersion !== IMPLEMENTATION_RUNNER_RECEIPT_SCHEMA_VERSION) throw new Error(`unsupported runner receipt schema: ${receipt.schemaVersion}`);
  if (!plan || plan.schemaVersion !== IMPLEMENTATION_PLAN_SCHEMA_VERSION || plan.status !== "planned") throw new Error("a valid implementation plan is required to validate the runner receipt");
  if (requiredText(receipt.featureId, "receipt.featureId") !== plan.featureId) throw new Error("runner receipt featureId does not match the plan");
  if (requiredText(receipt.baselineRevision, "receipt.baselineRevision") !== plan.baselineRevision) throw new Error("runner receipt baselineRevision does not match the plan");
  if (requiredText(receipt.adapter?.id, "receipt.adapter.id") !== plan.adapter.id) throw new Error("runner receipt adapter does not match the plan");
  if (requiredText(receipt.adapter?.version, "receipt.adapter.version") !== plan.adapter.version) throw new Error("runner receipt adapter version does not match the plan");
  if (receipt.runtime?.id && requiredText(receipt.runtime.id, "receipt.runtime.id") !== plan.runtime.id) throw new Error("runner receipt runtime does not match the plan");
  requiredText(receipt.runnerRevision, "receipt.runnerRevision");
  if (String(receipt.ci?.conclusion) !== "success") throw new Error("runner receipt requires successful CI conclusion");
  requiredText(String(receipt.ci?.runId ?? ""), "receipt.ci.runId");
  requiredText(String(receipt.artifact?.id ?? ""), "receipt.artifact.id");
  requiredText(receipt.artifact?.name, "receipt.artifact.name");
  requiredText(receipt.artifact?.sha256, "receipt.artifact.sha256");
  if (!Array.isArray(receipt.executedChecks) || receipt.executedChecks.length === 0) throw new Error("runner receipt requires executedChecks");
  if (!receipt.executedChecks.every((check) => check?.status === "passed" && typeof check?.name === "string" && check.name.trim())) throw new Error("runner receipt may only claim named checks recorded as passed");
  if (receipt.humanReview?.status !== "pending") throw new Error("runner receipt must keep human review pending at this checkpoint");
  requiredText(receipt.statement, "receipt.statement");
  return receipt;
}

export function listImplementationAdapters(options = {}) {
  return ensureAdapters(options.adapters ?? DEFAULT_ADAPTERS).map((adapter) => ({
    adapterId: adapter.adapterId,
    version: adapter.version,
    featureId: adapter.featureId,
    briefSchemaVersions: [...adapter.briefSchemaVersions],
    runtimeId: adapter.runtime.id
  }));
}
