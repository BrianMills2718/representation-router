const STATUSES = new Set(["satisfied", "na", "skipped"]);

/**
 * A recommendation already names its own checklist (hard/soft/usability checks,
 * things to avoid). This does not re-verify any of those claims — it only checks
 * that every named item got an explicit, non-empty disposition from whoever built
 * the artifact, so a gap is a visible refusal instead of a silent omission.
 */
export const ACCEPTANCE_REFERENCE_PREFIX = "matches-approved-reference:";

/**
 * An acceptance file lists the concrete references a human approved before the
 * build — typically a sketch/mockup image chosen from a set of candidates. Each
 * one becomes a required checklist item so the build cannot quietly drift from
 * what was approved (the 2026-09-10 Company Work Graph case: sixteen mockups,
 * one approved, and the shipped page did not match it).
 */
export function validateAcceptance(acceptance) {
  const errors = [];
  const refs = acceptance?.references;
  if (acceptance == null) return { ok: true, errors: [], references: [] };
  if (!Array.isArray(refs) || refs.length === 0) {
    return { ok: false, errors: ["acceptance.references must be a non-empty array"], references: [] };
  }
  const seen = new Set();
  refs.forEach((ref, index) => {
    const where = `references[${index}]`;
    for (const field of ["id", "kind", "path", "sha256", "approvedBy", "approvedAt"]) {
      if (typeof ref?.[field] !== "string" || ref[field].trim() === "") {
        errors.push(`${where}.${field} must be a non-empty string`);
      }
    }
    if (typeof ref?.sha256 === "string" && !/^[0-9a-f]{64}$/i.test(ref.sha256)) {
      errors.push(`${where}.sha256 must be a 64-hex-character digest`);
    }
    if (ref?.id) {
      if (seen.has(ref.id)) errors.push(`${where}.id duplicates ${ref.id}`);
      seen.add(ref.id);
    }
  });
  return { ok: errors.length === 0, errors, references: errors.length === 0 ? refs : [] };
}

export function collectChecklist(recommendation, acceptance = null) {
  const items = [];
  const add = (category, id) => {
    if (id) items.push({ category, id });
  };

  for (const ref of validateAcceptance(acceptance).references) {
    add("acceptance-reference", `${ACCEPTANCE_REFERENCE_PREFIX}${ref.id}`);
  }

  // The recommender emits avoid entries as { pattern, reason }; older callers pass bare ids.
  for (const entry of recommendation?.avoid ?? []) add("avoid", typeof entry === "string" ? entry : entry?.pattern);
  // The score is advisory. When the router offered alternatives, the builder
  // must say which representation they chose and why, in their own words.
  if (recommendation?.primary?.representation && (recommendation?.alternatives ?? []).length) {
    add("selection", `choice-justified:${recommendation.primary.representation}`);
  }
  for (const id of recommendation?.primary?.implementation?.playbook?.avoid ?? []) add("playbook-avoid", id);
  for (const id of recommendation?.quality?.hardChecks ?? []) add("hard-check", id);
  for (const id of recommendation?.quality?.softChecks ?? []) add("soft-check", id);
  for (const id of recommendation?.quality?.usabilityChecks ?? []) add("usability-check", id);

  const seen = new Set();
  return items.filter(({ category, id }) => {
    const key = `${category}::${id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function validateDisposition(checklist, dispositions) {
  const missing = [];
  const invalid = [];

  for (const { category, id } of checklist) {
    const entry = dispositions?.[id];
    if (!entry) {
      missing.push({ category, id });
      continue;
    }
    const statusOk = STATUSES.has(entry.status);
    const whyOk = typeof entry.why === "string" && entry.why.trim().length > 0;
    // A satisfied parity claim against an approved reference must point at the
    // evidence it was compared with (a screenshot path, a browser capture id).
    const evidenceOk =
      category !== "acceptance-reference" ||
      entry.status !== "satisfied" ||
      (typeof entry.evidence === "string" && entry.evidence.trim().length > 0);
    if (!statusOk || !whyOk || !evidenceOk) {
      invalid.push({ category, id, entry });
    }
  }

  const coveredExtra = Object.keys(dispositions ?? {}).filter(
    (id) => !checklist.some((item) => item.id === id)
  );

  return { ok: missing.length === 0 && invalid.length === 0, missing, invalid, coveredExtra };
}

export function buildDispositionRecord({
  recommendationId,
  primaryPattern,
  actor,
  dispositions,
  checklist,
  acceptance = null
}) {
  return {
    version: "0.2",
    recordedAt: new Date().toISOString(),
    actor: actor || "unknown",
    recommendationId: recommendationId ?? null,
    primaryPattern: primaryPattern ?? null,
    checklistSize: checklist.length,
    acceptanceReferences: (acceptance?.references ?? []).map(({ id, kind, path, sha256, approvedBy, approvedAt }) => ({
      id,
      kind,
      path,
      sha256,
      approvedBy,
      approvedAt
    })),
    dispositions
  };
}
