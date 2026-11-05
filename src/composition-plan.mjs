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
  "multi-device", "live", "guided", "authoring", "relational", "playback",
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
  // the page has named relationships to show, so drawing-only checks (relationships drawn, a drawing earns its space) apply
  if ((useCase.relationships ?? []).length) tags.add("relational");
  // Only dated subjects change over time. Interaction dynamics once counted ("interactive" matched), which put
  // a time strip on non-temporal pages (three skill ratings, 2026-09-29 and 2026-09-30).
  if (structures.has("timeline") || useCase.constraints?.realtime) tags.add("over-time");
  if (useCase.interaction?.dynamics === "playback") tags.add("playback");
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

// Nobody can click, hover or drag on a static page (Markdown, PDF, print) or in a clip that plays by itself.
// A page with no JavaScript cannot respond to the reader either, whatever its dynamics say.
export const cannotInteract = (useCase) => ["static", "playback"].includes(useCase.interaction?.dynamics) || useCase.constraints?.scripts === "none";

export function applicableHeuristics(catalog, useCase, context = {}) {
  const tags = compositionTags(useCase, context);
  // A heuristic whose check needs clicking or hovering does not apply where nobody can interact, even when
  // the page is a graph or a dashboard (issue #2: Mermaid diagrams in a static doc were asked for click-to-reveal).
  const noInput = cannotInteract(useCase);
  return (catalog?.heuristics ?? []).filter((h) => !(noInput && h.needsInteraction) && (h.appliesWhen ?? []).some((tag) => tags.has(tag)));
}

const FORM_BY_STRUCTURE = {
  network: "node-link", hypergraph: "matrix", hierarchy: "node-link", spatial: "map",
  process: "flow", sequence: "flow", "state-machine": "flow", timeline: "timeline",
  matrix: "matrix", table: "table", rules: "table", list: "table", scalar: "chart", document: "stepped-explainer"
};

/**
 * How each representation family draws a use case's object kinds and relationships. The plan's marks,
 * groups and reveal map are built from this grammar plus the use case's tasks, focus and relationshipEnds,
 * so they differ with the chosen view and the content; before 2026-10-25 they were one sentence repeated
 * per entity kind (friction ledger composition-plan-templated, 7 reports).
 * kinds(entities) returns [kind, role] pairs; `encloses` names the kind whose items become regions.
 */
