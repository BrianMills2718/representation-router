import { buildViewSpec, route } from "./router.mjs";
import { buildCompositionPlan } from "./composition-plan.mjs";
import { selectQualityMethod } from "./quality-plan.mjs";
import { selectImplementationPlaybook } from "./playbook-plan.mjs";
import { selectInterfacePatterns } from "./interface-pattern-plan.mjs";
import { assertContract } from "./schema-validation.mjs";

const taskInteractions = {
  inspect: "details-on-demand",
  lookup: "search-focus",
  locate: "search-focus",
  navigate: "search-focus",
  filter: "filter",
  trace: "path-highlighting",
  compare: "linked-highlighting",
  scrub: "scrub-step",
  simulate: "play-pause",
  edit: "direct-manipulation",
  create: "direct-manipulation",
  modify: "direct-manipulation",
  aggregate: "semantic-zoom",
  "decode-notation": "progressive-model-reveal"
};

export function inferInteractionPatterns(useCase, interactionCatalog, viewSpec = null) {
  const available = new Set(interactionCatalog.patterns.map((pattern) => pattern.id));
  const result = [];
  for (const task of useCase.tasks ?? []) {
    const id = taskInteractions[task];
    if (id && available.has(id) && !result.includes(id)) result.push(id);
  }
  if ((useCase.tasks ?? []).includes("decode-notation") && useCase.audience?.notationFamiliarity === "novice" && available.has("guided-onboarding")) result.push("guided-onboarding");

  const learning = useCase.learning;
  if (learning) {
    const outcomes = new Set(learning.outcomes ?? []);
    if (learning.entryMode === "guided" && available.has("guided-onboarding")) result.push("guided-onboarding");
    if ((learning.predictionBeforeReveal || outcomes.has("prediction")) && available.has("prediction-before-reveal")) result.push("prediction-before-reveal");
    if (outcomes.has("composition") && available.has("constructive-model-practice")) result.push("constructive-model-practice");
    if ((learning.scaffolding === "fading" || outcomes.has("fluency")) && available.has("scaffolding-fade")) result.push("scaffolding-fade");
    if ((learning.unseenTransfer || outcomes.has("transfer") || outcomes.has("fluency")) && available.has("transfer-assessment")) result.push("transfer-assessment");
  }

  if (useCase.constraints?.provenance && available.has("provenance-inspector")) result.push("provenance-inspector");
  if ((useCase.semanticLenses?.length ?? 0) > 1 && available.has("semantic-lens-toggle")) result.push("semantic-lens-toggle");
  if ((useCase.requiredCapabilities ?? []).includes("baseline-focal-trace") && available.has("baseline-focal-trace")) result.push("baseline-focal-trace");
  if ((useCase.requiredCapabilities ?? []).includes("scroll-linked-narrative") && available.has("scroll-linked-narrative")) result.push("scroll-linked-narrative");
  if ((useCase.requiredCapabilities ?? []).includes("direct-rule-probe") && available.has("direct-rule-probe")) result.push("direct-rule-probe");
  if ((useCase.requiredCapabilities ?? []).includes("linked-abstraction-levels") && available.has("linked-abstraction-ladder")) result.push("linked-abstraction-ladder");
  if ((useCase.requiredCapabilities ?? []).includes("prediction-before-reveal") && available.has("prediction-before-reveal")) result.push("prediction-before-reveal");
  if ((useCase.requiredCapabilities ?? []).includes("constructive-model-practice") && available.has("constructive-model-practice")) result.push("constructive-model-practice");
  if ((useCase.requiredCapabilities ?? []).includes("scaffolding-fade") && available.has("scaffolding-fade")) result.push("scaffolding-fade");
  if ((useCase.requiredCapabilities ?? []).includes("transfer-assessment") && available.has("transfer-assessment")) result.push("transfer-assessment");
  if ((useCase.scale?.items ?? 0) > 500 && viewSpec?.representation?.family === "graph" && available.has("neighborhood-expansion")) result.push("neighborhood-expansion");
  return [...new Set(result)];
}

