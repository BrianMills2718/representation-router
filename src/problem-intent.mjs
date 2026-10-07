export const PROBLEM_INTENT_SCHEMA_VERSION = "problem-intent/v0";

function text(value, label) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} must be a non-empty string`);
  return value.trim();
}

function normalizeStringList(values, label) {
  if (!Array.isArray(values)) throw new Error(`${label} must be an array`);
  return values.map((value, index) => text(value, `${label} ${index + 1}`));
}

function normalizeSignals(values = []) {
  if (!Array.isArray(values)) throw new Error("signals must be an array");
  const ids = new Set();
  return values.map((signal, index) => {
    if (!signal || typeof signal !== "object") throw new Error(`signal ${index + 1} must be an object`);
    const id = text(signal.id, `signal ${index + 1} id`);
    if (ids.has(id)) throw new Error(`duplicate problem signal id: ${id}`);
    ids.add(id);
    if (!["string", "number", "boolean"].includes(typeof signal.value)) throw new Error(`signal ${id} value must be scalar`);
    return { id, value: signal.value };
  });
}

export function normalizeProblemIntent(input) {
  if (!input || typeof input !== "object") throw new Error("problem intent must be an object");
  if (input.schemaVersion !== PROBLEM_INTENT_SCHEMA_VERSION) throw new Error(`unsupported problem intent schema: ${input.schemaVersion}`);
  if (input.authority?.effect !== "handoff-only") throw new Error("problem intent authority must remain handoff-only");
  if (input.authority?.repositoryWrite !== false || input.authority?.planningWrite !== false || input.authority?.productWrite !== false) {
    throw new Error("problem intent must not grant repository, planning, or product write authority");
  }
  const reproductionSteps = normalizeStringList(input.reproductionSteps ?? [], "reproductionSteps");
  if (reproductionSteps.length === 0) throw new Error("at least one reproduction step is required");
  return {
    schemaVersion: PROBLEM_INTENT_SCHEMA_VERSION,
    id: text(input.id, "id"),
    baselineRevision: text(input.baselineRevision, "baselineRevision"),
    summary: text(input.summary, "summary"),
    observedBehavior: text(input.observedBehavior, "observedBehavior"),
    expectedBehavior: text(input.expectedBehavior, "expectedBehavior"),
    affectedCapability: text(input.affectedCapability, "affectedCapability"),
    reproductionSteps,
    evidence: normalizeStringList(input.evidence ?? [], "evidence"),
    signals: normalizeSignals(input.signals ?? []),
    authority: {
      effect: "handoff-only",
      repositoryWrite: false,
      planningWrite: false,
      productWrite: false,
      nextOwner: text(input.authority?.nextOwner ?? "authorized diagnostic workflow", "authority.nextOwner")
    }
  };
}

export function problemSignal(intent, id) {
  return intent?.signals?.find((signal) => signal.id === id)?.value;
}
