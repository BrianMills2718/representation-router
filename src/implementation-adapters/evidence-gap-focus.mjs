import { constraintValue, decisionValue } from "../implementation-brief.mjs";

export const EVIDENCE_GAP_ADAPTER_ID = "evidence-gap-focus/v0";
export const EVIDENCE_GAP_ADAPTER_VERSION = "0.1";
export const EVIDENCE_GAP_BASELINE_REVISION = "c746125d6dec518ca0ba2df0a278890bb408df35";

const DEFAULT_FOCUS = new Set(["all-items", "gaps-first"]);
const GROUPING = new Set(["by-requirement", "flat-list"]);
const COVERED_ITEMS = new Set(["show", "collapse"]);

function unsupported(reason) {
  return { supported: false, reasons: [reason] };
}

function values(brief) {
  return {
    defaultFocus: decisionValue(brief, "default-focus"),
    grouping: decisionValue(brief, "grouping"),
    coveredItems: decisionValue(brief, "covered-items"),
    sourceAuthority: constraintValue(brief, "source-authority"),
    revisionPolicy: constraintValue(brief, "revision-policy"),
    requirementMutation: constraintValue(brief, "requirement-mutation"),
    evidenceMutation: constraintValue(brief, "evidence-mutation"),
    approvalMutation: constraintValue(brief, "approval-mutation")
  };
}

function behaviorChanges(value) {
  return [
    {
      id: "default-focus",
      question: "What should the reviewer see first?",
      value: value.defaultFocus,
      explanation: value.defaultFocus === "gaps-first"
        ? "Open focused on requirements that lack executed evidence or still require human judgment."
        : "Open with the complete requirement set visible."
    },
    {
      id: "grouping",
      question: "How should review items be organized?",
      value: value.grouping,
      explanation: value.grouping === "by-requirement"
        ? "Keep each requirement with its evidence status, evidence references, and open question."
        : "Show one flat review list while preserving stable requirement IDs."
    },
    {
      id: "covered-items",
      question: "How should already-supported items appear?",
      value: value.coveredItems,
      explanation: value.coveredItems === "collapse"
        ? "Keep supported items available but visually compact when the reviewer is focused on gaps."
        : "Keep supported items fully expanded whenever they are visible."
    }
  ];
}

