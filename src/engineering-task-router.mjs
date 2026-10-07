export const ENGINEERING_TASK_ROUTER_VERSION = "engineering-task-router/v0";

const TASKS = [
  {
    id: "build",
    label: "Build something",
    question: "I want to add or change product behavior.",
    availability: "partial",
    keywords: ["build", "create", "add feature", "new feature", "change behavior", "implement"],
    canDoNow: [
      "Author either currently verified feature family through one generic Engineering Studio.",
      "Export implementation-brief/v1 with adapter-owned decisions and fixed authority constraints.",
      "Route supported briefs through registered implementation adapters, generate candidates, and retain exact CI receipts."
    ],
    missing: [
      "Broader feature/implementation adapter coverage beyond the two proving families.",
      "Generic product/domain design authoring outside currently registered feature contracts."
    ],
    routes: [
      { id: "engineering-studio", label: "Open Build authoring in Engineering Studio", href: "workflows/studio/index.html" },
      { id: "implementation-runner", label: "See a verified implementation loop", href: "workflows/implementation/index.html" }
    ],
    authority: "handoff-and-supported-implementation-only",
    lifecycleStages: ["outcome", "requirements", "design", "implementation", "verification", "review"]
  },
  {
    id: "fix",
    label: "Fix something",
    question: "Something is wrong and I need to understand and change it.",
    availability: "partial",
    keywords: ["fix", "bug", "broken", "failure", "error", "incident", "debug", "repair"],
    canDoNow: [
      "Record a revision-bound problem intent with observed vs expected behavior and reproduction evidence.",
      "Run deterministic diagnostic routing for the currently supported saved-layout reset-safety problem.",
      "Convert a supported diagnosis into implementation-brief/v1 and use the normal implementation runner/evidence loop."
    ],
    missing: [
      "Broader diagnostic adapter coverage.",
      "Runtime logs/traces/telemetry ingestion and diagnostic representations.",
      "Incident response and operational repair workflows."
    ],
    routes: [
      { id: "engineering-studio-fix", label: "Open Fix authoring in Engineering Studio", href: "workflows/studio/index.html" },
      { id: "fix-proof", label: "See the verified problem → diagnosis → fix example", href: "workflows/fix-proof/index.html" },
      { id: "understand-first", label: "Understand the system first", href: "workflows/understand/index.html" }
    ],
    authority: "diagnosis-and-supported-handoff-only",
    lifecycleStages: ["understand", "diagnose", "design", "implementation", "verification", "review"]
  },
  {
    id: "understand",
    label: "Understand the system",
    question: "Show me how the software is put together and how it works.",
    availability: "ready",
    keywords: ["understand", "explain", "architecture", "how it works", "system map", "dependencies", "sequence", "state"],
    canDoNow: [
      "Start from a plain-language overview.",
      "Explore component, sequence, and state views.",
      "Move graph elements, inspect relationships, and drill into requirements/evidence/source details."
    ],
    missing: [],
    routes: [
      { id: "understand-workbench", label: "Open system understanding workspace", href: "workflows/understand/index.html" }
    ],
    authority: "read-only-and-surface-local",
    lifecycleStages: ["requirements", "architecture", "design", "implementation-understanding", "evidence"]
  },
  {
    id: "review",
    label: "Review a change",
    question: "Help me judge a software change and the evidence behind it.",
    availability: "ready",
    keywords: ["review", "check change", "evidence", "requirements", "verify change", "inspect change", "approval"],
    canDoNow: [
      "Focus on requirements that still lack executed evidence or human judgment.",
      "Inspect exact evidence/source provenance.",
      "Keep executed checks distinct from human acceptance."
    ],
    missing: [
      "Authoritative approve/reject write-back remains product/workflow-owned rather than part of this read-only proving surface."
    ],
    routes: [
      { id: "review-evidence", label: "Open change evidence review", href: "workflows/review/index.html" }
    ],
    authority: "read-only-review",
    lifecycleStages: ["verification", "review"]
  },
  {
    id: "release",
    label: "Release something",
    question: "I want to ship a verified change and observe it safely.",
    availability: "partial",
    keywords: ["release", "deploy", "ship", "publish", "production", "rollout", "rollback"],
    canDoNow: [
      "Deploy an exact Engineering Home bundle into the repository-owned CI staging sandbox.",
      "Verify deployed bytes against the release subject.",
      "Observe staged routes over HTTP and retain runtime observations.",
      "Prove rollback to the retained previous staging snapshot and re-apply the intended release."
    ],
    missing: [
      "Product-owned production deployment target and credentials.",
      "Production approval and stale-revision policy.",
      "Production telemetry/observability integration.",
      "Production rollback authority."
    ],
    routes: [
      { id: "release-proof", label: "Open CI staging Release + Operate proof", href: "workflows/release/index.html" }
    ],
    authority: "repository-ci-staging-only-no-production-authority",
    lifecycleStages: ["release", "deployment", "runtime-observation", "rollback"]
  }
];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function listEngineeringTasks() {
  return TASKS.map(clone);
}

