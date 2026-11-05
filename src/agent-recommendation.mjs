import { buildViewSpec, route } from "./router.mjs";
import { buildCompositionPlan, cannotInteract } from "./composition-plan.mjs";
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
  // Search, filter, highlight and reveal all need a reader who can act; a static page or a playback clip offers none.
  if (cannotInteract(useCase)) return [];
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

const PRINT_CHECK = "prints-on-paper-with-every-view-whole-nothing-clipped-or-collapsed-and-meaning-not-in-colour-alone";

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
  // The repo's own rule: "Drawing a node-and-link graph? Use the shared graph viewer." The scorer
  // used to send every read-only graph to cytoscape-js instead. The viewer has no named ports,
  // so port graphs stay with React Flow handles.
  if (entry.id === "graph-viewer" && entry.representationFamilies.includes(family) && !editing && !largeGraph && viewSpec.representation.pattern !== "port-graph") {
    addScore(entry, 14, "shared typed-graph/v1 viewer in this repository; vendor it rather than building a graph page", scored);
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

  // A table nobody interacts with reads best as a Markdown table in the document it belongs to; the
  // native-web baseline used to win it and bring an application playbook (panels, breakpoints, focus order).
  if (entry.id === "markdown") addScore(entry, 8, "a static table, list or argument belongs in the document as Markdown", scored);
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
  // Claude Motion runs only inside claude.ai (Team/Enterprise beta, no API), so an agent offers it, never builds with it.
  if (entry.id === "claude-motion") addScore(entry, -6, "hosted in claude.ai with no API; a person can use it, an agent cannot", scored);
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
    // Markdown cannot sort, filter or respond to the reader: only a static table may use it, however much the
    // project already uses it (a score penalty was outweighed by the existing-implementation bonus, Codex review).
    .filter((entry) => entry.id !== "markdown" || (["table", "list", "narrative", "card"].includes(viewSpec.representation.family) && useCase.interaction?.dynamics === "static"))
    .filter((entry) => deliveryAllows(entry, useCase.constraints))
    .map((entry) => {
      const { scored, ...flags } = scoreImplementation(entry, useCase, viewSpec, context);
      applySpecializedScores(scored, useCase, viewSpec, context, flags);
      if (useCase.constraints?.scripts === "none" && entry.viewTimeScript === "none") addScore(entry, 6, "outputs a static file (SVG or text), so the page carries no script", scored);
      if (entry.id === "observable-plot" && viewSpec.representation.family === "matrix") {
        const analyticMatrix = (useCase.tasks ?? []).some((task) => ["compare", "correlate", "rank"].includes(task)) && !(useCase.tasks ?? []).includes("trace");
        if (analyticMatrix) addScore(entry, 9, "analytic matrix task fit", scored);
      }
      if (entry.kind === "generative-ui" && !context.generativeUi) addScore(entry, -8, "the model writes this UI each turn; only for chat runtimes that ask for generated UI", scored);
      if (entry.id === "mermaid" && ["sequence", "state"].includes(viewSpec.representation.family)) addScore(entry, 4, "built-in diagram family fit", scored);
      if (["d2", "mermaid"].includes(entry.id) && ["animated", "simulated"].includes(useCase.interaction?.dynamics)) addScore(entry, -6, "dynamic interaction exceeds text-diagram strength", scored);
      return scored;
    })
    .sort((a, b) => b.score - a.score);

  const primary = candidates[0];
  if (primary) primary.reasons.push(...deliveryNotes(primary.entry, useCase.constraints));
  const layout = chooseLayoutEngine(useCase, viewSpec, primary?.entry, implementationCatalog);
  return { primary, layout, alternatives: candidates.slice(1, 4) };
}

/**
 * Whether an implementation can be delivered under the page's constraints: `scripts: "none"` rules out
 * anything that needs JavaScript when the page is read, `"self-contained"` rules out anything that needs a
 * running service, and `print` rules out output that cannot go on paper (video, WebGL).
 */
