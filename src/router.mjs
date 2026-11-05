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
  const missingCapabilities = [];
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

  // Some capabilities belong to the page, not the view: a detail pane, a shared selection, a filter bar or a
  // search box serve any view whose marks can be selected. On a page the reader can act on, they no longer
  // reject the view; the recommendation tells the surface to supply them (two skill ratings, 2026-09-26/30).
  const surfaceSupplied = [];
  const pageCanSupply = !["static", "playback"].includes(useCase.interaction?.dynamics) && useCase.constraints?.scripts !== "none";
  if (hardConstraints.respectRequiredCapabilities) {
    for (const capability of useCase.requiredCapabilities ?? []) {
      if (candidate.capabilities.includes(capability)) continue;
      if (pageCanSupply && heuristics.surfaceSuppliedCapabilities?.[capability]) {
        surfaceSupplied.push(capability);
        continue;
      }
      {
        rejectedBecause.push(`missing required capability: ${capability}`);
        missingCapabilities.push(capability);
      }
    }
  }

  // A static page cannot step, scroll-drive or animate. A -2 mismatch penalty let explainers and
  // composite views win static pages anyway (six skill ratings, 2026-09-30 to 10-05).
  if (hardConstraints.staticPagesRejectNonStaticForms && useCase.interaction?.dynamics === "static" && !candidate.dynamics.includes("static")) {
    rejectedBecause.push("has no static form, and the page is static");
  }

  // A clip plays by itself: nobody can click, hover, step or scroll it (a deck, an email, a feed).
  if (hardConstraints.playbackRejectsFormsNeedingInput && useCase.interaction?.dynamics === "playback" && !candidate.dynamics.includes("playback")) {
    rejectedBecause.push("needs a viewer to click, step or scroll, and the clip plays by itself");
  }

  // A list whose only detail is a link elsewhere gives a detail pane nothing to show; master-detail kept
  // winning link-out directories (skill rating 2026-10-01).
  const thinDetail = ["link-out", "none"].includes(useCase.itemDetail);
  if (hardConstraints.itemDetailRejectsEmptyInspector && thinDetail && candidate.needsItemDetail) {
    rejectedBecause.push(useCase.itemDetail === "link-out"
      ? "is built around a detail pane, and each item's only detail is a link elsewhere"
      : "is built around a detail pane, and the items have no detail beyond their row");
  }

  if (hardConstraints.respectDynamics && !candidate.dynamics.includes(useCase.interaction.dynamics)) {
    rejectedBecause.push(`does not support ${useCase.interaction.dynamics} dynamics`);
  }

  if (rejectedBecause.length) return { candidate, rejected: true, score: Number.NEGATIVE_INFINITY, reasons, rejectedBecause, missingCapabilities };

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
  // A view may name the media it is written for (an argument page reads as a portfolio, report or document page);
  // graph and flow views kept winning narrative portfolio pages (skill rating 2026-09-25).
  const medium = useCase.surfaceContext?.medium;
  score += scoreDimension(candidate.media ?? [], medium ? [medium] : [], weights.medium ?? 0, "medium", reasons);
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

  // A view that has a required capability itself still beats one that leans on the page for it.
  if (surfaceSupplied.length && penalties.surfaceSuppliedCapability) {
    const cost = penalties.surfaceSuppliedCapability * surfaceSupplied.length;
    score -= cost;
    reasons.push(`page must supply ${surfaceSupplied.join(", ")} (-${cost})`);
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

  // Results that arrive over time fill one screen in place: a scroll-driven story makes the reader chase them,
  // objects that keep their place let each stage land where the reader is already looking (skill rating 2026-09-30).
  if (["staged", "streaming"].includes(constraints.arrival?.mode)) {
    if (candidate.capabilities.includes("scroll-linked-narrative") && penalties.cannotShowArrival) {
      score -= penalties.cannotShowArrival;
      reasons.push(`scroll-driven while results arrive ${constraints.arrival.mode} (-${penalties.cannotShowArrival})`);
    }
    // A recorded clip plays what was rendered before the run; it cannot show this run's results arriving.
    const recordedOnly = candidate.dynamics.every((value) => value === "playback");
    if (recordedOnly && penalties.cannotShowArrival) {
      score -= penalties.cannotShowArrival;
      reasons.push(`recorded playback cannot show results arriving ${constraints.arrival.mode} (-${penalties.cannotShowArrival})`);
    } else if (candidate.capabilities.includes("fills-in-place") && weights.stablePlacesWhileArriving) {
      score += weights.stablePlacesWhileArriving;
      reasons.push(`objects keep their place as results arrive (+${weights.stablePlacesWhileArriving})`);
    }
  }

  if (useCase.itemDetail === "link-out" && candidate.capabilities.includes("link-out") && weights.linksOutDirectly) {
    score += weights.linksOutDirectly;
    reasons.push(`each item is a link out, and the view makes every row its link (+${weights.linksOutDirectly})`);
  }
  // The reverse: items with detail on this page lose it in a list that only sends the reader away.
  if (useCase.itemDetail === "in-page" && candidate.capabilities.includes("link-out") && !candidate.capabilities.includes("details-on-demand") && penalties.linkListHidesInPageDetail) {
    score -= penalties.linkListHidesInPageDetail;
    reasons.push(`items have detail on this page, and a link list only sends the reader away (-${penalties.linkListHidesInPageDetail})`);
  }

  // Signed effects need a zero line and two directions; estimates need their range drawn. A plain bar chart or
  // sequential heat map hid both (skill rating 2026-09-30: no interval or signed-effect views).
  const shapeCapability = { signed: "diverging-scale", interval: "uncertainty-interval" }[useCase.valueShape];
  if (shapeCapability && candidate.capabilities.includes("quantity")) {
    const what = useCase.valueShape === "signed" ? "values go either way from zero" : "each value is an estimate with a range";
    if (candidate.capabilities.includes(shapeCapability) && weights.showsValueShape) {
      score += weights.showsValueShape;
      reasons.push(`${what}, and the view draws ${useCase.valueShape === "signed" ? "the zero line and both directions" : "the range around each estimate"} (+${weights.showsValueShape})`);
    } else if (!candidate.capabilities.includes(shapeCapability) && penalties.hidesValueShape) {
      score -= penalties.hidesValueShape;
      reasons.push(`${what}, and the view would hide ${useCase.valueShape === "signed" ? "the sign" : "the range"} (-${penalties.hidesValueShape})`);
    }
  }

  // A run receipt needs a run: a panel embedded in a host or app, or results that arrive. Otherwise a plain
  // document page with inspect/confirm tasks drew the card (Codex review of the answer-receipt card).
  if (candidate.capabilities.includes("run-receipt") && penalties.receiptWithoutRun) {
    const medium = useCase.surfaceContext?.medium;
    const hasRun = (medium && (candidate.media ?? []).includes(medium)) || (useCase.constraints?.arrival && useCase.constraints.arrival.mode !== "at-once");
    if (!hasRun) {
      score -= penalties.receiptWithoutRun;
      reasons.push(`a run receipt needs a run (an embedded or app panel, or results that arrive), and this page has none (-${penalties.receiptWithoutRun})`);
    }
  }

  if (constraints.allowAggregation && candidate.maxItemsWithoutAggregation != null && itemCount > candidate.maxItemsWithoutAggregation && candidate.capabilities.includes("aggregation")) {
    reasons.push("scale requires aggregation; candidate explicitly supports it");
  }

  return { candidate, rejected: false, score, reasons, rejectedBecause, ...(surfaceSupplied.length ? { surfaceSupplied } : {}) };
}

export function route(useCase, catalog, heuristics, { limit = 5 } = {}) {
  const results = catalog.map((candidate) => scoreCandidate(candidate, useCase, heuristics));
  const accepted = results.filter((result) => !result.rejected);
  // Prefer candidates that share at least one information structure with the use case: a
  // project schedule kept appearing for questions with no dates (skill ratings 09-30, 10-04).
  // When nothing shares a structure, every accepted candidate stays in play.
  const structured = accepted.filter((result) => (result.candidate.structures ?? []).some((value) => (useCase.informationStructure ?? []).includes(value)));
  return {
    accepted: (structured.length ? structured : accepted).sort((a, b) => b.score - a.score).slice(0, limit),
    rejected: results.filter((result) => result.rejected),
    // Passed every hard constraint but shares no information structure while others do; listed so a
    // caller showing the whole catalog can say why these are missing from the ranking.
    setAside: structured.length ? accepted.filter((result) => !structured.includes(result)) : [],
    // Every accepted candidate, best first, so the avoid list can name weak fits beyond the limit.
    ranked: [...accepted].sort((a, b) => b.score - a.score)
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
