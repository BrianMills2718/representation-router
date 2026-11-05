import { buildAgentRecommendation } from "./agent-recommendation.mjs";
import { planViewport, kindChannel, DISTINCT_KINDS } from "./composition-plan.mjs";
import { assertContract } from "./schema-validation.mjs";

/** The use case for one section: the page's fields, overridden by the ones the part names. */
export function partUseCase(page, part) {
  const { parts, title, mustShow, ...shared } = page;
  const merged = { ...shared, ...part, id: `${page.id}/${part.id}` };
  // Page-wide limits hold in every section: a part setting constraints.mobile must not drop the page's
  // scripts: "none" (Codex review 2026-10-26). These objects merge one level; the part's keys win.
  for (const key of ["constraints", "audience", "surfaceContext"]) {
    if (shared[key] && part[key]) merged[key] = { ...shared[key], ...part[key] };
  }
  return merged;
}

// compositionPlan was per use case, so a page of several sections had no plan across them, and each section
// handed out colours on its own: the same kind could be blue in one section and orange in the next
// (skill rating 2026-09-30, friction no-page-level-plan).
/**
 * One plan for a page whose use case lists parts: each part is routed as its own section, then the page fixes
 * one screen budget, one colour and shape per object kind across every section, and the reading order.
 * Takes the same catalogs and context as buildAgentRecommendation.
 */