export function deliveryAllows(entry, constraints = {}) {
  if (constraints.scripts === "none" && entry.viewTimeScript === "required") return false;
  if (constraints.scripts && constraints.scripts !== "any" && entry.needsService) return false;
  if (constraints.print && entry.printable === false) return false;
  return true;
}

function deliveryNotes(entry, constraints = {}) {
  const notes = [];
  if (constraints.scripts === "none" && entry.viewTimeScript === "optional") notes.push("no JavaScript allowed: render to static SVG or HTML at build time; the page carries no script");
  if (constraints.scripts === "self-contained" && entry.viewTimeScript !== "none") notes.push("self-contained page: inline the library and styles into the file; no <script src> or stylesheet from another host");
  if (constraints.print) notes.push("must print: add a print stylesheet, expand scroll areas and collapsed sections, and keep meaning off colour alone");
  return notes;
}

function chooseLayoutEngine(useCase, viewSpec, renderer, implementationCatalog) {
  if (!renderer || ["d2", "mermaid", "plantuml", "structurizr", "graphviz", "sigma-js", "sirius-web", "eclipse-glsp"].includes(renderer.id)) return null;
  const family = viewSpec.representation.family;
  const layout = viewSpec.representation.layout ?? "";
  const elk = implementationCatalog.implementations.find((entry) => entry.id === "elkjs") ?? null;
  if (/port/i.test(layout)) return elk;
  if (!["graph", "hierarchy", "architecture", "state"].includes(family)) return null;
  const directed = linksAreDirected(useCase);
  // A catalog layout offering a choice (node-link-graph: "force-or-layered") is settled by direction:
  // two-way links get the force layout, one-way or unstated links the layered one.
  if (/-or-/.test(layout) && /layer/.test(layout)) return directed === false ? null : elk;
  return directed === true || /layer|state|hierarch/i.test(layout) ? elk : null;
}

/**
 * Whether the use case's links run one way: true when relationshipEnds lists a link not marked
 * directed:false, false when every listed link is, null when no ends are given. Direction used to be
 * guessed by matching relationship names against a word list (depend|invoke|...), which reads prose
 * meaning with a regex; the agent writing the use case knows the direction and states it instead.
 */
export function linksAreDirected(useCase) {
  const ends = useCase.relationshipEnds ?? [];
  if (!ends.length) return null;
  return ends.some((end) => end.directed !== false);
}

/**
 * The one-page composition method lists its checks for every page, but each check belongs to a
 * heuristic whose appliesWhen says which pages it is for. A check whose every owning heuristic is
 * out of scope is moved to quality.notApplicable with the reason, instead of asking the builder to
 * write an "na" line for it (a static Markdown page was asked for 46 lines, skill rating 2026-10-12).
 * Checks no heuristic owns stay. A repair step whose every owning heuristic (its `repair` field) is out of
 * scope leaves quality.repairOrder the same way, so the fix list never asks for what the checks excused.
 */
export function gateCompositionChecks(quality, compositionCatalog, applicableIds) {
  if (!quality || !compositionCatalog?.heuristics) return quality;
  const owners = new Map();
  for (const heuristic of compositionCatalog.heuristics) {
    if (!heuristic.check) continue;
    if (!owners.has(heuristic.check)) owners.set(heuristic.check, []);
    owners.get(heuristic.check).push(heuristic);
  }
  const notApplicable = [];
  const keep = (id) => {
    const owning = owners.get(id);
    if (!owning || owning.some((heuristic) => applicableIds.has(heuristic.id))) return true;
    notApplicable.push({ id, because: owning.map((heuristic) => `${heuristic.id} applies when ${heuristic.appliesWhen.join(" / ")}${heuristic.needsInteraction ? " and a reader can interact" : ""}`).join("; ") });
    return false;
  };
  quality.hardChecks = quality.hardChecks.filter(keep);
  quality.softChecks = quality.softChecks.filter(keep);
  quality.usabilityChecks = (quality.usabilityChecks ?? []).filter(keep);
  const repairOwners = new Map();
  for (const heuristic of compositionCatalog.heuristics) {
    if (!heuristic.repair) continue;
    if (!repairOwners.has(heuristic.repair)) repairOwners.set(heuristic.repair, []);
    repairOwners.get(heuristic.repair).push(heuristic);
  }
  quality.repairOrder = (quality.repairOrder ?? []).filter((id) => {
    const owning = repairOwners.get(id);
    if (!owning || owning.some((heuristic) => applicableIds.has(heuristic.id))) return true;
    notApplicable.push({ id, because: owning.map((heuristic) => `repair for ${heuristic.id}, which applies when ${heuristic.appliesWhen.join(" / ")}${heuristic.needsInteraction ? " and a reader can interact" : ""}`).join("; ") });
    return false;
  });
  if (notApplicable.length) quality.notApplicable = notApplicable;
  return quality;
}

