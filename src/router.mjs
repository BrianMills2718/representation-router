import { assertContract } from "./schema-validation.mjs";

const overlap = (a = [], b = []) => a.filter((value) => b.includes(value));

function scoreDimension(candidateValues, requestedValues, weight, label, reasons) {
  const matches = overlap(candidateValues, requestedValues);
  if (!matches.length) return 0;
  const score = weight * matches.length;
  reasons.push(`${label}: ${matches.join(", ")} (+${score})`);
  return score;
}

function scoreExplanatoryFocus(candidate, useCase, weight, reasons) {
  return scoreDimension(candidate.focusFit ?? [], useCase.explanatoryFocus ?? [], weight, "explanatory focus", reasons);
}

const learningCapabilityMap = {
  orientation: ["guided-sequence", "progressive-model-reveal", "learn-explore-separation"],
  recognition: ["progressive-model-reveal"],
  prediction: ["prediction-before-reveal"],
  discrimination: ["semantic-class-disjointness", "stable-scrubbed-states"],
  composition: ["constructive-model-practice"],
  transfer: ["transfer-assessment"],
  fluency: ["scaffolding-fade", "transfer-assessment", "learn-explore-separation"]
};

export function inferLearningCapabilities(useCase) {
  const learning = useCase.learning;
  if (!learning) return [];
  const capabilities = new Set();
  for (const outcome of learning.outcomes ?? []) {
    for (const capability of learningCapabilityMap[outcome] ?? []) capabilities.add(capability);
  }
  if (learning.entryMode === "guided") {
    capabilities.add("guided-sequence");
    capabilities.add("progressive-model-reveal");
    capabilities.add("learn-explore-separation");
  }
  if (learning.scaffolding === "fading") capabilities.add("scaffolding-fade");
  if (learning.predictionBeforeReveal) capabilities.add("prediction-before-reveal");
  if (learning.unseenTransfer) capabilities.add("transfer-assessment");
  return [...capabilities];
}