const GRAMMAR = {
  graph: { form: "node-link", kinds: (e) => e.map((k) => [k, "node"]), link: "edge: arrow from source to target, labelled with the relationship name" },
  hierarchy: { form: "node-link", kinds: (e) => e.map((k) => [k, "tree node"]), link: "parent-to-child line; non-tree relationships as dashed cross-links", encloses: null },
  "data-model": { form: "node-link", kinds: (e) => e.map((k) => [k, "entity box listing its fields"]), link: "line with cardinality at each end" },
  architecture: { form: "node-link", kinds: (e) => e.map((k, i) => [k, i === 0 ? "layer band" : "component box inside its layer"]), link: "arrow between boxes, labelled", encloses: 0 },
  matrix: { form: "matrix", kinds: (e) => e.map((k, i) => [k, i === 0 ? "row" : i === 1 ? "column" : "row group or filter"]), link: "cell fill at the row-column crossing; empty cell means no link" },
  table: { form: "table", kinds: (e) => e.map((k, i) => [k, i === 0 ? "row" : "column holding the linked item"]), link: "a column naming the linked item" },
  temporal: { form: "timeline", kinds: (e) => e.map((k, i) => [k, i === 0 && e.length > 1 ? "lane" : "bar (interval) or point (event) on the shared time axis"]), link: "connector from earlier to later item", encloses: (e) => (e.length > 1 ? 0 : null) },
  comparative: { form: "chart", kinds: (e) => e.map((k, i) => [k, i === 0 ? "one bar or dot per item on a shared scale" : "colour or facet"]), link: "shared axis; links are not drawn" },
  flow: { form: "flow", kinds: (e) => e.map((k) => [k, "step box"]), link: "arrow along the direction of movement, labelled with what moves" },
  process: { form: "flow", kinds: (e) => e.map((k, i) => [k, i === 0 ? "swimlane" : "step box inside its lane"]), link: "arrow between steps; crossing a lane boundary is a handoff", encloses: 0 },
  sequence: { form: "flow", kinds: (e) => e.map((k, i) => [k, i === 0 ? "lifeline" : "message or activation"]), link: "horizontal message arrow, top to bottom in time order" },
  state: { form: "flow", kinds: (e) => e.map((k) => [k, "state node"]), link: "transition arrow labelled with its trigger" },
  spatial: { form: "map", kinds: (e) => e.map((k) => [k, "point or area at its location"]), link: "line between locations" },
  // A directory: the first kind is the row (its name is the link), a second kind is the group heading; nothing opens in place.
  list: { form: "list", kinds: (e) => e.map((k, i) => [k, i === 0 ? "row whose name is the link out, with one line on what is there" : "group heading the rows sit under"]), link: "the row itself is the link; no lines are drawn" },
  // An argument page: the first kind heads each section as the claim it proves; later kinds are the evidence under it.
  narrative: { form: "argument", kinds: (e) => e.map((k, i) => [k, i === 0 ? "section headed by the sub-claim it proves" : "evidence under the claim it supports (a figure, number, quote or link)"]), link: "evidence sits under the claim it supports; no lines are drawn" },
  // An answer-receipt card: the first kind is the headline answer, the second the evidence under it, a third the receipt strip.
  card: { form: "card", kinds: (e) => e.map((k, i) => [k, i === 0 ? "headline: the answer in one sentence, or the honest failure" : i === 1 ? "evidence line under the headline, with its source link" : "receipt strip at the foot: when, on what, how long, cost, trace link"]), link: "evidence sits under the answer it supports; no lines are drawn" },
  "application-ui": { form: "list-detail", kinds: (e) => e.map((k, i) => [k, i === 0 ? "list row" : "section of the detail pane"]), link: "link inside the detail pane to the related item" },
  "explorable-explanation": { form: "stepped-explainer", kinds: (e) => e.map((k) => [k, "actor drawn the same way in every step"]), link: "change between steps, shown by motion or before/after" },
  "animated-clip": { form: "stepped-explainer", kinds: (e) => e.map((k) => [k, "actor drawn the same way in every scene"]), link: "change between scenes" },
};

// Views whose marks differ from the rest of their family; looked up by view id before the family.
const VIEW_GRAMMAR = {
  "interval-plot": { form: "chart", kinds: (e) => e.map((k, i) => [k, i === 0 ? "row with a dot at the estimate and a line across its interval" : "colour or facet"]), link: "shared axis; links are not drawn", valueEncoding: "position on a shared axis with a reference line (zero, no change or target); the dot is the estimate, the line its interval, named in words (for example 95% confidence interval); an interval crossing the reference is not clearly different" },
  "signed-effect-matrix": { form: "matrix", kinds: (e) => e.map((k, i) => [k, i === 0 ? "row" : i === 1 ? "column" : "row group or filter"]), link: "cell value at the row-column crossing; lines are not drawn", valueColour: true, valueEncoding: "cell colour blue one way, grey at zero, orange the other way, strength by size of effect; the signed value is printed in each cell and a legend names what each direction means" },
};

// Colours a red-green colourblind reader can tell apart, each named in words beside the mark.
const COLOURS = ["blue", "orange", "grey"];
const SHAPES = ["rounded box", "circle", "diamond", "hexagon"];
// Kinds a reader can tell apart at a glance; past this a plan says so instead of handing out more channels.
const DISTINCT_KINDS = COLOURS.length + SHAPES.length - 1;