function validatedRecommendation(recommendation) {
  return assertContract("agent-recommendation", recommendation);
}

/**
 * Splits requiredCapabilities into words some representation declares and words none does.
 * An unknown word used to reject every representation and return an empty result with no
 * hint why (skill rating 2026-09-29); now it is dropped as a hard constraint and named.
 */
export function partitionRequiredCapabilities(useCase, representationCatalog) {
  const known = new Set(representationCatalog.flatMap((candidate) => candidate.capabilities ?? []));
  const required = useCase.requiredCapabilities ?? [];
  return { known: required.filter((c) => known.has(c)), unknown: required.filter((c) => !known.has(c)) };
}

const shared = (a = [], b = []) => a.filter((value) => b.includes(value));

/** How tempting a view is for this question: structures, intents and tasks it shares with it. */
function plausibility(candidate, useCase) {
  return shared(candidate.structures, useCase.informationStructure).length
    + shared(candidate.intents, useCase.intent).length
    + shared(candidate.tasks, useCase.tasks).length;
}

/**
 * Views a builder should not use, with the reason. Ruled-out views come first, most tempting first
 * (a view sharing nothing with the question is not advice). When fewer than three are ruled out,
 * plausible views that score poorly fill the list as weak fits, so a builder always hears what not
 * to build and why (friction ledger avoid-list-empty: the list was empty whenever nothing failed a
 * hard constraint, and otherwise named the same five views in catalog order for every question).
 */
export function buildAvoidList(useCase, routed, { primary = null, keep = [], limit = 5, minimum = 3 } = {}) {
  const tempting = (results) => results
    .map((result) => ({ result, plausibility: plausibility(result.candidate, useCase) }))
    .filter((item) => item.plausibility > 0);
  const ruledOut = tempting(routed.rejected)
    .sort((a, b) => b.plausibility - a.plausibility)
    .slice(0, limit)
    .map(({ result }) => ({
      pattern: result.candidate.id, reason: result.rejectedBecause.join("; "), kind: "ruled-out",
      // Ruled out only for lacking capabilities the main view must supply: it can still sit beside it.
      ...(result.missingCapabilities?.length && result.missingCapabilities.length === result.rejectedBecause.length ? { lacks: result.missingCapabilities } : {})
    }));
  if (ruledOut.length >= minimum || !primary) return ruledOut;
  const skip = new Set([primary.candidate.id, ...keep]);
  const missingTasks = (candidate) => (useCase.tasks ?? []).filter((task) => !(candidate.tasks ?? []).includes(task));
  const weak = tempting((routed.ranked ?? []).filter((result) => !skip.has(result.candidate.id)))
    .sort((a, b) => b.plausibility - a.plausibility || a.result.score - b.result.score)
    .slice(0, minimum - ruledOut.length)
    .map(({ result }) => {
      const penalties = result.reasons.filter((reason) => /\(-\d+\)$/.test(reason));
      const missing = missingTasks(result.candidate);
      const parts = [`weak fit: scores ${result.score} against ${primary.score} for ${primary.candidate.id}`];
      if (missing.length) parts.push(`does not support task${missing.length > 1 ? "s" : ""} ${missing.join(", ")}`);
      parts.push(...penalties);
      return { pattern: result.candidate.id, reason: parts.join("; "), kind: "weak-fit" };
    });
  return [...ruledOut, ...weak];
}

