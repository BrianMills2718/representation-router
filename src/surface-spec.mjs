import { assertContract } from "./schema-validation.mjs";

const SOURCE_ROLES = new Set([
  "semantic-authority",
  "workflow-authority",
  "evidence",
  "implementation",
  "documentation",
  "context",
  "other"
]);
const VIEW_ROLES = new Set(["primary", "complementary", "supporting"]);
const ACTION_KINDS = new Set(["inspect", "navigate", "propose", "annotate", "decide", "edit", "execute", "other"]);
const ACTION_EFFECTS = new Set(["read-only", "surface-local", "authoritative-write"]);
const NOT_REPRESENTED = new Set(["retain-and-mark-not-represented", "clear"]);
const REVISION_CHANGE = new Set(["clear-semantic-focus", "require-explicit-remap"]);
const SHARED_FILTERS = new Set(["compatible-views-only", "surface-wide", "none"]);

const nonEmpty = (value) => typeof value === "string" && value.trim().length > 0;

function requireNonEmpty(value, label) {
  if (!nonEmpty(value)) throw new Error(`${label} is required.`);
  return value.trim();
}

function requireOneOf(value, allowed, label) {
  const normalized = requireNonEmpty(value, label);
  if (!allowed.has(normalized)) throw new Error(`${label} has unsupported value: ${normalized}.`);
  return normalized;
}

function requireBoolean(value, label) {
  if (typeof value !== "boolean") throw new Error(`${label} must be a boolean.`);
  return value;
}

function nullableString(value, label) {
  if (value == null) return null;
  if (typeof value !== "string") throw new Error(`${label} must be a string or null.`);
  return value;
}

function uniqueStrings(values, label, { minItems = 0 } = {}) {
  if (!Array.isArray(values)) throw new Error(`${label} must be an array.`);
  const normalized = values.map((value, index) => requireNonEmpty(value, `${label}[${index}]`));
  const unique = [...new Set(normalized)];
  if (unique.length < minItems) throw new Error(`${label} requires at least ${minItems} item(s).`);
  return unique;
}

function requireUniqueIds(items, label) {
  const seen = new Set();
  for (const item of items) {
    if (seen.has(item.id)) throw new Error(`${label} ids must be unique: ${item.id}.`);
    seen.add(item.id);
  }
}

function normalizeDestination(destination, label) {
  if (destination == null) return null;
  if (typeof destination !== "object" || Array.isArray(destination)) throw new Error(`${label} must be an object or null.`);
  return {
    owner: requireNonEmpty(destination.owner, `${label}.owner`),
    target: requireNonEmpty(destination.target, `${label}.target`),
    targetRevision: requireNonEmpty(destination.targetRevision, `${label}.targetRevision`)
  };
}

function normalizeAuthority(authority, label) {
  if (authority == null) return null;
  if (typeof authority !== "object" || Array.isArray(authority)) throw new Error(`${label} must be an object or null.`);
  return {
    actor: requireNonEmpty(authority.actor, `${label}.actor`),
    basis: requireNonEmpty(authority.basis, `${label}.basis`),
    scope: requireNonEmpty(authority.scope, `${label}.scope`)
  };
}

function normalizeSourceBinding(binding, index) {
  if (!binding || typeof binding !== "object" || Array.isArray(binding)) {
    throw new Error(`sourceBindings[${index}] must be an object.`);
  }
  return {
    id: requireNonEmpty(binding.sourceId, `sourceBindings[${index}].sourceId`),
    sourceId: requireNonEmpty(binding.sourceId, `sourceBindings[${index}].sourceId`),
    owner: requireNonEmpty(binding.owner, `sourceBindings[${index}].owner`),
    revision: requireNonEmpty(binding.revision, `sourceBindings[${index}].revision`),
    role: requireOneOf(binding.role, SOURCE_ROLES, `sourceBindings[${index}].role`),
    locator: nullableString(binding.locator ?? null, `sourceBindings[${index}].locator`),
    note: nullableString(binding.note ?? null, `sourceBindings[${index}].note`)
  };
}

function normalizeAction(action, index) {
  if (!action || typeof action !== "object" || Array.isArray(action)) {
    throw new Error(`actions[${index}] must be an object.`);
  }
  const label = `actions[${index}]`;
  const effect = requireOneOf(action.effect, ACTION_EFFECTS, `${label}.effect`);
  const normalized = {
    id: requireNonEmpty(action.id, `${label}.id`),
    label: requireNonEmpty(action.label, `${label}.label`),
    kind: requireOneOf(action.kind, ACTION_KINDS, `${label}.kind`),
    effect,
    destination: normalizeDestination(action.destination ?? null, `${label}.destination`),
    subjectRevision: action.subjectRevision == null ? null : requireNonEmpty(action.subjectRevision, `${label}.subjectRevision`),
    authority: normalizeAuthority(action.authority ?? null, `${label}.authority`),
    staleSubmission: action.staleSubmission ?? "not-applicable",
    retainEvidence: requireBoolean(action.retainEvidence ?? false, `${label}.retainEvidence`)
  };

  if (effect === "authoritative-write") {
    if (!normalized.destination) throw new Error(`${label} authoritative-write requires destination.`);
    if (!normalized.subjectRevision) throw new Error(`${label}.subjectRevision is required.`);
    if (!normalized.authority) throw new Error(`${label} authoritative-write requires authority.`);
    if (!["reject", "refresh-required"].includes(normalized.staleSubmission)) {
      throw new Error(`${label} authoritative-write requires staleSubmission reject or refresh-required.`);
    }
    if (normalized.retainEvidence !== true) {
      throw new Error(`${label} authoritative-write requires retainEvidence=true.`);
    }
  } else if (effect === "read-only") {
    if (normalized.destination || normalized.subjectRevision || normalized.authority) {
      throw new Error(`${label} read-only action cannot declare a write destination, subject revision, or authority.`);
    }
    if (normalized.staleSubmission !== "not-applicable") {
      throw new Error(`${label} read-only action must use staleSubmission=not-applicable.`);
    }
    if (normalized.retainEvidence !== false) {
      throw new Error(`${label} read-only action requires retainEvidence=false.`);
    }
  } else {
    if (normalized.destination || normalized.subjectRevision || normalized.authority) {
      throw new Error(`${label} surface-local action cannot declare a write destination, subject revision, or authority.`);
    }
    if (normalized.staleSubmission !== "not-applicable") {
      throw new Error(`${label} surface-local action must use staleSubmission=not-applicable.`);
    }
  }

  return normalized;
}