/** Objects a single screen can carry before it must aggregate or reveal on demand (Few-style budget). */
export function densityBudget(viewport = { width: 1440, height: 1000 }) {
  const area = (viewport.width ?? 1440) * (viewport.height ?? 1000);
  const maxObjects = Math.max(12, Math.min(60, Math.round(area / 36000)));
  return { viewport: { width: viewport.width ?? 1440, height: viewport.height ?? 1000 }, maxObjects, minMarginPx: 24 };
}

/** A common phone screen in CSS pixels; used when the use case says mobile and the caller names no viewport. */
export const PHONE_VIEWPORT = Object.freeze({ width: 390, height: 844 });
const PHONE_MAX_WIDTH = 600;

/** The screen a use case is planned for, with its density budget and one budget per declared screen. */
export function planViewport(useCase = {}, context = {}) {
  // Six skill ratings (2026-09-30 to 10-14) found mobile:true still planned a 1440x1000 page. A page read on
  // a phone and a laptop is planned for the screen that holds the fewest objects (skill rating 2026-10-04).
  const declared = useCase.constraints?.viewports ?? [];
  const perViewport = declared.map((v) => ({ ...(v.label ? { label: v.label } : {}), ...densityBudget(v) }));
  const binding = perViewport.reduce((min, v) => (min === null || v.maxObjects < min.maxObjects ? v : min), null);
  // Declared screens are the use case's own statement, so they bind; a caller's viewport only fills a gap.
  const budget = binding ? densityBudget(binding.viewport)
    : densityBudget(context.viewport ?? (useCase.constraints?.mobile ? PHONE_VIEWPORT : undefined));
  return { declared, perViewport, budget };
}

/** The colour and shape for the kind in the given slot: three colours, then grey shapes, then labels alone. */
export function kindChannel(slot) {
  return slot < COLOURS.length
    ? { colour: COLOURS[slot], shape: SHAPES[0] }
    : slot < DISTINCT_KINDS ? { colour: "grey", shape: SHAPES[slot - COLOURS.length + 1] } : { colour: "grey", shape: SHAPES[0], tellApartBy: "label only" };
}

export { DISTINCT_KINDS };