export const evidenceGapFocusAdapter = {
  adapterId: EVIDENCE_GAP_ADAPTER_ID,
  version: EVIDENCE_GAP_ADAPTER_VERSION,
  featureId: "evidence-gap-focus",
  briefSchemaVersions: ["implementation-brief/v1"],
  runtimeId: "evidence-gap-focus-runtime/v0",
  runtime: {
    id: "evidence-gap-focus-runtime/v0",
    configFile: "implementation-runner-evidence-gap-v0/vite.config.js",
    generatedDir: "implementation-runner-evidence-gap-v0/generated"
  },
  authoring: {
    title: "Focus review on evidence gaps",
    summary: "Help a reviewer spend attention on requirements that still lack executed evidence or human judgment while preserving source truth.",
    baselineRevision: EVIDENCE_GAP_BASELINE_REVISION,
    defaultOutcome: "When I review a software change, help me focus quickly on requirements that still need stronger evidence or human judgment, without changing the underlying requirements, evidence, or approval state.",
    defaultSuccessCriterion: "I can focus on open evidence needs, switch back to all requirements, change grouping, and understand why each item is supported or open while every source record remains read-only.",
    decisions: [
      {
        id: "default-focus",
        label: "What should I see first?",
        defaultValue: "gaps-first",
        options: [
          { value: "gaps-first", label: "Needs evidence first", explanation: "Start with requirements that still lack executed evidence or human judgment." },
          { value: "all-items", label: "All requirements", explanation: "Start with the complete exact requirement set visible." }
        ]
      },
      {
        id: "grouping",
        label: "How should the review be organized?",
        defaultValue: "by-requirement",
        options: [
          { value: "by-requirement", label: "Keep each requirement with its evidence", explanation: "Use one review card per stable requirement ID." },
          { value: "flat-list", label: "Use a compact flat list", explanation: "Show one list while preserving stable requirement identity." }
        ]
      },
      {
        id: "covered-items",
        label: "How should already-supported items appear?",
        defaultValue: "collapse",
        options: [
          { value: "collapse", label: "Keep them compact", explanation: "Make open gaps more prominent while supported items stay available." },
          { value: "show", label: "Keep them expanded", explanation: "Show the same detail level for supported and open items." }
        ]
      }
    ],
    constraints: [
      { id: "source-authority", label: "Who owns requirement/evidence truth?", value: "read-only-source-owned", explanation: "The review surface reads source records but does not own them." },
      { id: "revision-policy", label: "Which source version is reviewed?", value: "exact-revision-only", explanation: "Review remains bound to the exact represented revision." },
      { id: "requirement-mutation", label: "Can this edit requirement state?", value: "forbidden", explanation: "Filtering/grouping cannot change requirement truth." },
      { id: "evidence-mutation", label: "Can this edit evidence state?", value: "forbidden", explanation: "The candidate cannot create or alter execution evidence." },
      { id: "approval-mutation", label: "Can this approve a review?", value: "forbidden", explanation: "Human/workflow approval remains outside this read-only surface." }
    ],
    acceptanceScenarios: [
      {
        id: "focus-open-items",
        title: "Focus on open evidence needs",
        given: "the review contains requirements with different evidence strength or human-review state",
        when: "I choose Needs evidence",
        then: "the presentation emphasizes requirements that still lack executed evidence or human judgment"
      },
      {
        id: "return-all-items",
        title: "Return to the complete review",
        given: "I am focused on evidence gaps",
        when: "I choose All requirements",
        then: "every requirement in the exact source revision is visible again"
      },
      {
        id: "presentation-only",
        title: "Keep source truth unchanged",
        given: "I change focus, grouping, or supported-item expansion",
        when: "the presentation changes",
        then: "requirement state, evidence state, and approval state remain unchanged"
      }
    ]
  },

  supports(brief) {
    if (brief?.featureId !== this.featureId) return unsupported(`featureId ${brief?.featureId ?? "<missing>"} is not supported by ${this.adapterId}`);
    if (!this.briefSchemaVersions.includes(brief?.sourceSchemaVersion)) return unsupported(`brief schema ${brief?.sourceSchemaVersion ?? "<missing>"} is not supported by ${this.adapterId}`);
    if (brief?.baselineRevision !== EVIDENCE_GAP_BASELINE_REVISION) return unsupported(`baseline revision ${brief?.baselineRevision ?? "<missing>"} is not supported by this adapter`);

    const value = values(brief);
    if (!DEFAULT_FOCUS.has(value.defaultFocus)) return unsupported(`default-focus ${value.defaultFocus ?? "<missing>"} is unsupported`);
    if (!GROUPING.has(value.grouping)) return unsupported(`grouping ${value.grouping ?? "<missing>"} is unsupported`);
    if (!COVERED_ITEMS.has(value.coveredItems)) return unsupported(`covered-items ${value.coveredItems ?? "<missing>"} is unsupported`);
    if (value.sourceAuthority !== "read-only-source-owned") return unsupported("source-authority must remain read-only-source-owned");
    if (value.revisionPolicy !== "exact-revision-only") return unsupported("revision-policy must remain exact-revision-only");
    if (value.requirementMutation !== "forbidden") return unsupported("requirement-mutation must remain forbidden");
    if (value.evidenceMutation !== "forbidden") return unsupported("evidence-mutation must remain forbidden");
    if (value.approvalMutation !== "forbidden") return unsupported("approval-mutation must remain forbidden");
    return { supported: true, reasons: [] };
  },

  plan(brief) {
    const support = this.supports(brief);
    if (!support.supported) throw new Error(support.reasons.join("; "));
    const value = values(brief);
    return {
      runtimeId: this.runtimeId,
      behaviorChanges: behaviorChanges(value),
      fixedConstraints: [
        "Requirement and evidence records remain source-owned and read-only.",
        "The review stays bound to the exact source revision.",
        "Filtering and grouping change presentation only.",
        "Requirement state cannot be edited from the candidate.",
        "Evidence state cannot be edited from the candidate.",
        "Human approval/review state cannot be changed from the candidate."
      ],
      generatedFiles: ["candidate/index.html", "candidate-spec.json", "implementation-plan.json"],
      plannedChecks: ["npm test", "build the Evidence Gap Focus runner candidate"]
    };
  },

  candidateSpec(brief) {
    const support = this.supports(brief);
    if (!support.supported) throw new Error(support.reasons.join("; "));
    const value = values(brief);
    return {
      schemaVersion: "candidate-spec/v0",
      runtimeId: this.runtimeId,
      adapterId: this.adapterId,
      adapterVersion: this.version,
      featureId: brief.featureId,
      briefSchemaVersion: brief.sourceSchemaVersion,
      briefBaselineRevision: brief.baselineRevision,
      subjectRevision: EVIDENCE_GAP_BASELINE_REVISION,
      outcome: brief.outcome,
      successCriterion: brief.successCriterion,
      decisions: {
        defaultFocus: value.defaultFocus,
        grouping: value.grouping,
        coveredItems: value.coveredItems
      },
      acceptanceScenarios: brief.acceptanceScenarios.map((scenario) => ({ ...scenario })),
      authority: {
        sourceRecords: "read-only",
        requirementWrite: false,
        evidenceWrite: false,
        approvalWrite: false,
        repositoryWriteFromBrowser: false
      }
    };
  }
};
