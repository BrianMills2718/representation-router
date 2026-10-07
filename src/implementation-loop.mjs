import { clearLayout, saveLayout } from "./layout-persistence.mjs";

export const IMPLEMENTATION_RECEIPT_SCHEMA_VERSION = "implementation-receipt/v0";

const ALLOWED_REMEMBER_MODES = new Set(["automatic-after-drag", "explicit-save"]);
const ALLOWED_RECEIPT_MODES = new Set(["visible-after-save", "quiet"]);
const ALLOWED_RESET_MODES = new Set(["immediate-reset", "confirm-before-reset"]);

function requiredText(value, label) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} must be a non-empty string`);
  return value.trim();
}

function finiteNumber(value, label) {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`${label} must be finite`);
  return value;
}

export function validateImplementationBrief(brief) {
  if (!brief || typeof brief !== "object") throw new Error("implementation brief must be an object");
  if (brief.schemaVersion !== "implementation-brief/v0") throw new Error(`unsupported implementation brief: ${brief.schemaVersion}`);
  requiredText(brief.featureId, "featureId");
  requiredText(brief.baselineRevision, "baselineRevision");
  requiredText(brief.outcome, "outcome");
  requiredText(brief.successCriterion, "successCriterion");
  if (!ALLOWED_REMEMBER_MODES.has(brief.decisions?.rememberMode)) throw new Error("unsupported rememberMode");
  if (!ALLOWED_RECEIPT_MODES.has(brief.decisions?.saveReceipt)) throw new Error("unsupported saveReceipt");
  if (!ALLOWED_RESET_MODES.has(brief.decisions?.resetMode)) throw new Error("unsupported resetMode");
  if (brief.decisions?.storageScope !== "browser-local") throw new Error("storageScope must remain browser-local");
  if (brief.decisions?.revisionPolicy !== "exact-revision-only") throw new Error("revisionPolicy must remain exact-revision-only");
  if (brief.decisions?.recordContents !== "node-id-and-position-only") throw new Error("recordContents must remain node-id-and-position-only");
  if (brief.verification?.status !== "planned-not-executed") throw new Error("brief verification must remain planned-not-executed before implementation");
  if (brief.authority?.effect !== "handoff-only" || brief.authority?.repositoryWrite !== false) throw new Error("brief must remain handoff-only");
  if (!Array.isArray(brief.acceptanceScenarios) || brief.acceptanceScenarios.length === 0) throw new Error("brief requires acceptance scenarios");
  return brief;
}

export function validateImplementationReceipt(receipt, briefInput) {
  const brief = validateImplementationBrief(briefInput);
  if (!receipt || typeof receipt !== "object") throw new Error("implementation receipt must be an object");
  if (receipt.schemaVersion !== IMPLEMENTATION_RECEIPT_SCHEMA_VERSION) throw new Error(`unsupported implementation receipt: ${receipt.schemaVersion}`);
  if (receipt.featureId !== brief.featureId) throw new Error("receipt featureId does not match brief");
  if (receipt.briefBaselineRevision !== brief.baselineRevision) throw new Error("receipt baseline revision does not match brief");
  requiredText(receipt.candidateRevision, "candidateRevision");
  if (!Array.isArray(receipt.changedFiles) || receipt.changedFiles.length === 0) throw new Error("receipt changedFiles are required");
  if (!Array.isArray(receipt.executedChecks) || receipt.executedChecks.length === 0) throw new Error("receipt executedChecks are required");
  if (!receipt.executedChecks.every((check) => check?.status === "passed" && typeof check.name === "string" && check.name.trim())) throw new Error("receipt executed checks must all be named and passed");
  if (receipt.ci?.conclusion !== "success") throw new Error("receipt CI conclusion must be success");
  requiredText(String(receipt.ci?.runId ?? ""), "ci.runId");
  requiredText(String(receipt.artifact?.id ?? ""), "artifact.id");
  requiredText(receipt.artifact?.name, "artifact.name");
  requiredText(receipt.artifact?.sha256, "artifact.sha256");
  if (receipt.verification?.status !== "executed") throw new Error("receipt verification must be executed");
  if (receipt.humanReview?.status !== "pending") throw new Error("receipt human review must remain pending");
  return receipt;
}

export function applyUnsavedMove(nodes, nodeId, position) {
  const x = finiteNumber(position?.x, "position.x");
  const y = finiteNumber(position?.y, "position.y");
  let found = false;
  const next = nodes.map((node) => {
    if (node.id !== nodeId) return { ...node, position: { ...node.position }, data: node.data ? { ...node.data } : node.data };
    found = true;
    return { ...node, position: { x, y }, data: node.data ? { ...node.data } : node.data };
  });
  if (!found) throw new Error(`unknown node: ${nodeId}`);
  return next;
}

export function persistExplicitLayout(storage, identity, nodes) {
  return saveLayout(storage, { ...identity, nodes });
}

export function confirmCandidateReset(storage, identity, defaultNodes) {
  const clear = clearLayout(storage, identity);
  return {
    status: clear.status,
    nodes: defaultNodes.map((node) => ({ ...node, position: { ...node.position }, data: node.data ? { ...node.data } : node.data }))
  };
}

export function buildImplementationReceipt(input) {
  const brief = validateImplementationBrief(input.brief);
  const candidateRevision = requiredText(input.candidateRevision, "candidateRevision");
  const runId = requiredText(String(input.runId), "runId");
  const artifactId = requiredText(String(input.artifactId), "artifactId");
  if (!Array.isArray(input.changedFiles) || input.changedFiles.length === 0) throw new Error("changedFiles are required");
  if (!Array.isArray(input.executedChecks) || input.executedChecks.length === 0) throw new Error("executedChecks are required");
  if (!input.executedChecks.every((check) => check?.status === "passed")) throw new Error("receipt can only claim passed checks that are recorded as passed");
  return {
    schemaVersion: IMPLEMENTATION_RECEIPT_SCHEMA_VERSION,
    featureId: brief.featureId,
    briefBaselineRevision: brief.baselineRevision,
    candidateRevision,
    changedFiles: [...input.changedFiles],
    executedChecks: input.executedChecks.map((check) => ({ name: requiredText(check.name, "check.name"), status: "passed" })),
    ci: { runId, conclusion: "success" },
    artifact: {
      id: artifactId,
      name: requiredText(input.artifactName, "artifactName"),
      sha256: requiredText(input.artifactSha256, "artifactSha256")
    },
    verification: {
      status: "executed",
      statement: "These checks executed successfully on the exact candidate revision recorded by this receipt."
    },
    humanReview: {
      status: "pending",
      statement: "Executed checks do not establish human usefulness or acceptance."
    }
  };
}