function addScore(entry, points, reason, scored) {
  scored.score += points;
  scored.reasons.push(`${reason} (${points > 0 ? "+" : ""}${points})`);
}
function scoreImplementation(entry, useCase, viewSpec, context) {
  const scored = { entry, score: 0, reasons: [] };
  const family = viewSpec.representation.family;
  const items = useCase.scale?.items ?? 0;
  const editing = context.requiresEditing ?? (["authoring", "direct-manipulation"].includes(useCase.interaction?.mode) || (useCase.tasks ?? []).some((task) => ["edit", "create", "modify"].includes(task)));
  const largeGraph = family === "graph" && items >= 1000;
  const dynamic = ["animated", "simulated"].includes(useCase.interaction?.dynamics);

  if (entry.representationFamilies.includes(family)) addScore(entry, 7, `supports ${family}`, scored);
  if (entry.frameworks.includes(context.framework)) addScore(entry, 5, `fits ${context.framework}`, scored);
  if ((context.existingImplementations ?? []).includes(entry.id)) addScore(entry, 20, "already present in project", scored);
  if (entry.id === "native-web") addScore(entry, 3, "low-dependency baseline", scored);

  if (entry.id === "react-flow") {
    if (editing && ["graph", "hierarchy", "architecture", "state"].includes(family)) addScore(entry, 9, "strong direct-manipulation fit", scored);
    if (largeGraph && !editing) addScore(entry, -10, "large read-only graph is not its primary strength", scored);
  }
  if (entry.id === "cytoscape-js" && family === "graph") {
    addScore(entry, 7, "graph analysis and interaction fit", scored);
    if ((useCase.tasks ?? []).includes("trace")) addScore(entry, 3, "trace task benefits from graph operations", scored);
  }
  if (entry.id === "sigma-js") {
    if (largeGraph) addScore(entry, 13, "WebGL-oriented large graph fit", scored);
    if (editing) addScore(entry, -12, "editing requirement conflicts with exploration focus", scored);
  }
  return { scored, editing, largeGraph, dynamic };
}
function applySpecializedScores(scored, useCase, viewSpec, context, flags) {
  const { entry } = scored;
  const family = viewSpec.representation.family;
  const { editing, dynamic } = flags;

  if (entry.id === "graphviz") {
    if (["graph", "hierarchy", "architecture"].includes(family) && useCase.interaction?.dynamics === "static") addScore(entry, 7, "static automatic graph drawing fit", scored);
    if (editing) addScore(entry, -9, "not a direct manipulation editor", scored);
  }
  if (["d2", "mermaid", "plantuml", "structurizr"].includes(entry.id)) {
    if (context.preferTextSource) addScore(entry, 11, "text-sourced diagram requested", scored);
    if (editing) addScore(entry, -9, "rich direct manipulation is required", scored);
  }
  if (entry.id === "observable-plot" && ["temporal", "comparative"].includes(family)) addScore(entry, 9, "analytic visualization family fit", scored);
  if (entry.id === "d3") {
    if (context.customVisualization) addScore(entry, 12, "bespoke visualization requested", scored);
    if (dynamic) addScore(entry, 6, "fine-grained dynamic visualization fit", scored);
  }
  if (entry.id === "plantuml" && ["uml-class-diagram", "uml-component-diagram"].includes(viewSpec.representation.pattern)) addScore(entry, 4, "native UML notation", scored);
  if (entry.id === "structurizr" && viewSpec.representation.pattern === "uml-component-diagram") addScore(entry, 2, "one model generates the C4/component views", scored);
  if (viewSpec.representation.pattern === "port-graph") {
    if (entry.id === "react-flow") addScore(entry, 6, "handles give each node named, typed ports", scored);
    if (entry.id === "rete-js") addScore(entry, 4, "typed sockets are the native model", scored);
  }
  if (entry.id === "tldraw" && (family === "spatial" || editing && context.freeformCanvas)) addScore(entry, 10, "freeform spatial manipulation fit", scored);
  if (entry.id === "eclipse-glsp") {
    if (context.formalModeling && editing) addScore(entry, 14, "formal graphical language editor fit", scored);
    else addScore(entry, -8, "platform is heavy for this use case", scored);
  }
  if (entry.id === "sirius-web") {
    if (context.formalModeling && editing && context.multipleSynchronizedViews) addScore(entry, 17, "modeling studio with synchronized views fit", scored);
    else addScore(entry, -10, "modeling platform is heavy for this use case", scored);
  }
}
export function selectImplementation(useCase, viewSpec, implementationCatalog, context = {}) {
  const candidates = implementationCatalog.implementations
    .filter((entry) => entry.kind !== "layout-engine")
    .map((entry) => {
      const { scored, ...flags } = scoreImplementation(entry, useCase, viewSpec, context);
      applySpecializedScores(scored, useCase, viewSpec, context, flags);
      if (entry.id === "observable-plot" && viewSpec.representation.family === "matrix") {
        const analyticMatrix = (useCase.tasks ?? []).some((task) => ["compare", "correlate", "rank"].includes(task)) && !(useCase.tasks ?? []).includes("trace");
        if (analyticMatrix) addScore(entry, 9, "analytic matrix task fit", scored);
      }
      if (entry.id === "mermaid" && ["sequence", "state"].includes(viewSpec.representation.family)) addScore(entry, 4, "built-in diagram family fit", scored);
      if (["d2", "mermaid"].includes(entry.id) && ["animated", "simulated"].includes(useCase.interaction?.dynamics)) addScore(entry, -6, "dynamic interaction exceeds text-diagram strength", scored);
      return scored;
    })
    .sort((a, b) => b.score - a.score);

  const primary = candidates[0];
  const layout = chooseLayoutEngine(useCase, viewSpec, primary?.entry, implementationCatalog);
  return { primary, layout, alternatives: candidates.slice(1, 4) };
}

