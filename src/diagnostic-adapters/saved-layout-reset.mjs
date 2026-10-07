import { buildImplementationBriefV1, createAuthoringDraft, updateDraftDecision } from "../implementation-authoring.mjs";
import { problemSignal } from "../problem-intent.mjs";
import { SAVED_LAYOUTS_BASELINE_REVISION } from "../implementation-adapters/saved-graph-layouts.mjs";

export const SAVED_LAYOUT_RESET_DIAGNOSTIC_ID = "saved-layout-reset-safety/v0";

function unsupported(reason) {
  return { supported: false, reasons: [reason] };
}

export const savedLayoutResetDiagnosticAdapter = {
  adapterId: SAVED_LAYOUT_RESET_DIAGNOSTIC_ID,
  version: "0.1",
  affectedCapability: "saved-graph-layouts",
  authoring: {
    title: "Reset positions clears an arrangement too easily",
    summary: "Use this when Reset positions removes a saved arrangement without the confirmation behavior you expected.",
    signalId: "reset-problem",
    signalValue: "clears-without-confirmation"
  },

  supports(intent) {
    if (intent?.affectedCapability !== this.affectedCapability) return unsupported(`affected capability ${intent?.affectedCapability ?? "<missing>"} is not supported by ${this.adapterId}`);
    if (intent?.baselineRevision !== SAVED_LAYOUTS_BASELINE_REVISION) return unsupported("problem baseline does not match the supported Saved Graph Layouts baseline");
    if (problemSignal(intent, "reset-problem") !== "clears-without-confirmation") return unsupported("problem signal reset-problem=clears-without-confirmation is required");
    if (problemSignal(intent, "desired-reset") !== "confirm-before-reset") return unsupported("desired-reset=confirm-before-reset is required");
    return { supported: true, reasons: [] };
  },

  diagnose(intent) {
    const support = this.supports(intent);
    if (!support.supported) throw new Error(support.reasons.join("; "));

    let draft = createAuthoringDraft("saved-graph-layouts");
    const currentRememberMode = problemSignal(intent, "remember-mode");
    const currentSaveReceipt = problemSignal(intent, "save-receipt");
    if (currentRememberMode) draft = updateDraftDecision(draft, "remember-mode", currentRememberMode);
    if (currentSaveReceipt) draft = updateDraftDecision(draft, "save-receipt", currentSaveReceipt);
    draft = updateDraftDecision(draft, "reset-mode", "confirm-before-reset");
    draft.outcome = intent.expectedBehavior;
    draft.successCriterion = "Reset positions asks before deleting the saved arrangement; cancelling preserves it; confirming clears only browser-local presentation state and restores deterministic defaults.";
    draft.acceptanceScenarios = [
      {
        id: "confirm-destructive-reset",
        title: "Ask before deleting the saved arrangement",
        given: "a saved diagram arrangement exists",
        when: "I choose Reset positions",
        then: "the product asks for confirmation before clearing the saved arrangement"
      },
      {
        id: "cancel-reset",
        title: "Cancelling reset preserves the arrangement",
        given: "the reset confirmation is open",
        when: "I cancel",
        then: "the current and saved arrangement remain unchanged"
      },
      {
        id: "confirm-reset",
        title: "Confirmed reset clears presentation state only",
        given: "the reset confirmation is open",
        when: "I confirm reset",
        then: "the saved browser-local positions are cleared, deterministic defaults return, and architecture truth remains unchanged"
      }
    ];

    const implementationBrief = buildImplementationBriefV1(draft);
    return {
      schemaVersion: "diagnosis/v0",
      problemId: intent.id,
      diagnosticAdapter: { id: this.adapterId, version: this.version },
      status: "diagnosed",
      summary: "The reported problem matches the supported Saved Graph Layouts destructive-reset behavior: the current reset choice is immediate, while the expected behavior requires confirmation.",
      observed: intent.observedBehavior,
      expected: intent.expectedBehavior,
      proposedChange: {
        featureId: "saved-graph-layouts",
        decisionId: "reset-mode",
        from: "immediate-reset",
        to: "confirm-before-reset"
      },
      preservedBehavior: {
        rememberMode: problemSignal(intent, "remember-mode") ?? "automatic-after-drag",
        saveReceipt: problemSignal(intent, "save-receipt") ?? "visible-after-save"
      },
      evidence: [...intent.evidence],
      nonclaims: [
        "This diagnosis does not prove every reset-related problem has the same cause.",
        "The diagnosis does not change product state or source code by itself.",
        "The proposed acceptance scenarios are planned checks until CI actually executes."
      ],
      implementationBrief
    };
  }
};
