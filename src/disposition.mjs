// "failed" lets a review record a check the artifact does not pass, instead of
// hiding the finding as "skipped" (asked for in five skill ratings, 2026-09-26 to 10-11).
const STATUSES = new Set(["satisfied", "na", "skipped", "failed"]);

/**
 * A recommendation already names its own checklist (hard/soft/usability checks,
 * things to avoid). This does not re-verify any of those claims — it only checks
 * that every named item got an explicit, non-empty disposition from whoever built
 * the artifact, so a gap is a visible refusal instead of a silent omission.
 */
export const ACCEPTANCE_REFERENCE_PREFIX = "matches-approved-reference:";
export const MUST_SHOW_PREFIX = "shows:";
const NEEDS_EVIDENCE = new Set(["acceptance-reference", "must-show"]);

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

/**
 * Required lines are the ones that decide whether the build is right: the approved reference,
 * the justified choice, hard checks, and the build playbook's anti-patterns. Soft and usability
 * checks and the representations the router rejected are advisory: a line for them is validated
 * when given, and an unanswered one is counted and logged rather than refused. Answering every
 * item made agents write dozens of "na" lines (46 for one static page, skill rating 2026-10-12),
 * which trains rubber-stamping. `strict` restores the old every-item rule.
 */
export const ADVISORY_CATEGORIES = new Set(["avoid", "soft-check", "usability-check"]);

export function collectChecklist(recommendation, acceptance = null) {
  const items = [];
  const add = (category, id) => {
    if (id) items.push({ category, id, required: !ADVISORY_CATEGORIES.has(category) });
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
  // Parts the person named must each be on the page; a satisfied line says where (skill rating 2026-10-08).
  for (const part of recommendation?.compositionPlan?.mustShow ?? []) add("must-show", `${MUST_SHOW_PREFIX}${part}`);
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

// Tolerates npm's lifecycle banner ("> pkg@x recommend ...") above the JSON, so
// `npm run recommend -- x.json > rec.json` output reads back without --silent.
export function parseJsonAfterBanner(text) {
  const start = text.search(/^[{[]/m);
  return JSON.parse(start > 0 ? text.slice(start) : text);
}

export function validateDisposition(checklist, dispositions, { strict = false } = {}) {
  const missing = [];
  const invalid = [];
  const advisoryUnanswered = [];

  const choice = selectionChoice(checklist, dispositions);
  for (const { category, id, required = true } of checklist) {
    if (category === "selection" && choice.ambiguous) {
      invalid.push({ category, id, entry: null, reason: `name one choice, not ${choice.keys.join(", ")}` });
      continue;
    }
    const entry = category === "selection" && choice.key ? dispositions[choice.key] : dispositions?.[id];
    if (!entry) {
      if (required || strict) missing.push({ category, id });
      else advisoryUnanswered.push({ category, id });
      continue;
    }
    const statusOk = STATUSES.has(entry.status);
    const whyOk = typeof entry.why === "string" && entry.why.trim().length > 0;
    // A satisfied parity claim against an approved reference must point at the
    // evidence it was compared with (a screenshot path, a browser capture id); a
    // satisfied must-show line points at where the part is visible.
    const evidenceOk =
      !NEEDS_EVIDENCE.has(category) ||
      entry.status !== "satisfied" ||
      (typeof entry.evidence === "string" && entry.evidence.trim().length > 0);
    if (!statusOk || !whyOk || !evidenceOk) {
      invalid.push({ category, id, entry });
    }
  }

  const coveredExtra = Object.keys(dispositions ?? {}).filter(
    (id) => !checklist.some((item) => item.id === id) && !choice.keys.includes(id)
  );

  const failed = checklist.filter(({ category, id }) =>
    (category === "selection" && choice.key && !choice.ambiguous ? dispositions[choice.key] : dispositions?.[id])?.status === "failed");

  return {
    ok: missing.length === 0 && invalid.length === 0,
    missing,
    invalid,
    coveredExtra,
    failed,
    advisoryUnanswered,
    chosenRepresentation: choice.key && !choice.ambiguous ? choice.key.slice(CHOICE_PREFIX.length) : null
  };
}

export const CHOICE_PREFIX = "choice-justified:";

/**
 * The selection item is named after the router's primary, but the builder may build an
 * alternative: a `choice-justified:<what they built>` line answers it (skill rating
 * 2026-10-04: the gate demanded a justification line for a primary nobody chose).
 * A line under the primary's own name still counts; two different choices are refused.
 */
function selectionChoice(checklist, dispositions) {
  if (!checklist.some(({ category }) => category === "selection")) return { key: null, keys: [], ambiguous: false };
  const keys = Object.keys(dispositions ?? {}).filter((id) => id.startsWith(CHOICE_PREFIX) && id.length > CHOICE_PREFIX.length);
  return { key: keys[0] ?? null, keys, ambiguous: keys.length > 1 };
}

export function buildDispositionRecord({
  recommendationId,
  primaryPattern,
  chosenRepresentation = null,
  failed = null,
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
    chosenRepresentation: chosenRepresentation ?? null,
    checklistSize: checklist.length,
    failed: (failed ?? checklist.filter(({ id }) => dispositions?.[id]?.status === "failed")).map(({ category, id }) => ({ category, id })),
    requiredCount: checklist.filter(({ required = true }) => required).length,
    advisoryUnanswered: checklist.filter(({ id, required = true }) => !required && !dispositions?.[id]).map(({ category, id }) => ({ category, id })),
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