export function buildCompositionPlan({ useCase, selectedRepresentation, representation = null, catalog, context = {} }) {
  const heuristics = applicableHeuristics(catalog, useCase, context);
  const tags = compositionTags(useCase, context);
  const structures = useCase.informationStructure ?? [];
  const grammar = VIEW_GRAMMAR[representation?.id] ?? GRAMMAR[representation?.family] ?? null;
  const primaryForm = grammar?.form ?? FORM_BY_STRUCTURE[structures[0]] ?? "node-link";
  const entities = useCase.entities ?? [];
  const { declared, perViewport, budget } = planViewport(useCase, context);
  const items = useCase.scale?.items ?? null;
  // A node-link or flow screen carries its links as well as its items (skill rating 2026-09-26).
  const drawsLinks = ["node-link", "flow"].includes(primaryForm) && (useCase.relationships ?? []).length > 0;
  const links = drawsLinks ? (useCase.scale?.links ?? null) : null;
  // Unknown links leave the total unknown, unless the items alone already overflow the screen.
  const marks = items === null || (drawsLinks && links === null) ? null : items + (links ?? 0);
  const hasTime = tags.has("over-time");
  const ids = new Set(heuristics.map((h) => h.id));

  const secondary = [];
  if (ids.has("recognition-over-recall")) secondary.push({ id: "legend", job: "explain every encoding on the same screen" });
  // A reader new to the notation needs the key whatever kind of page this is (skill rating 2026-09-30).
  else if (useCase.audience?.notationFamiliarity === "novice" || (useCase.tasks ?? []).includes("decode-notation")) {
    secondary.push({ id: "legend", job: "explain every symbol, colour and line style on the same screen; the reader is new to this notation" });
  }
  if (ids.has("visibility-of-status")) secondary.push({ id: "status-line", job: "source, revision, freshness, and what is missing" });
  if (ids.has("space-and-time-together") && hasTime) secondary.push({ id: "time-strip", job: "show change over time beside the structure" });
  if (ids.has("overview-zoom-detail")) secondary.push({ id: "detail-panel", job: "what opens when an object is selected" });
  // A run that fills in over time needs its progress and its failure on the page (skill rating 2026-09-30).
  const arrival = useCase.constraints?.arrival;
  if (["staged", "streaming"].includes(arrival?.mode)) {
    const stages = arrival.stages?.length ? ` (${arrival.stages.join(" → ")})` : "";
    const timing = arrival.typicalSeconds ? `; elapsed time against the usual ${arrival.typicalSeconds} seconds` : "";
    secondary.push(arrival.mode === "staged"
      ? { id: "progress-state", job: `which stage is running, which are done and which are waiting${stages}${timing}; finished results stay in place as later ones land` }
      : { id: "progress-state", job: `that items are still arriving, how many so far and when the last one came${timing}; new items join without moving what the reader is looking at` });
    secondary.push({ id: "failure-state", job: arrival.mode === "staged"
      ? "which stage failed, in plain words, keeping every result that already arrived, with a way to retry"
      : "that the feed stopped or broke, keeping every item already shown, with a way to reconnect" });
  }

  const design = designMarks(useCase, grammar);

  return {
    // The page's title is the use case's short title; the full concern stays as the question. A long concern
    // was echoed as the title (skill rating 2026-09-30); shortening it is a judgment, so the caller states it.
    title: useCase.title ?? null,
    question: useCase.concern ?? null,
    audience: useCase.stakeholder ?? null,
    viewport: budget.viewport,
    primary: {
      representation: selectedRepresentation ?? null,
      form: primaryForm,
      carries: useCase.relationships ?? [],
      ...(grammar?.valueEncoding ? { valueEncoding: grammar.valueEncoding } : {})
    },
    secondary,
    // The parts the person named stay on the plan by name, so a generic flow cannot drop them (skill rating 2026-10-08).
    ...(useCase.mustShow?.length ? { mustShow: [...useCase.mustShow] } : {}),
    readingOrder: ["title", "primary", ...secondary.map((s) => s.id)],
    groups: design.groups,
    hierarchy: { levels: ["title", "primary", "secondary", "detail"], typeSizes: 3 },
    marks: design.marks,
    links: design.links,
    // A static page has nothing to select, so its one emphasis is the highlighted answer.
    emphasis: {
      channel: "one highlight colour",
      state: context.emphasisState ?? (tags.has("interactive") ? "selected" : "highlighted"),
      ...(useCase.focus ? { target: useCase.focus } : {})
    },
    densityBudget: {
      ...budget,
      ...(perViewport.length > 1 ? { perViewport: perViewport.map(({ label, viewport, maxObjects }) => ({ ...(label ? { label } : {}), viewport, maxObjects })) } : {}),
      items,
      ...(drawsLinks ? { links, marks } : {}),
      withinBudget: items !== null && items > budget.maxObjects ? false : marks === null ? null : marks <= budget.maxObjects,
      ifOver: "aggregate, filter, or reveal on demand; do not shrink"
    },
    revealOnClick: design.reveal,
    designGaps: [
      ...design.gaps,
      ...(drawsLinks && links === null && items !== null && items <= budget.maxObjects
        ? [`The density budget counts ${items} items but not their links; add scale.links, since a ${primaryForm} screen carries both.`]
        : []),
      ...(useCase.constraints?.mobile && declared.length && !declared.some((v) => v.width <= PHONE_MAX_WIDTH)
        ? [`mobile is set but no declared viewport is phone-width (${PHONE_MAX_WIDTH}px or less); add one such as ${PHONE_VIEWPORT.width}x${PHONE_VIEWPORT.height}.`]
        : []),
      ...(!useCase.title && (useCase.concern ?? "").split(/\s+/).length > 12
        ? ["No short title: the concern is too long to head the page; add a use-case title of a few words."]
        : [])
    ],
    coldReadTarget: useCase.concern ? `After a minute a newcomer can say what the page answers: ${useCase.concern}` : null,
    heuristics: heuristics.map((h) => h.id),
    sketchInstructions: [
      ...heuristics.map((h) => h.sketchInstruction).filter(Boolean),
      ...(useCase.mustShow?.length ? [`Show each of these by name, visible without opening anything: ${useCase.mustShow.join("; ")}.`] : [])
    ],
    checks: heuristics.map((h) => h.check).filter(Boolean)
  };
}

