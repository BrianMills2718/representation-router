import { validateImplementationBrief as validateLegacyImplementationBrief } from "./implementation-loop.mjs";

export const IMPLEMENTATION_BRIEF_V0 = "implementation-brief/v0";
export const IMPLEMENTATION_BRIEF_V1 = "implementation-brief/v1";
export const CANONICAL_IMPLEMENTATION_BRIEF = "implementation-brief/canonical-v0";

function text(value, label) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} must be a non-empty string`);
  return value.trim();
}

function scalar(value, label) {
  if (!["string", "number", "boolean"].includes(typeof value)) throw new Error(`${label} must be a string, number, or boolean`);
  if (typeof value === "string" && !value.trim()) throw new Error(`${label} must not be empty`);
  if (typeof value === "number" && !Number.isFinite(value)) throw new Error(`${label} must be finite`);
  return value;
}

function scenario(value, index) {
  if (!value || typeof value !== "object") throw new Error(`acceptance scenario ${index + 1} must be an object`);
  return {
    id: text(value.id ?? `scenario-${index + 1}`, `acceptance scenario ${index + 1} id`),
    title: text(value.title, `acceptance scenario ${index + 1} title`),
    given: text(value.given, `acceptance scenario ${index + 1} given`),
    when: text(value.when, `acceptance scenario ${index + 1} when`),
    then: text(value.then, `acceptance scenario ${index + 1} then`)
  };
}

function uniqueRecords(values, label) {
  if (!Array.isArray(values)) throw new Error(`${label} must be an array`);
  const ids = new Set();
  return values.map((item, index) => {
    if (!item || typeof item !== "object") throw new Error(`${label} ${index + 1} must be an object`);
    const id = text(item.id, `${label} ${index + 1} id`);
    if (ids.has(id)) throw new Error(`duplicate ${label} id: ${id}`);
    ids.add(id);
    return {
      id,
      label: text(item.label ?? id, `${label} ${index + 1} label`),
      value: scalar(item.value, `${label} ${id} value`)
    };
  });
}

function authority(value) {
  if (!value || typeof value !== "object") throw new Error("authority is required");
  if (value.effect !== "handoff-only") throw new Error("authority.effect must remain handoff-only");
  if (value.repositoryWrite !== false || value.planningWrite !== false || value.productWrite !== false) {
    throw new Error("implementation briefs must not grant repository, planning, or product write authority");
  }
  return {
    effect: "handoff-only",
    repositoryWrite: false,
    planningWrite: false,
    productWrite: false,
    nextOwner: text(value.nextOwner ?? "authorized implementation workflow", "authority.nextOwner")
  };
}

function verification(value) {
  if (!value || typeof value !== "object" || value.status !== "planned-not-executed") {
    throw new Error("implementation brief verification must remain planned-not-executed before implementation");
  }
  return {
    status: "planned-not-executed",
    statement: text(value.statement ?? "Planned checks are not evidence that they ran or passed.", "verification.statement")
  };
}

function normalizedScenarios(values) {
  if (!Array.isArray(values) || values.length === 0) throw new Error("at least one acceptance scenario is required");
  const result = values.map(scenario);
  const ids = new Set();
  for (const item of result) {
    if (ids.has(item.id)) throw new Error(`duplicate acceptance scenario id: ${item.id}`);
    ids.add(item.id);
  }
  return result;
}

function normalizeV0(input) {
  const legacy = validateLegacyImplementationBrief(JSON.parse(JSON.stringify(input)));
  return {
    schemaVersion: CANONICAL_IMPLEMENTATION_BRIEF,
    sourceSchemaVersion: IMPLEMENTATION_BRIEF_V0,
    featureId: legacy.featureId,
    baselineRevision: legacy.baselineRevision,
    outcome: legacy.outcome,
    successCriterion: legacy.successCriterion,
    decisions: [
      { id: "remember-mode", label: "Save behavior", value: legacy.decisions.rememberMode },
      { id: "save-receipt", label: "Save feedback", value: legacy.decisions.saveReceipt },
      { id: "reset-mode", label: "Reset behavior", value: legacy.decisions.resetMode }
    ],
    constraints: [
      { id: "storage-scope", label: "Storage scope", value: legacy.decisions.storageScope },
      { id: "revision-policy", label: "Revision policy", value: legacy.decisions.revisionPolicy },
      { id: "record-contents", label: "Stored data", value: legacy.decisions.recordContents },
      { id: "storage-failure", label: "Storage failure", value: legacy.decisions.storageFailure }
    ],
    acceptanceScenarios: legacy.acceptanceScenarios.map((item) => ({ ...item })),
    implementationImpact: Array.isArray(legacy.implementationImpact) ? JSON.parse(JSON.stringify(legacy.implementationImpact)) : [],
    verification: { ...legacy.verification },
    authority: { ...legacy.authority },
    source: JSON.parse(JSON.stringify(legacy))
  };
}

function normalizeV1(input) {
  if (!input || typeof input !== "object") throw new Error("implementation brief must be an object");
  const decisions = uniqueRecords(input.decisions, "decision");
  if (decisions.length === 0) throw new Error("at least one feature decision is required");
  const constraints = uniqueRecords(input.constraints ?? [], "constraint");
  return {
    schemaVersion: CANONICAL_IMPLEMENTATION_BRIEF,
    sourceSchemaVersion: IMPLEMENTATION_BRIEF_V1,
    featureId: text(input.featureId, "featureId"),
    baselineRevision: text(input.baselineRevision, "baselineRevision"),
    outcome: text(input.outcome, "outcome"),
    successCriterion: text(input.successCriterion, "successCriterion"),
    decisions,
    constraints,
    acceptanceScenarios: normalizedScenarios(input.acceptanceScenarios),
    implementationImpact: Array.isArray(input.implementationImpact) ? JSON.parse(JSON.stringify(input.implementationImpact)) : [],
    verification: verification(input.verification),
    authority: authority(input.authority),
    source: JSON.parse(JSON.stringify(input))
  };
}

export function normalizeImplementationBrief(input) {
  if (!input || typeof input !== "object") throw new Error("implementation brief must be an object");
  if (input.schemaVersion === IMPLEMENTATION_BRIEF_V0) return normalizeV0(input);
  if (input.schemaVersion === IMPLEMENTATION_BRIEF_V1) return normalizeV1(input);
  throw new Error(`unsupported implementation brief schema: ${input.schemaVersion}`);
}

export function decisionValue(brief, id) {
  return brief?.decisions?.find((item) => item.id === id)?.value;
}

export function constraintValue(brief, id) {
  return brief?.constraints?.find((item) => item.id === id)?.value;
}

export function decisionMap(brief) {
  return Object.fromEntries((brief?.decisions ?? []).map((item) => [item.id, item.value]));
}

export function constraintMap(brief) {
  return Object.fromEntries((brief?.constraints ?? []).map((item) => [item.id, item.value]));
}