export function scoreCandidate(candidate, useCase, heuristics) {
  const reasons = [];
  const rejectedBecause = [];
  const { weights, hardConstraints, penalties } = heuristics;
  const constraints = useCase.constraints ?? {};
  const itemCount = useCase.scale?.items ?? 0;
  const semanticAvailability = useCase.semanticAvailability ?? { status: "available", present: [], missing: [] };

  if (semanticAvailability.status === "unavailable") {
    const missing = semanticAvailability.missing?.length ? `: missing ${semanticAvailability.missing.join(", ")}` : "";
    rejectedBecause.push(`semantic view unavailable${missing}`);
  }

  if (hardConstraints.respectMaxItemsWithoutAggregation && candidate.maxItemsWithoutAggregation != null && itemCount > candidate.maxItemsWithoutAggregation) {
    if (!constraints.allowAggregation) {
      rejectedBecause.push(`scale ${itemCount} exceeds ${candidate.maxItemsWithoutAggregation} items without aggregation`);
    } else if (!candidate.capabilities.includes("aggregation")) {
      rejectedBecause.push(`scale ${itemCount} exceeds ${candidate.maxItemsWithoutAggregation} items and candidate does not support aggregation`);
    }
  }

  if (hardConstraints.respectRequiredCapabilities) {
    for (const capability of useCase.requiredCapabilities ?? []) {
      if (!candidate.capabilities.includes(capability)) rejectedBecause.push(`missing required capability: ${capability}`);
    }
  }

  if (hardConstraints.respectDynamics && !candidate.dynamics.includes(useCase.interaction.dynamics)) {
    rejectedBecause.push(`does not support ${useCase.interaction.dynamics} dynamics`);
  }

  if (rejectedBecause.length) return { candidate, rejected: true, score: Number.NEGATIVE_INFINITY, reasons, rejectedBecause };

  let score = 0;
  if (semanticAvailability.status === "partial") {
    const missing = semanticAvailability.missing?.length ? `; missing ${semanticAvailability.missing.join(", ")}` : "";
    reasons.push(`semantic availability: partial${missing}`);
  }
  score += scoreDimension(candidate.structures, useCase.informationStructure, weights.informationStructure, "structure", reasons);
  score += scoreDimension(candidate.intents, useCase.intent, weights.intent, "intent", reasons);
  score += scoreDimension(candidate.tasks, useCase.tasks, weights.task, "task", reasons);
  score += scoreExplanatoryFocus(candidate, useCase, weights.explanatoryFocus ?? 0, reasons);
  score += scoreDimension(candidate.representationRoles ?? [], useCase.representationRole ? [useCase.representationRole] : [], weights.representationRole ?? 0, "representation role", reasons);
  score += scoreDimension(candidate.abstractionLevels ?? [], useCase.abstractionLevel ? [useCase.abstractionLevel] : [], weights.abstractionLevel ?? 0, "abstraction", reasons);

  const learningCapabilities = inferLearningCapabilities(useCase);
  if (learningCapabilities.length) {
    const matches = overlap(candidate.capabilities ?? [], learningCapabilities);
    if (matches.length) {
      const learningScore = (weights.learningGoal ?? 0) * matches.length;
      score += learningScore;
      reasons.push(`learning outcomes: ${matches.join(", ")} (+${learningScore})`);
    }
  }

  score += scoreDimension(candidate.interactionModes, [useCase.interaction.mode], weights.interactionMode, "interaction", reasons);

  if (candidate.dynamics.includes(useCase.interaction.dynamics)) {
    score += weights.dynamics;
    reasons.push(`dynamics: ${useCase.interaction.dynamics} (+${weights.dynamics})`);
  } else {
    score -= penalties.dynamicsMismatch;
    reasons.push(`dynamics mismatch (-${penalties.dynamicsMismatch})`);
  }

  if (candidate.density.includes(useCase.scale.density)) {
    score += weights.density;
    reasons.push(`density: ${useCase.scale.density} (+${weights.density})`);
  } else {
    score -= penalties.unsupportedDensity;
    reasons.push(`poor fit for ${useCase.scale.density} density (-${penalties.unsupportedDensity})`);
  }

  if (constraints.provenance && candidate.capabilities.includes("provenance")) {
    score += weights.provenance;
    reasons.push(`supports provenance (+${weights.provenance})`);
  }

  if (constraints.accessibility === "high" && candidate.accessibility === "high") {
    score += weights.accessibility;
    reasons.push(`strong accessibility fit (+${weights.accessibility})`);
  }

  if (constraints.mobile) {
    if (candidate.mobileSuitability === "high") {
      score += weights.mobile;
      reasons.push(`strong mobile fit (+${weights.mobile})`);
    } else if (candidate.mobileSuitability === "low") {
      score -= penalties.lowMobileSuitability;
      reasons.push(`weak mobile fit (-${penalties.lowMobileSuitability})`);
    }
  }

  if (constraints.allowAggregation && candidate.maxItemsWithoutAggregation != null && itemCount > candidate.maxItemsWithoutAggregation && candidate.capabilities.includes("aggregation")) {
    reasons.push("scale requires aggregation; candidate explicitly supports it");
  }

  return { candidate, rejected: false, score, reasons, rejectedBecause };
}

export function route(useCase, catalog, heuristics, { limit = 5 } = {}) {
  const results = catalog.map((candidate) => scoreCandidate(candidate, useCase, heuristics));
  return {
    accepted: results.filter((result) => !result.rejected).sort((a, b) => b.score - a.score).slice(0, limit),
    rejected: results.filter((result) => result.rejected)
  };
}

