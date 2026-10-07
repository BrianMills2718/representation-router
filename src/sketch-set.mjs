// Sketch sets: drive a human-approvable set of schematic candidate screens
// through the ChatGPT browser bridge, then draft the acceptance file the
// disposition check consumes. Pure helpers live here; the CLI is
// scripts/sketch-set.mjs.
//
// A sketch is a candidate for choosing a shape. It is never a render of the
// model and never carries source-derived labels; every prompt says so.

import { createHash } from "node:crypto";

export const SCHEMATIC_RULE =
  "This is a SCHEMATIC SKETCH, a candidate for choosing a shape, not a finished design and not a render of real data. " +
  "Clean grey-and-black wireframe. Placeholder labels only; no real names, numbers, brands, or photos. Landscape 3:2.";

/**
 * A spec names one shared shell and N pictures. Every picture's prompt is
 * shell + schematic rule + its own instruction, so the set stays consistent.
 */
export function validateSpec(spec) {
  const errors = [];
  if (!spec || typeof spec !== "object") return ["spec must be an object"];
  if (typeof spec.id !== "string" || !spec.id.trim()) errors.push("spec.id must be a non-empty string");
  if (typeof spec.shell !== "string" || !spec.shell.trim()) errors.push("spec.shell must describe the shared shell");
  if (!Array.isArray(spec.pictures) || spec.pictures.length === 0) errors.push("spec.pictures must be a non-empty array");
  const seen = new Set();
  for (const [index, picture] of (spec.pictures ?? []).entries()) {
    const where = `pictures[${index}]`;
    if (typeof picture?.id !== "string" || !/^[a-z0-9][a-z0-9-]*$/i.test(picture.id)) errors.push(`${where}.id must be a safe slug`);
    if (typeof picture?.instruction !== "string" || !picture.instruction.trim()) errors.push(`${where}.instruction must be a non-empty string`);
    if (picture?.id) {
      if (seen.has(picture.id)) errors.push(`${where}.id duplicates ${picture.id}`);
      seen.add(picture.id);
    }
  }
  return errors;
}

/**
 * Composition instructions stated to the image generator before it draws. A
 * spec may list heuristic ids under `composition`; otherwise every heuristic
 * that applies "always" is used. The catalog is catalog/composition-heuristics.json.
 */
export function compositionInstructions(spec, catalog) {
  if (!catalog?.heuristics?.length) return [];
  const wanted = Array.isArray(spec.composition) ? new Set(spec.composition) : null;
  return catalog.heuristics
    .filter((h) => (wanted ? wanted.has(h.id) : (h.appliesWhen ?? []).includes("always")))
    .map((h) => h.sketchInstruction)
    .filter(Boolean);
}

export function composePrompts(spec, { compositionCatalog = null } = {}) {
  const errors = validateSpec(spec);
  if (errors.length) throw new Error(`invalid sketch-set spec: ${errors.join("; ")}`);
  const total = spec.pictures.length;
  const composition = compositionInstructions(spec, compositionCatalog);
  return spec.pictures.map((picture, index) => ({
    id: picture.id,
    label: picture.label ?? picture.id,
    text:
      `Generate one image. ${SCHEMATIC_RULE}\n\n` +
      `You are drawing picture ${index + 1} of ${total} in a set that must share one identical shell. Shell: ${spec.shell.trim()}\n\n` +
      (composition.length ? `Composition rules for every picture in the set: ${composition.join(" ")}\n\n` : "") +
      `This picture: ${picture.instruction.trim()} Caption text in a corner: "Picture ${index + 1} of ${total} — ${picture.label ?? picture.id}".`
  }));
}

export function threadIdFrom(text) {
  const match = String(text ?? "").match(/thread_id\\?"?:\\?"([0-9a-f-]{36})/) || String(text ?? "").match(/"thread_id":"([0-9a-f-]{36})"/);
  return match ? match[1] : null;
}

export function sha256Hex(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

/**
 * Draft the acceptance file the disposition CLI takes via --acceptance. The
 * approver fields are left null on purpose: a person fills them, or passes
 * --approve to the CLI, after looking at the pictures. Until then the file is
 * a draft and validateAcceptance() in disposition.mjs rejects it.
 */
export function draftAcceptance(spec, saved) {
  return {
    case: spec.id,
    note: "Draft. Set approvedBy/approvedAt on the references a person actually approved and delete the rest; then this file is a valid --acceptance input.",
    conditions: spec.conditions ?? [],
    references: saved.map((item) => ({
      id: `${spec.id}-${item.id}`,
      kind: "approved-mockup",
      path: item.path,
      sha256: item.sha256,
      approvedBy: null,
      approvedAt: null,
      picture: item.id,
      source: item.thread ? `https://chatgpt.com/c/${item.thread}` : null
    }))
  };
}

export function applyApproval(acceptance, { approvedBy, approvedAt, words }) {
  const stamped = {
    ...acceptance,
    note: `Approved set. ${words ? `Approval words: ${JSON.stringify(words)}.` : ""}`.trim(),
    references: acceptance.references.map((ref) => ({ ...ref, approvedBy, approvedAt }))
  };
  if (words) stamped.approvalWords = words;
  return stamped;
}
