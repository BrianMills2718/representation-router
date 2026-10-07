function sourceMap(model) {
  return new Map((model?.sources ?? []).map((source) => [source.id, source]));
}

export function classifyRequirementEvidence(requirement, model) {
  if (!requirement || typeof requirement !== "object") throw new Error("requirement is required");
  const sources = sourceMap(model);
  const attached = (requirement.sourceIds ?? []).map((id) => sources.get(id)).filter(Boolean);
  const executionSources = attached.filter((source) => source.role === "execution-evidence");

  if (requirement.state === "needs-human-review") {
    return {
      status: "needs-human-review",
      label: "Still needs human review",
      gap: true,
      explanation: executionSources.length
        ? "Technical execution evidence is attached, but the source requirement still says human usefulness or acceptance is open."
        : "The source requirement still says human usefulness or acceptance is open."
    };
  }

  if (executionSources.length > 0) {
    return {
      status: "executed-evidence-attached",
      label: "Executed evidence attached",
      gap: false,
      explanation: "The requirement links to a source explicitly classified as execution evidence for this exact review subject."
    };
  }

  return {
    status: "needs-executed-evidence",
    label: "Needs stronger executed evidence",
    gap: true,
    explanation: "The requirement may have implementation, tests, or proving-case support, but this review model does not attach an execution-evidence source to it."
  };
}

export function buildEvidenceFocusItems(model) {
  if (!model || typeof model !== "object") throw new Error("review model is required");
  return (model.requirements ?? []).map((requirement) => ({
    id: requirement.id,
    title: requirement.title,
    question: requirement.question,
    sourceState: requirement.state,
    implementation: [...(requirement.implementation ?? [])],
    evidence: [...(requirement.evidence ?? [])],
    sourceIds: [...(requirement.sourceIds ?? [])],
    classification: classifyRequirementEvidence(requirement, model)
  }));
}

export function filterEvidenceFocusItems(items, focus) {
  if (focus === "all-items") return [...items];
  if (focus === "gaps-first") return items.filter((item) => item.classification.gap);
  throw new Error(`unsupported evidence focus: ${focus}`);
}