export function buildSurfaceSpec(viewSpecs, options = {}) {
  if (!Array.isArray(viewSpecs) || viewSpecs.length === 0) {
    throw new Error("At least one ViewSpec is required.");
  }
  const ids = viewSpecs.map((spec, index) => requireNonEmpty(spec?.id, `viewSpecs[${index}].id`));
  if (new Set(ids).size !== ids.length) throw new Error("ViewSpec ids must be unique.");

  const sourceBindings = options.sourceBindings;
  if (!Array.isArray(sourceBindings) || sourceBindings.length === 0) {
    throw new Error("At least one source binding with owner and revision is required.");
  }
  const normalizedSourceBindings = sourceBindings.map(normalizeSourceBinding);
  requireUniqueIds(normalizedSourceBindings, "sourceBindings");

  const inheritedSuccess = viewSpecs.flatMap((spec) => Array.isArray(spec.successCriteria) ? spec.successCriteria : []);
  const successCriteria = uniqueStrings(options.successCriteria ?? inheritedSuccess, "successCriteria", { minItems: 1 });
  const lifecycleStages = uniqueStrings(options.lifecycleStages ?? ["cross-lifecycle"], "lifecycleStages", { minItems: 1 });
  const modes = uniqueStrings(options.modes ?? [], "modes");
  const interfacePatterns = uniqueStrings(options.interfacePatterns ?? [], "interfacePatterns");
  const notes = uniqueStrings(options.notes ?? [], "notes");

  const primaryId = options.primaryViewId ?? ids[0];
  if (!ids.includes(primaryId)) throw new Error("primaryViewId must reference one of the supplied ViewSpecs.");

  const viewRoles = options.viewRoles ?? {};
  if (!viewRoles || typeof viewRoles !== "object" || Array.isArray(viewRoles)) throw new Error("viewRoles must be an object.");
  for (const viewId of Object.keys(viewRoles)) {
    if (!ids.includes(viewId)) throw new Error(`viewRoles references unknown ViewSpec: ${viewId}.`);
  }
  const whenSelectionNotRepresented = requireOneOf(
    options.whenSelectionNotRepresented ?? "retain-and-mark-not-represented",
    NOT_REPRESENTED,
    "whenSelectionNotRepresented"
  );
  const sourceRevisionChange = requireOneOf(
    options.sourceRevisionChange ?? "clear-semantic-focus",
    REVISION_CHANGE,
    "sourceRevisionChange"
  );
  const sharedFilters = requireOneOf(
    options.sharedFilters ?? "compatible-views-only",
    SHARED_FILTERS,
    "sharedFilters"
  );
  const actions = options.actions ?? [];
  if (!Array.isArray(actions)) throw new Error("actions must be an array.");
  const normalizedActions = actions.map(normalizeAction);
  requireUniqueIds(normalizedActions, "actions");

  const surfaceSpec = {
    version: "0.1",
    id: requireNonEmpty(options.id ?? `${primaryId}-surface`, "id"),
    purpose: {
      job: requireNonEmpty(options.job ?? viewSpecs[0].concern ?? "Work with the selected semantic views.", "job"),
      audience: requireNonEmpty(options.audience ?? viewSpecs[0].viewpoint?.stakeholder ?? "unspecified stakeholder", "audience"),
      lifecycleStages,
      modes
    },
    views: viewSpecs.map((spec) => ({
      viewSpecId: spec.id,
      role: requireOneOf(
        viewRoles[spec.id] ?? (spec.id === primaryId ? "primary" : "complementary"),
        VIEW_ROLES,
        `viewRoles.${spec.id}`
      ),
      question: requireNonEmpty(spec.concern ?? spec.id, `viewSpecs.${spec.id}.concern`)
    })),
    sourceBindings: normalizedSourceBindings.map(({ id, ...binding }) => binding),
    interfacePatterns,
    stateContract: {
      selectionIdentity: "semantic-id",
      persistAcrossViewPivots: requireBoolean(options.persistAcrossViewPivots ?? true, "persistAcrossViewPivots"),
      whenSelectionNotRepresented,
      sourceRevisionChange,
      sharedFilters
    },
    actions: normalizedActions,
    provenance: {
      linkSurfaceToSources: requireBoolean(options.linkSurfaceToSources ?? true, "linkSurfaceToSources"),
      linkViewsToSources: requireBoolean(options.linkViewsToSources ?? true, "linkViewsToSources"),
      linkClaimsToEvidence: requireBoolean(options.linkClaimsToEvidence ?? true, "linkClaimsToEvidence")
    },
    successCriteria,
    notes
  };

  return assertContract("surface-spec", surfaceSpec);
}
