import { constraintValue, decisionValue } from "../implementation-brief.mjs";

export const SAVED_LAYOUTS_ADAPTER_ID = "saved-graph-layouts/v0";
export const SAVED_LAYOUTS_ADAPTER_VERSION = "0.1";
export const SAVED_LAYOUTS_BASELINE_REVISION = "b61f210a2e8749ca18ce78b61a0411fa62eafecd";

const REMEMBER_MODES = new Set(["automatic-after-drag", "explicit-save"]);
const RECEIPT_MODES = new Set(["visible-after-save", "quiet"]);
const RESET_MODES = new Set(["immediate-reset", "confirm-before-reset"]);

function unsupported(reason) {
  return { supported: false, reasons: [reason] };
}

function decisions(brief) {
  return {
    rememberMode: decisionValue(brief, "remember-mode"),
    saveReceipt: decisionValue(brief, "save-receipt"),
    resetMode: decisionValue(brief, "reset-mode"),
    storageScope: constraintValue(brief, "storage-scope"),
    revisionPolicy: constraintValue(brief, "revision-policy"),
    recordContents: constraintValue(brief, "record-contents"),
    storageFailure: constraintValue(brief, "storage-failure")
  };
}

function behaviorChanges(value) {
  return [
    {
      id: "remember-mode",
      question: "When should the arrangement become the saved version?",
      value: value.rememberMode,
      explanation: value.rememberMode === "explicit-save"
        ? "Dragging changes the working layout only; the person must choose Save arrangement to persist it."
        : "Dragging a node persists the arrangement automatically when the drag ends."
    },
    {
      id: "save-receipt",
      question: "Should successful saving be visibly acknowledged?",
      value: value.saveReceipt,
      explanation: value.saveReceipt === "visible-after-save"
        ? "Show a visible save receipt after persistence succeeds."
        : "Keep successful saves quiet while still surfacing storage failures."
    },
    {
      id: "reset-mode",
      question: "What should happen before a saved arrangement is deleted?",
      value: value.resetMode,
      explanation: value.resetMode === "confirm-before-reset"
        ? "Reset positions asks for confirmation before deleting the browser-local arrangement."
        : "Reset positions clears the browser-local arrangement immediately."
    }
  ];
}