export function buildPagePlan({ useCase: page, context = {}, ...catalogs }) {
  if (!(page.parts?.length >= 2)) throw new Error("buildPagePlan needs a use case with at least two parts.");
  const ids = page.parts.map((part) => part.id);
  const repeated = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (repeated.length) throw new Error(`Part ids must be unique within a page; repeated: ${[...new Set(repeated)].join(", ")}.`);
  const { budget, perViewport } = planViewport(page, context);
  const sections = page.parts.map((part) => {
    const useCase = partUseCase(page, part);
    try {
      assertContract("use-case", useCase);
    } catch (error) {
      throw new Error(`Part ${part.id}: ${error.message}`);
    }
    // Every section is planned for the page's screen, so a part cannot quietly widen it.
    return { part, useCase, recommendation: buildAgentRecommendation({ useCase, context: { ...context, viewport: budget.viewport }, ...catalogs }) };
  });

  // One colour and shape per kind for the whole page, in the order kinds first appear, so a reader who learned
  // "blue is a requirement" in the first section can trust it in the last.
  const kindOrder = [];
  for (const { recommendation } of sections) {
    for (const [kind, mark] of Object.entries(recommendation.compositionPlan?.marks ?? {})) {
      if (mark.encoding?.colour && !kindOrder.includes(kind)) kindOrder.push(kind);
    }
  }
  const sharedKinds = kindOrder.map((kind, slot) => ({ kind, ...kindChannel(slot) }));
  const channelOf = Object.fromEntries(sharedKinds.map(({ kind, ...channel }) => [kind, channel]));

  const gaps = [];
  const planned = sections.map(({ part, useCase, recommendation }) => {
    const plan = recommendation.compositionPlan;
    const marks = Object.fromEntries(Object.entries(plan?.marks ?? {}).map(([kind, mark]) => [
      kind,
      // A section with one kind draws it by shape alone, but on a page it takes the kind's shared colour so it
      // matches the other sections; a region heading or a grid whose colour carries the value keeps its own.
      channelOf[kind] && typeof mark.encoding === "object" && !mark.encoding.position ? { ...mark, encoding: { ...channelOf[kind] } } : mark
    ]));
    if (!recommendation.primary) gaps.push(`Section ${part.id} has no view that fits: ${recommendation.rationale.join("; ")}`);
    if (plan?.densityBudget?.withinBudget === false) {
      gaps.push(`Section ${part.id} shows ${plan.densityBudget.items} items but one ${budget.viewport.width}x${budget.viewport.height} screen holds ${budget.maxObjects}; aggregate, filter, or reveal on demand.`);
    }
    for (const gap of plan?.designGaps ?? []) gaps.push(`Section ${part.id}: ${gap}`);
    return {
      id: part.id,
      title: part.title ?? null,
      question: part.concern,
      representation: recommendation.primary?.representation ?? null,
      renderer: recommendation.primary?.implementation?.renderer ?? null,
      form: plan?.primary?.form ?? null,
      items: useCase.scale?.items ?? null,
      withinBudget: plan?.densityBudget?.withinBudget ?? null,
      marks,
      // The page key covers kinds; a section whose colour shows a value keeps its own key for that value.
      secondary: Object.values(marks).some((mark) => mark.encoding?.position)
        ? (plan?.secondary ?? []).filter((item) => item.id !== "legend").concat({ id: "legend", job: "key for the value colours in this section: what each end and the middle mean" })
        : (plan?.secondary ?? []).filter((item) => item.id !== "legend"),
      alternatives: recommendation.alternativesDetailed ?? [],
      ...(useCase.mustShow?.length ? { mustShow: [...useCase.mustShow] } : {})
    };
  });

  planned.forEach((section, index) => {
    const next = planned[index + 1];
    if (next && section.representation && section.representation === next.representation) {
      gaps.push(`Sections ${section.id} and ${next.id} both use ${section.representation} one after the other; merge them into one view, or say what the second shows that the first does not.`);
    }
    if (!section.title) gaps.push(`Section ${section.id} has no title; give the part a title of a few words to head its section.`);
  });
  if (kindOrder.length > DISTINCT_KINDS) {
    gaps.push(`${kindOrder.length} object kinds appear across the page but a reader tells at most ${DISTINCT_KINDS} apart, and each kind keeps one look on every section; merge kinds or label them.`);
  }

  // One key for the page beats one per section once kinds are shared; a section with no coloured kinds needs none.
  const needsLegend = sections.some(({ recommendation }) => (recommendation.compositionPlan?.secondary ?? []).some((item) => item.id === "legend"));
  // A grid whose colour carries the value (signed-effect-matrix) tells kinds apart by position and label, so
  // the key says where the kind colours do not apply (Codex review 2026-10-26).
  const valueColoured = planned.filter((s) => Object.values(s.marks).some((mark) => mark.encoding?.position)).map((s) => s.id);
  const pageSecondary = needsLegend && sharedKinds.length
    ? [{ id: "legend", job: `one key at the top for every section: ${sharedKinds.map((k) => `${k.kind} = ${k.colour} ${k.shape}`).join(", ")}${valueColoured.length ? `; in ${valueColoured.join(", ")} colour shows the value instead, with its own key there, and kinds are told apart by label` : ""}` }]
    : [];

  return {
    title: page.title ?? null,
    question: page.concern ?? null,
    audience: page.stakeholder ?? null,
    viewport: budget.viewport,
    densityBudget: {
      maxObjectsPerScreen: budget.maxObjects,
      ...(perViewport.length > 1 ? { perViewport: perViewport.map(({ label, viewport, maxObjects }) => ({ ...(label ? { label } : {}), viewport, maxObjects })) } : {}),
      rule: "each section fits one screen; a longer page scrolls between sections, never inside a squeezed one",
      withinBudget: planned.some((s) => s.withinBudget === false) ? false : planned.every((s) => s.withinBudget === true) ? true : null
    },
    readingOrder: ["title", ...pageSecondary.map((s) => s.id), ...planned.map((s) => s.id)],
    secondary: pageSecondary,
    sharedKinds,
    sections: planned,
    ...(page.mustShow?.length ? { mustShow: [...page.mustShow] } : {}),
    designGaps: gaps,
    heuristics: [...new Set(sections.flatMap(({ recommendation }) => recommendation.compositionPlan?.heuristics ?? []))],
    sketchInstructions: [
      `Stack the sections in this order, each under its own title: ${planned.map((s) => s.title ?? s.id).join("; ")}.`,
      ...(sharedKinds.length ? [`Draw each kind the same way in every section: ${sharedKinds.map((k) => `${k.kind} as a ${k.colour} ${k.shape}`).join("; ")}.`] : []),
      ...(page.mustShow?.length ? [`Show each of these by name somewhere on the page: ${page.mustShow.join("; ")}.`] : [])
    ],
    coldReadTarget: page.concern ? `After a minute a newcomer can say what the page answers and what each section adds: ${page.concern}` : null,
    recommendations: Object.fromEntries(sections.map(({ part, recommendation }) => [part.id, recommendation]))
  };
}