export function getEngineeringTask(id) {
  const task = TASKS.find((item) => item.id === id);
  return task ? clone(task) : null;
}

function scoreTask(query, task) {
  const normalized = query.toLowerCase();
  let score = 0;
  for (const keyword of task.keywords) {
    if (normalized.includes(keyword)) score += keyword.includes(" ") ? 3 : 2;
  }
  if (normalized === task.id) score += 10;
  if (normalized.includes(task.label.toLowerCase())) score += 5;
  return score;
}

export function routeEngineeringTask(input) {
  if (typeof input !== "string" || !input.trim()) return { status: "unrecognized", query: input ?? "", candidates: [] };
  const query = input.trim();
  const exact = TASKS.find((task) => task.id === query.toLowerCase());
  if (exact) return { status: "matched", query, task: clone(exact) };

  const scored = TASKS.map((task) => ({ task, score: scoreTask(query, task) })).filter((entry) => entry.score > 0);
  if (scored.length === 0) return { status: "unrecognized", query, candidates: [] };
  const max = Math.max(...scored.map((entry) => entry.score));
  const winners = scored.filter((entry) => entry.score === max);
  if (winners.length > 1) {
    return {
      status: "ambiguous",
      query,
      candidates: winners.map((entry) => ({ id: entry.task.id, label: entry.task.label, availability: entry.task.availability }))
    };
  }
  return { status: "matched", query, task: clone(winners[0].task) };
}

export const LIFECYCLE_CAPABILITIES = [
  { id: "outcome", label: "Outcome", availability: "partial", note: "Engineering Studio v1 authors outcomes for two verified feature families and one supported Fix pattern." },
  { id: "requirements", label: "Requirements", availability: "partial", note: "Acceptance scenarios and feature constraints are authorable for supported adapters; broad domain requirements remain source-owned." },
  { id: "design", label: "Design", availability: "partial", note: "Architecture/design views are strong for understanding; supported behavior decisions are authorable through adapters." },
  { id: "implement", label: "Implement", availability: "partial", note: "Two implementation adapters/runtimes and one diagnostic-to-implementation path are verified; unsupported work abstains." },
  { id: "verify", label: "Verify", availability: "partial", note: "Exact CI evidence/receipts work for supported Build and Fix proving loops." },
  { id: "review", label: "Review", availability: "ready", note: "Evidence-focused review and human-gate separation are available." },
  { id: "release", label: "Release", availability: "partial", note: "Repository-owned CI staging deployment, exact-byte verification, HTTP observation, rollback, and re-apply are verified; production is not connected." },
  { id: "operate", label: "Operate", availability: "partial", note: "Staging runtime observations exist for deployed routes; external telemetry, incidents, and production operations are not connected." }
];