export const savedGraphLayoutsAdapter = {
  adapterId: SAVED_LAYOUTS_ADAPTER_ID,
  version: SAVED_LAYOUTS_ADAPTER_VERSION,
  featureId: "saved-graph-layouts",
  briefSchemaVersions: ["implementation-brief/v0", "implementation-brief/v1"],
  runtimeId: "saved-graph-layouts-runtime/v0",
  runtime: {
    id: "saved-graph-layouts-runtime/v0",
    configFile: "implementation-runner-v0/vite.config.js",
    generatedDir: "implementation-runner-v0/generated"
  },
  authoring: {
    title: "Remember diagram arrangements",
    summary: "Let a person arrange a system diagram in a useful way and remember that presentation without changing the architecture itself.",
    baselineRevision: SAVED_LAYOUTS_BASELINE_REVISION,
    defaultOutcome: "When I rearrange a system diagram so it makes sense to me, remember that arrangement on this browser when I come back — without changing the actual system architecture.",
    defaultSuccessCriterion: "A saved arrangement returns on the same exact software revision, Reset positions restores deterministic defaults, and no semantic relationship is changed.",
    decisions: [
      {
        id: "remember-mode",
        label: "When should the arrangement be saved?",
        defaultValue: "automatic-after-drag",
        options: [
          { value: "automatic-after-drag", label: "Automatically after I move a box", explanation: "Dragging and releasing a box immediately remembers the new arrangement." },
          { value: "explicit-save", label: "Only when I choose Save arrangement", explanation: "Dragging is temporary until I explicitly save the arrangement." }
        ]
      },
      {
        id: "save-receipt",
        label: "Should saving be visibly acknowledged?",
        defaultValue: "visible-after-save",
        options: [
          { value: "visible-after-save", label: "Show me when it is saved", explanation: "Display an explicit receipt after saving succeeds." },
          { value: "quiet", label: "Save quietly", explanation: "Do not announce successful saves, but still surface failures." }
        ]
      },
      {
        id: "reset-mode",
        label: "What should happen before Reset positions clears my arrangement?",
        defaultValue: "immediate-reset",
        options: [
          { value: "immediate-reset", label: "Reset immediately", explanation: "Reset positions clears the saved arrangement without another confirmation step." },
          { value: "confirm-before-reset", label: "Ask me first", explanation: "Require confirmation before deleting the saved arrangement." }
        ]
      }
    ],
    constraints: [
      { id: "storage-scope", label: "Where is it remembered?", value: "browser-local", explanation: "This browser only; no account or cloud sync." },
      { id: "revision-policy", label: "When can it be restored?", value: "exact-revision-only", explanation: "Only for the exact represented software revision." },
      { id: "record-contents", label: "What is stored?", value: "node-id-and-position-only", explanation: "Only stable node IDs and x/y positions." },
      { id: "storage-failure", label: "What if browser storage fails?", value: "continue-without-persistence", explanation: "The diagram remains usable and says the arrangement will not be remembered." }
    ],
    acceptanceScenarios: [
      {
        id: "restore-same-revision",
        title: "Restore a saved arrangement",
        given: "I changed the diagram arrangement and saved it according to the selected save behavior",
        when: "I reopen the same workbench for the same exact software revision",
        then: "the last saved arrangement returns"
      },
      {
        id: "reset-layout",
        title: "Reset to the default arrangement",
        given: "a saved arrangement exists",
        when: "I complete the selected Reset positions behavior",
        then: "the saved arrangement is deleted and deterministic default positions return"
      },
      {
        id: "presentation-only",
        title: "Keep architecture truth unchanged",
        given: "I move, save, restore, or reset diagram positions",
        when: "the presentation changes",
        then: "graph relationships, evidence, requirements, and software authority remain unchanged"
      }
    ]
  },

  supports(brief) {
    if (brief?.featureId !== this.featureId) return unsupported(`featureId ${brief?.featureId ?? "<missing>"} is not supported by ${this.adapterId}`);
    if (!this.briefSchemaVersions.includes(brief?.sourceSchemaVersion)) return unsupported(`brief schema ${brief?.sourceSchemaVersion ?? "<missing>"} is not supported`);
    if (brief?.baselineRevision !== SAVED_LAYOUTS_BASELINE_REVISION) return unsupported(`baseline revision ${brief?.baselineRevision ?? "<missing>"} is not supported by this adapter`);
    const value = decisions(brief);
    if (!REMEMBER_MODES.has(value.rememberMode)) return unsupported(`remember-mode ${value.rememberMode ?? "<missing>"} is unsupported`);
    if (!RECEIPT_MODES.has(value.saveReceipt)) return unsupported(`save-receipt ${value.saveReceipt ?? "<missing>"} is unsupported`);
    if (!RESET_MODES.has(value.resetMode)) return unsupported(`reset-mode ${value.resetMode ?? "<missing>"} is unsupported`);
    if (value.storageScope !== "browser-local") return unsupported("storage-scope must remain browser-local");
    if (value.revisionPolicy !== "exact-revision-only") return unsupported("revision-policy must remain exact-revision-only");
    if (value.recordContents !== "node-id-and-position-only") return unsupported("record-contents must remain node-id-and-position-only");
    if (value.storageFailure !== "continue-without-persistence") return unsupported("storage-failure must remain continue-without-persistence");
    return { supported: true, reasons: [] };
  },

  plan(brief) {
    const support = this.supports(brief);
    if (!support.supported) throw new Error(support.reasons.join("; "));
    const value = decisions(brief);

    return {
      runtimeId: this.runtimeId,
      behaviorChanges: behaviorChanges(value),
      fixedConstraints: [
        "Saved state stays in this browser only.",
        "Saved state is bound to the exact represented software revision.",
        "Only node IDs and x/y coordinates are persisted.",
        "Storage failure does not block diagram use.",
        "Graph relationships and software authority remain source-owned."
      ],
      generatedFiles: ["candidate/index.html", "candidate-spec.json", "implementation-plan.json"],
      plannedChecks: ["npm test", "build the Saved Graph Layouts runner candidate"]
    };
  },

  candidateSpec(brief) {
    const support = this.supports(brief);
    if (!support.supported) throw new Error(support.reasons.join("; "));
    const value = decisions(brief);

    return {
      schemaVersion: "candidate-spec/v0",
      runtimeId: this.runtimeId,
      adapterId: this.adapterId,
      adapterVersion: this.version,
      featureId: brief.featureId,
      briefSchemaVersion: brief.sourceSchemaVersion,
      briefBaselineRevision: brief.baselineRevision,
      subjectRevision: "c746125d6dec518ca0ba2df0a278890bb408df35",
      outcome: brief.outcome,
      successCriterion: brief.successCriterion,
      decisions: { ...value },
      acceptanceScenarios: brief.acceptanceScenarios.map((scenario) => ({ ...scenario })),
      authority: {
        storage: "browser-local",
        semanticGraphWrite: false,
        repositoryWriteFromBrowser: false,
        productWriteFromBrowser: false
      }
    };
  }
};