export function buildAgentRecommendation({ useCase: requestedUseCase, representationCatalog, representationRelations = { relations: [] }, heuristics, interactionCatalog, implementationCatalog, interfacePatternCatalog = null, qualityCatalog = null, playbookCatalog = null, compositionCatalog = null, context = {} }) {
  const capabilities = partitionRequiredCapabilities(requestedUseCase, representationCatalog);
  const useCase = capabilities.unknown.length ? { ...requestedUseCase, requiredCapabilities: capabilities.known } : requestedUseCase;
  if (capabilities.unknown.length) {
    context = {
      ...context,
      assumptions: [
        ...(context.assumptions ?? []),
        `Ignored required capabilities no catalog representation declares: ${capabilities.unknown.join(", ")}. Use words from the representations' capabilities lists in catalog/representations.json, or add the capability to the representations that have it.`
      ]
    };
  }
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
      avoid: buildAvoidList(useCase, routed),
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
    ? buildCompositionPlan({ useCase, selectedRepresentation: selected.candidate.id, representation: selected.candidate, catalog: compositionCatalog, context })
    : null;
  if (useCase.constraints?.print && quality && !quality.hardChecks.includes(PRINT_CHECK)) quality.hardChecks = [...quality.hardChecks, PRINT_CHECK];
  if (compositionPlan && quality) {
    gateCompositionChecks(quality, compositionCatalog, new Set(compositionPlan.heuristics));
    const known = new Set([...quality.hardChecks, ...quality.softChecks, ...(quality.usabilityChecks ?? [])]);
    quality.softChecks = [...quality.softChecks, ...compositionPlan.checks.filter((check) => !known.has(check))];
  }

  const alternativeResults = routed.accepted.slice(1, 4);
  const avoid = buildAvoidList(useCase, routed, { primary: selected, keep: alternativeResults.map((result) => result.candidate.id) });
  if ((useCase.scale?.items ?? 0) > 1000 && useCase.informationStructure?.includes("network") && !avoid.some((item) => item.pattern === "full-network-node-link")) {
    avoid.unshift({ pattern: "full-network-node-link", reason: "Large networks should default to aggregation, search, neighborhood expansion, matrix, or overview + detail rather than a full hairball.", kind: "ruled-out" });
  }

  const relationFor = (alternativeId) => {
    const relation = (representationRelations.relations ?? []).find((item) =>
      (item.a === selected.candidate.id && item.b === alternativeId) ||
      (item.b === selected.candidate.id && item.a === alternativeId)
    );
    // Whether two views substitute or complement is a judgment the catalog fields do not encode: a rule
    // from shared tasks matched reviewed pairs 9 of 26 times, the best structural rule 32 of 46. So an
    // unrecorded pair stays "unclassified" rather than getting a guessed label.
    if (!relation) return { representation: alternativeId, relationshipToPrimary: "unclassified", reason: "No substitute/complement relation is recorded for this pair yet." };
    return { representation: alternativeId, relationshipToPrimary: relation.relationship, reason: relation.reason, source: relation.drafted ? "drafted" : "reviewed" };
  };

  return validatedRecommendation({
    availability: viewSpec.availability,
    primary: {
      representation: selected.candidate.id,
      interaction: interactions,
      implementation: {
        renderer: implementation.primary.entry.id,
        layout: implementation.layout?.id ?? null,
        notes: [
          ...implementation.primary.reasons,
          ...(["graph", "hierarchy", "architecture", "state"].includes(viewSpec.representation.family) && (useCase.relationships ?? []).length && linksAreDirected(useCase) === null
            && (implementation.layout ? /-or-/.test(viewSpec.representation.layout ?? "") : true)
            ? [implementation.layout
              ? "link direction not stated, so links are assumed one-way and laid out in layers; add relationshipEnds ({relationship, from, to, directed}) to settle it"
              : "link direction not stated: add relationshipEnds ({relationship, from, to, directed}) so a layered layout can be chosen for one-way links"]
            : [])
        ],
        playbook
      },
      ...(selected.surfaceSupplied?.length
        ? { surfaceSupplies: selected.surfaceSupplied.map((capability) => ({ capability, how: heuristics.surfaceSuppliedCapabilities[capability] })) }
        : {})
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
