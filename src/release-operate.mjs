export const RELEASE_INTENT_SCHEMA_VERSION = "release-intent/v0";
export const RELEASE_PLAN_SCHEMA_VERSION = "release-plan/v0";
export const DEPLOYMENT_RECEIPT_SCHEMA_VERSION = "deployment-receipt/v0";
export const RUNTIME_OBSERVATION_SCHEMA_VERSION = "runtime-observation/v0";
export const ROLLBACK_RECEIPT_SCHEMA_VERSION = "rollback-receipt/v0";

const STAGING_ENVIRONMENT = "ci-staging-sandbox";

function requiredText(value, label) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} must be a non-empty string`);
  return value.trim();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function validateHumanReview(value) {
  if (value?.status !== "pending") throw new Error("humanReview.status must remain pending at this checkpoint");
  return { status: "pending" };
}

export function validateReleaseIntent(input) {
  if (!input || typeof input !== "object") throw new Error("release intent must be an object");
  if (input.schemaVersion !== RELEASE_INTENT_SCHEMA_VERSION) throw new Error(`unsupported release intent schema: ${input.schemaVersion}`);
  const environmentClass = requiredText(input.target?.environmentClass, "target.environmentClass");
  if (environmentClass !== STAGING_ENVIRONMENT) throw new Error("Release + Operate v0 only authorizes ci-staging-sandbox targets; production is not connected or authorized");
  const actor = requiredText(input.authority?.actor, "authority.actor");
  const basis = requiredText(input.authority?.basis, "authority.basis");
  const scope = requiredText(input.authority?.scope, "authority.scope");
  if (!/github actions|repository ci/i.test(`${actor} ${basis} ${scope}`)) throw new Error("release authority must explicitly name repository CI / GitHub Actions staging authority");
  if (input.rollback?.required !== true) throw new Error("rollback.required must be true");
  if (!Array.isArray(input.verification) || input.verification.length === 0) throw new Error("release intent requires verification checks");
  const verification = input.verification.map((item, index) => ({
    id: requiredText(item?.id ?? `check-${index + 1}`, `verification ${index + 1} id`),
    description: requiredText(item?.description, `verification ${index + 1} description`)
  }));
  return {
    schemaVersion: RELEASE_INTENT_SCHEMA_VERSION,
    releaseId: requiredText(input.releaseId, "releaseId"),
    subject: {
      id: requiredText(input.subject?.id, "subject.id"),
      sourcePath: requiredText(input.subject?.sourcePath, "subject.sourcePath")
    },
    target: {
      id: requiredText(input.target?.id, "target.id"),
      owner: requiredText(input.target?.owner, "target.owner"),
      environmentClass
    },
    authority: { actor, basis, scope },
    verification,
    rollback: {
      required: true,
      previousSourcePath: requiredText(input.rollback?.previousSourcePath, "rollback.previousSourcePath")
    },
    humanReview: validateHumanReview(input.humanReview)
  };
}

function validateSnapshot(snapshot, label) {
  if (!snapshot || typeof snapshot !== "object") throw new Error(`${label} snapshot is required`);
  const files = Array.isArray(snapshot.files) ? snapshot.files.map((file, index) => ({
    path: requiredText(file?.path, `${label}.files[${index}].path`),
    bytes: Number(file?.bytes),
    sha256: requiredText(file?.sha256, `${label}.files[${index}].sha256`)
  })) : [];
  if (!files.length) throw new Error(`${label} snapshot requires files`);
  if (files.some((file) => !Number.isFinite(file.bytes) || file.bytes < 0)) throw new Error(`${label} snapshot contains invalid byte counts`);
  return {
    root: requiredText(snapshot.root, `${label}.root`),
    bundleSha256: requiredText(snapshot.bundleSha256, `${label}.bundleSha256`),
    files
  };
}

export function buildReleasePlan(intentInput, snapshots) {
  const intent = validateReleaseIntent(intentInput);
  const source = validateSnapshot(snapshots?.source, "source");
  const previous = validateSnapshot(snapshots?.previous, "previous");
  if (source.bundleSha256 === previous.bundleSha256) throw new Error("source release and previous staging snapshot must be distinct");
  return {
    schemaVersion: RELEASE_PLAN_SCHEMA_VERSION,
    status: "planned",
    releaseId: intent.releaseId,
    subject: { ...intent.subject, snapshot: source },
    previous: { sourcePath: intent.rollback.previousSourcePath, snapshot: previous },
    target: { ...intent.target },
    authority: { ...intent.authority },
    verification: intent.verification.map((item) => ({ ...item })),
    deployment: {
      action: "copy-exact-bundle",
      targetPath: "staging/current",
      requireHashMatch: true
    },
    rollback: {
      required: true,
      action: "restore-retained-previous-snapshot",
      requireHashMatch: true,
      reapplyIntendedReleaseAfterProof: true
    },
    nonclaims: [
      "A release plan is not deployment evidence.",
      "CI staging success is not production deployment evidence.",
      "HTTP smoke observations do not prove load, security, or user usefulness."
    ],
    humanReview: { status: "pending" }
  };
}

export function buildDeploymentReceipt({ plan, deployedSnapshot, transition = "previous-to-released" }) {
  if (!plan || plan.schemaVersion !== RELEASE_PLAN_SCHEMA_VERSION || plan.status !== "planned") throw new Error("valid release plan is required");
  const deployed = validateSnapshot(deployedSnapshot, "deployed");
  if (deployed.bundleSha256 !== plan.subject.snapshot.bundleSha256) throw new Error("deployed snapshot does not match release subject bytes");
  return {
    schemaVersion: DEPLOYMENT_RECEIPT_SCHEMA_VERSION,
    releaseId: plan.releaseId,
    target: { ...plan.target },
    transition,
    sourceBundleSha256: plan.subject.snapshot.bundleSha256,
    deployedBundleSha256: deployed.bundleSha256,
    hashMatch: true,
    status: "executed",
    statement: "The exact release subject bytes were copied into the repository-owned CI staging target and verified after deployment.",
    humanReview: { status: "pending" }
  };
}

export function buildRuntimeObservation({ plan, phase, baseUrl, checks }) {
  if (!plan || plan.schemaVersion !== RELEASE_PLAN_SCHEMA_VERSION) throw new Error("valid release plan is required");
  if (!Array.isArray(checks) || checks.length === 0) throw new Error("runtime observation requires checks");
  const normalized = checks.map((check, index) => ({
    id: requiredText(check?.id ?? `observation-${index + 1}`, `checks ${index + 1} id`),
    path: requiredText(check?.path, `checks ${index + 1} path`),
    status: check?.status === "passed" ? "passed" : "failed",
    httpStatus: Number(check?.httpStatus),
    assertion: requiredText(check?.assertion, `checks ${index + 1} assertion`)
  }));
  if (normalized.some((check) => check.status !== "passed" || check.httpStatus !== 200)) throw new Error("runtime observation may claim success only when every recorded HTTP check passed with status 200");
  return {
    schemaVersion: RUNTIME_OBSERVATION_SCHEMA_VERSION,
    releaseId: plan.releaseId,
    target: { ...plan.target },
    phase: requiredText(phase, "phase"),
    baseUrl: requiredText(baseUrl, "baseUrl"),
    checks: normalized,
    status: "observed",
    statement: "These HTTP checks were observed against the staged deployment directory served at runtime.",
    doesNotProve: [
      "Production availability or correctness.",
      "Load, latency, durability, or security properties.",
      "Human usefulness or product acceptance."
    ],
    humanReview: { status: "pending" }
  };
}

export function buildRollbackReceipt({ plan, fromSnapshot, restoredSnapshot, observation }) {
  if (!plan || plan.schemaVersion !== RELEASE_PLAN_SCHEMA_VERSION) throw new Error("valid release plan is required");
  const from = validateSnapshot(fromSnapshot, "rollback.from");
  const restored = validateSnapshot(restoredSnapshot, "rollback.restored");
  if (from.bundleSha256 !== plan.subject.snapshot.bundleSha256) throw new Error("rollback must start from the released subject snapshot");
  if (restored.bundleSha256 !== plan.previous.snapshot.bundleSha256) throw new Error("rollback result does not match the retained previous snapshot");
  if (!observation || observation.schemaVersion !== RUNTIME_OBSERVATION_SCHEMA_VERSION || observation.status !== "observed") throw new Error("rollback requires a successful runtime observation of the restored snapshot");
  return {
    schemaVersion: ROLLBACK_RECEIPT_SCHEMA_VERSION,
    releaseId: plan.releaseId,
    target: { ...plan.target },
    fromBundleSha256: from.bundleSha256,
    restoredBundleSha256: restored.bundleSha256,
    previousBundleSha256: plan.previous.snapshot.bundleSha256,
    hashMatch: true,
    status: "executed",
    statement: "Rollback replaced the staging target with the retained previous snapshot and the restored entrypoint was observed successfully.",
    observationPhase: observation.phase,
    humanReview: { status: "pending" }
  };
}

export function releaseCapabilitySummary() {
  return {
    staging: "partial",
    production: "unavailable",
    statement: "Repository-owned CI staging is supported for proving deployment, runtime observations, and rollback. Production deployment remains disconnected and unauthorized."
  };
}
