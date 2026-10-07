/**
 * Page-level composition: applies catalog/composition-heuristics.json to a use
 * case before anything is drawn. The router's other catalogs choose marks; this
 * module says how the whole page should read, so that the sketch stage, the
 * build, and the review all work from one plan.
 */

const ALWAYS = "always";

/**
 * Every tag compositionTags can emit. A heuristic's appliesWhen must name at
 * least one of these, or it can never enter a plan (issue #62: eleven
 * heuristics were silently unreachable because they listed only prose).
 */
export const COMPOSITION_TAGS = Object.freeze([
  ALWAYS, "compare", "explanatory", "presentation", "review", "operational", "planning",
  "graph", "hypergraph", "map", "diagram", "composite-view", "over-time", "explorer",
  "interactive", "dashboard", "application-ui", "portfolio", "variants", "overview",
  "multi-device", "live", "guided", "authoring",
]);
const MEDIUM_TAGS = { dashboard: "dashboard", application: "application-ui", portfolio: "portfolio", presentation: "presentation" };

/** Tags a use case satisfies, matched against each heuristic's appliesWhen. */
export function compositionTags(useCase = {}, context = {}) {
  const tags = new Set([ALWAYS]);
  const intents = new Set(useCase.intent ?? []);
  const tasks = new Set(useCase.tasks ?? []);
  const structures = new Set(useCase.informationStructure ?? []);
  if (intents.has("compare") || tasks.has("compare")) tags.add("compare");
  // Schema intents are inspect/compare/understand/decide/create/modify/navigate/monitor/troubleshoot/communicate/trace.
  // Found by the 2026-09-25 portfolio review: the old words (explain/teach/present) never matched, so
  // one-drawing-with-callouts never entered a plan.
  if (intents.has("understand") || intents.has("communicate") || useCase.representationRole === "explanatory") tags.add("explanatory");
  if (intents.has("communicate")) tags.add("presentation");
  if (intents.has("review") || tasks.has("review") || intents.has("decide")) tags.add("review");
  if (intents.has("monitor") || intents.has("operate")) tags.add("operational");
  if (intents.has("plan")) tags.add("planning");
  if (structures.has("network") || structures.has("graph") || structures.has("hierarchy") || structures.has("hypergraph")) tags.add("graph");
  // n-ary facts in named roles: routes to keep-n-ary-relations-whole and the hypergraph forms
  if (structures.has("hypergraph")) tags.add("hypergraph");
  if (structures.has("spatial") || structures.has("map")) tags.add("map");
  if (structures.has("flow") || structures.has("sequence") || structures.has("state-machine")) tags.add("diagram");
  if (structures.size > 1) tags.add("composite-view");
  if (["dynamic", "interactive", "live"].includes(useCase.interaction?.dynamics) || structures.has("time-series") || structures.has("timeline")) tags.add("over-time");
  if (useCase.interaction?.mode === "exploratory") tags.add("explorer");
  if (["exploratory", "direct-manipulation", "authoring", "collaborative"].includes(useCase.interaction?.mode)
    || ["interactive", "animated", "simulated"].includes(useCase.interaction?.dynamics)) tags.add("interactive");
  const medium = MEDIUM_TAGS[useCase.surfaceContext?.medium];
  if (medium) tags.add(medium);
  if (useCase.surfaceContext?.repeatedCollection) tags.add("variants");
  if (useCase.abstractionLevel === "overview") tags.add("overview");
  if (useCase.constraints?.mobile) tags.add("multi-device");
  if (useCase.constraints?.realtime) tags.add("live");
  if (useCase.learning?.entryMode === "guided" || useCase.interaction?.mode === "guided") tags.add("guided");
  if (useCase.interaction?.mode === "authoring") tags.add("authoring");
  for (const tag of context.surfaceTags ?? []) tags.add(tag);
  return tags;
}

export function applicableHeuristics(catalog, useCase, context = {}) {
  const tags = compositionTags(useCase, context);
  return (catalog?.heuristics ?? []).filter((h) => (h.appliesWhen ?? []).some((tag) => tags.has(tag)));
}

const FORM_BY_STRUCTURE = {
  network: "map", graph: "map", hypergraph: "map", hierarchy: "map", spatial: "map", map: "map",
  flow: "flow", sequence: "flow", "state-machine": "flow", timeline: "flow", "time-series": "flow",
  matrix: "table", table: "table", list: "list", set: "list"
};

/** Objects a single screen can carry before it must aggregate or reveal on demand (Few-style budget). */
export function densityBudget(viewport = { width: 1440, height: 1000 }) {
  const area = (viewport.width ?? 1440) * (viewport.height ?? 1000);
  const maxObjects = Math.max(12, Math.min(60, Math.round(area / 36000)));
  return { viewport: { width: viewport.width ?? 1440, height: viewport.height ?? 1000 }, maxObjects, minMarginPx: 24 };
}

export function buildCompositionPlan({ useCase, selectedRepresentation, catalog, context = {} }) {
  const heuristics = applicableHeuristics(catalog, useCase, context);
  const structures = useCase.informationStructure ?? [];
  const primaryForm = FORM_BY_STRUCTURE[structures[0]] ?? "map";
  const entities = useCase.entities ?? [];
  const budget = densityBudget(context.viewport);
  const items = useCase.scale?.items ?? null;
  const hasTime = compositionTags(useCase, context).has("over-time");
  const ids = new Set(heuristics.map((h) => h.id));

  const secondary = [];
  if (ids.has("recognition-over-recall")) secondary.push({ id: "legend", job: "explain every encoding on the same screen" });
  if (ids.has("visibility-of-status")) secondary.push({ id: "status-line", job: "source, revision, freshness, and what is missing" });
  if (ids.has("space-and-time-together") && hasTime) secondary.push({ id: "time-strip", job: "show change over time beside the structure" });
  if (ids.has("overview-zoom-detail")) secondary.push({ id: "detail-panel", job: "what opens when an object is selected" });

  return {
    question: useCase.concern ?? null,
    audience: useCase.stakeholder ?? null,
    viewport: budget.viewport,
    primary: {
      representation: selectedRepresentation ?? null,
      form: primaryForm,
      carries: useCase.relationships ?? []
    },
    secondary,
    readingOrder: ["title", "primary", ...secondary.map((s) => s.id)],
    groups: entities.map((entity) => ({ id: entity, by: "entity kind", enclosed: false })),
    hierarchy: { levels: ["title", "primary", "secondary", "detail"], typeSizes: 3 },
    marks: Object.fromEntries(entities.map((entity) => [entity, `one mark for every ${entity}, reused in every view`])),
    emphasis: { channel: "one highlight colour", state: context.emphasisState ?? "selected" },
    densityBudget: {
      ...budget,
      items,
      withinBudget: items === null ? null : items <= budget.maxObjects,
      ifOver: "aggregate, filter, or reveal on demand; do not shrink"
    },
    revealOnClick: Object.fromEntries(entities.map((entity) => [entity, "its detail, its source, and what it connects to"])),
    coldReadTarget: useCase.concern ? `After a minute a newcomer can say what the page answers: ${useCase.concern}` : null,
    heuristics: heuristics.map((h) => h.id),
    sketchInstructions: heuristics.map((h) => h.sketchInstruction).filter(Boolean),
    checks: heuristics.map((h) => h.check).filter(Boolean)
  };
}