function chooseLayoutEngine(useCase, viewSpec, renderer, implementationCatalog) {
  if (!renderer || ["d2", "mermaid", "plantuml", "structurizr", "graphviz", "sigma-js", "sirius-web", "eclipse-glsp"].includes(renderer.id)) return null;
  const family = viewSpec.representation.family;
  const layout = viewSpec.representation.layout ?? "";
  const directed = (useCase.relationships ?? []).some((relationship) => /depend|invoke|preced|transition|propagat|contain|connect/i.test(relationship));
  if (/port/i.test(layout) || (["graph", "hierarchy", "architecture", "state"].includes(family) && (directed || /layer|state|hierarch/i.test(layout)))) {
    return implementationCatalog.implementations.find((entry) => entry.id === "elkjs") ?? null;
  }
  return null;
}

function validatedRecommendation(recommendation) {
  return assertContract("agent-recommendation", recommendation);
}

export function buildAgentRecommendation({ useCase, representationCatalog, representationRelations = { relations: [] }, heuristics, interactionCatalog, implementationCatalog, interfacePatternCatalog = null, qualityCatalog = null, playbookCatalog = null, compositionCatalog = null, context = {} }) {
  const routed = route(useCase, representationCatalog, heuristics, { limit: 5 });
  const interfacePatterns = interfacePatternCatalog ? selectInterfacePatterns(useCase, interfacePatternCatalog) : [];
  if (!routed.accepted.length) {
    const semanticAvailability = useCase.semanticAvailability ?? { status: "available", present: [], missing: [], note: null };
    const reasons = [...new Set(routed.rejected.flatMap((result) => result.rejectedBecause))];
    return validatedRecommendation({
      availability: {
        status: semanticAvailability.status,
        present: semanticAvailability.present ?? [],
        missing: semanticAvailability.missing ?? [],
        note: semanticAvailability.note ?? null
      },
      primary: null,
      alternatives: [],
      alternativesDetailed: [],
      avoid: routed.rejected.slice(0, 5).map((result) => ({ pattern: result.candidate.id, reason: result.rejectedBecause.join("; ") })),
      rationale: reasons.length ? reasons : ["No representation satisfies the current hard constraints."],
      assumptions: context.assumptions ?? [],
      interfacePatterns
    });
  }

  const selected = routed.accepted[0];
  const viewSpec = buildViewSpec(useCase, selected);
  const interactions = inferInteractionPatterns(useCase, interactionCatalog, viewSpec);
  const implementation = selectImplementation(useCase, viewSpec, implementationCatalog, context);
  const quality = selectQualityMethod(implementation.primary.entry.id, viewSpec, qualityCatalog, context);
  const playbook = selectImplementationPlaybook(implementation.primary.entry.id, viewSpec, playbookCatalog);
  const compositionPlan = compositionCatalog
    ? buildCompositionPlan({ useCase, selectedRepresentation: selected.candidate.id, catalog: compositionCatalog, context })
    : null;
  if (compositionPlan) {
    const known = new Set([...quality.hardChecks, ...quality.softChecks, ...(quality.usabilityChecks ?? [])]);
    quality.softChecks = [...quality.softChecks, ...compositionPlan.checks.filter((check) => !known.has(check))];
  }

  const avoid = routed.rejected.slice(0, 5).map((result) => ({
    pattern: result.candidate.id,
    reason: result.rejectedBecause.join("; ")
  }));
  if ((useCase.scale?.items ?? 0) > 1000 && useCase.informationStructure?.includes("network") && !avoid.some((item) => item.pattern === "full-network-node-link")) {
    avoid.unshift({ pattern: "full-network-node-link", reason: "Large networks should default to aggregation, search, neighborhood expansion, matrix, or overview + detail rather than a full hairball." });
  }

  const alternativeResults = routed.accepted.slice(1, 4);
  const relationFor = (alternativeId) => {
    const relation = (representationRelations.relations ?? []).find((item) =>
      (item.a === selected.candidate.id && item.b === alternativeId) ||
      (item.b === selected.candidate.id && item.a === alternativeId)
    );
    return relation ? {
      representation: alternativeId,
      relationshipToPrimary: relation.relationship,
      reason: relation.reason
    } : {
      representation: alternativeId,
      relationshipToPrimary: "unclassified",
      reason: "No reviewed substitute/complement relation is recorded for this pair yet."
    };
  };

  return validatedRecommendation({
    availability: viewSpec.availability,
    primary: {
      representation: selected.candidate.id,
      interaction: interactions,
      implementation: {
        renderer: implementation.primary.entry.id,
        layout: implementation.layout?.id ?? null,
        notes: implementation.primary.reasons,
        playbook
      }
    },
    alternatives: alternativeResults.map((result) => result.candidate.id),
    alternativesDetailed: alternativeResults.map((result) => relationFor(result.candidate.id)),
    avoid,
    rationale: selected.reasons,
    assumptions: context.assumptions ?? [],
    interfacePatterns,
    quality,
    compositionPlan,
    viewSpec
  });
}
