import { assertContract } from "./schema-validation.mjs";

export function buildCollectionSpec(viewSpecs, options = {}) {
  if (!Array.isArray(viewSpecs) || viewSpecs.length === 0) throw new Error("At least one ViewSpec is required.");
  const ids = viewSpecs.map((spec) => spec.id);
  const patterns = new Set(viewSpecs.map((spec) => spec.representation?.pattern).filter(Boolean));
  const medium = options.medium ?? viewSpecs.find((spec) => spec.surfaceContext?.medium)?.surfaceContext.medium ?? "other";
  const collectionSpec = {
    version: "0.1",
    id: options.id ?? `${medium}-collection`,
    medium,
    items: ids,
    heterogeneousRepresentations: patterns.size > 1,
    interactionContract: {
      preview: options.preview ?? "temporary preview without changing semantic selection",
      activate: options.activate ?? "persistent focus or selection",
      exit: options.exit ?? "explicit exit that restores the collection context",
      keyboardAccessible: true,
      essentialInformationRequiresHover: false,
      commonControlPlacement: options.commonControlPlacement ?? "adjacent to the representation or its overview",
      selectionDetail: {
        includeProperties: true,
        includeIncomingRelationships: true,
        includeOutgoingRelationships: true,
        includeEvidence: true,
        emptyStateRule: "Do not report no detail when governed relationships or evidence exist; distinguish genuinely sparse items from unavailable semantics."
      }
    },
    semanticContract: {
      sameClassSameMark: true,
      semanticAdjacencyDoesNotImplyIdentity: true,
      uiFocusDistinctFromSemanticEncoding: true,
      bindings: options.semanticBindings ?? []
    },
    qualityContract: {
      reviews: ["rendered-geometry", "human-composition", "novice-comprehension"],
      noviceQuestions: [
        "Can a newcomer identify the input or starting situation?",
        "Can a newcomer explain what changes or what comparison is being made?",
        "Can a newcomer identify the output, finding, or payoff in ordinary language?",
        "Are technical assurance mechanics secondary unless they are the stakeholder concern?"
      ],
      payoffStateGetsExtraDwell: options.payoffStateGetsExtraDwell ?? true,
      unavailableViewsMasqueradeAsCompleted: false
    }
  };
  return assertContract("collection-spec", collectionSpec);
}