const taskToInteraction = {
  filter: { trigger: "filter control", effect: "update visible subset", purpose: "Reduce the projection to relevant model elements." },
  trace: { trigger: "select model element", effect: "highlight related path", purpose: "Expose relationship chains without losing context." },
  inspect: { trigger: "select visual mark", effect: "open persistent details", purpose: "Reveal model properties and provenance on demand." },
  compare: { trigger: "select comparison set", effect: "link highlights across views", purpose: "Support consistent comparison across representations." },
  scrub: { trigger: "time/state scrubber", effect: "update current state", purpose: "Expose change over ordered states or time." },
  simulate: { trigger: "parameter control", effect: "recompute simulated state", purpose: "Make causal assumptions explorable." },
  edit: { trigger: "edit action", effect: "update semantic model", purpose: "Treat the representation as an editor, not only a picture." },
  sort: { trigger: "sort control", effect: "reorder visible items", purpose: "Make rank and comparison easier." },
  lookup: { trigger: "search or selection", effect: "focus matching element", purpose: "Reach a known model element quickly." },
  "decode-notation": { trigger: "model layer control", effect: "reveal the next semantic layer while preserving prior context", purpose: "Teach the visual grammar before exposing the full topology." }
};

export function buildViewSpec(useCase, rankedResult) {
  if (!rankedResult || rankedResult.rejected) throw new Error("A non-rejected ranked result is required to build a ViewSpec.");
  const candidate = rankedResult.candidate;
  const operations = [];
  if (useCase.tasks.includes("filter")) operations.push("filter");
  if (useCase.tasks.includes("sort")) operations.push("sort");
  if ((useCase.constraints?.allowAggregation ?? false) && candidate.maxItemsWithoutAggregation != null && useCase.scale.items > candidate.maxItemsWithoutAggregation && candidate.capabilities.includes("aggregation")) operations.push("aggregate");
  if (useCase.focus) operations.push("select");

  const interactions = useCase.tasks.map((task) => taskToInteraction[task]).filter(Boolean).filter((value, index, array) => array.findIndex((other) => other.trigger === value.trigger && other.effect === value.effect) === index);
  const provenanceEnabled = Boolean(useCase.constraints?.provenance);

  const viewSpec = {
    version: "0.1",
    id: `${useCase.id}--${candidate.id}`,
    concern: useCase.concern,
    viewpoint: {
      stakeholder: useCase.stakeholder ?? "unspecified stakeholder",
      intent: useCase.intent,
      tasks: useCase.tasks,
      ...(useCase.explanatoryFocus?.length ? { explanatoryFocus: useCase.explanatoryFocus } : {}),
      ...(useCase.audience ? { audience: useCase.audience } : {}),
      ...(useCase.learning ? { learning: useCase.learning } : {})
    },
    ...(useCase.successCriteria?.length ? { successCriteria: useCase.successCriteria } : {}),
    ...(useCase.surfaceContext ? { surfaceContext: useCase.surfaceContext } : {}),
    representationContext: { role: useCase.representationRole ?? null, abstractionLevel: useCase.abstractionLevel ?? null, concernHierarchy: useCase.concernHierarchy ?? null },
    availability: {
      status: useCase.semanticAvailability?.status ?? "available",
      present: useCase.semanticAvailability?.present ?? [],
      missing: useCase.semanticAvailability?.missing ?? [],
      note: useCase.semanticAvailability?.note ?? null
    },
    projection: { entities: useCase.entities ?? [], relationships: useCase.relationships ?? [], focus: useCase.focus ?? null, operations },
    representation: {
      pattern: candidate.id,
      family: candidate.family,
      dynamics: candidate.dynamics.includes(useCase.interaction.dynamics) ? useCase.interaction.dynamics : candidate.dynamics.includes("interactive") ? "interactive" : candidate.dynamics[0],
      layout: candidate.defaultLayout ?? null
    },
    interactions,
    ...(useCase.semanticLenses?.length ? { semanticLenses: useCase.semanticLenses } : {}),
    provenance: { enabled: provenanceEnabled, linkVisualMarksToModel: provenanceEnabled, showDerivedCalculation: provenanceEnabled, showEvidence: provenanceEnabled },
    rationale: rankedResult.reasons?.length
      ? rankedResult.reasons
      : [`Selected representation ${candidate.id} satisfies the current hard constraints.`]
  };

  return assertContract("view-spec", viewSpec);
}