/** Marks, links, groups and the reveal map for this use case under the chosen view's grammar. */
export function designMarks(useCase, grammar) {
  const entities = useCase.entities ?? [];
  const relationships = useCase.relationships ?? [];
  const ends = useCase.relationshipEnds ?? [];
  const tasks = new Set(useCase.tasks ?? []);
  const gaps = [];
  const roles = grammar ? grammar.kinds(entities) : entities.map((kind) => [kind, "mark"]);
  if (!grammar) gaps.push("The chosen representation has no drawing grammar here, so marks name only their kind; design them from the representation's own conventions.");

  const enclosedIndex = typeof grammar?.encloses === "function" ? grammar.encloses(entities) : grammar?.encloses ?? null;
  const drawn = roles.filter(([, role], index) => index !== enclosedIndex || !grammar);
  const marks = {};
  roles.forEach(([kind, role], index) => {
    if (index === enclosedIndex) { marks[kind] = { role, encoding: "region with its name as a heading" }; return; }
    const slot = drawn.findIndex(([k]) => k === kind);
    const channel = kindChannel(slot);
    // When colour carries the value (blue one way, orange the other), kinds are told apart by position and label only.
    const encoding = grammar?.valueColour ? { position: role, tellApartBy: "label only" } : drawn.length === 1 ? { shape: SHAPES[0] } : channel;
    marks[kind] = { role, encoding, labelled: true };
  });
  if (drawn.length > DISTINCT_KINDS) {
    gaps.push(`${drawn.length} object kinds are drawn but a reader tells at most ${DISTINCT_KINDS} apart at a glance; merge kinds, filter to the ones the question needs, or show the kind as a property in the detail panel.`);
  }

  const links = relationships.map((name) => {
    const end = ends.find((item) => item.relationship === name);
    return { relationship: name, drawnAs: grammar?.link ?? "connector labelled with the relationship name", ...(end ? { from: end.from, to: end.to } : {}) };
  });
  const unmatched = relationships.filter((name) => !ends.some((item) => item.relationship === name));
  if (relationships.length && unmatched.length) {
    gaps.push(`relationshipEnds does not say which object kinds ${unmatched.join(", ")} join, so the reveal map cannot list each kind's own links; add {relationship, from, to} for each.`);
  }

  const groups = enclosedIndex === null || enclosedIndex === undefined || !entities[enclosedIndex]
    ? []
    : [{ id: entities[enclosedIndex], by: `each ${entities[enclosedIndex]} encloses its items`, enclosed: true }];

  const reveal = {};
  for (const [kind] of roles) {
    const own = ends.filter((item) => item.from === kind || item.to === kind)
      .map((item) => (item.from === kind ? `${item.relationship} -> ${item.to}` : `${item.from} ${item.relationship} -> this`));
    const shows = [];
    if (own.length) shows.push(`its links: ${own.join("; ")}`);
    if (tasks.has("inspect") || tasks.has("lookup")) shows.push(`its own ${kind} fields`);
    if (tasks.has("trace")) shows.push("the next step along its links, in and out, opened one step at a time");
    if (tasks.has("compare")) shows.push(`where it stands against other ${kind} items on the compared measure`);
    if (useCase.focus) shows.push(`whether and how it connects to ${useCase.focus}`);
    if (useCase.constraints?.provenance) shows.push("its source and when it was recorded");
    const missing = useCase.semanticAvailability?.missing ?? [];
    if (missing.length) shows.push(`which of ${missing.join(", ")} is missing for it`);
    reveal[kind] = shows;
  }
  return { marks, links, groups, reveal, gaps };
}
