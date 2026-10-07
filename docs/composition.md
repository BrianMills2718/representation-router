# Composition: the whole page, not the marks

**Status:** durable design guidance, added 2026-09-25 after the owner's critique
of 2026-09-23 ("the primitives are missing a lot of design stuff that should be
more holistic") and the talk that prompted it.

The router's catalogs describe marks and patterns: nodes, edges, lanes, matrix
cells, a scroll-linked explainer, a coverage matrix. A page assembled from
correct marks can still fail as a page: too much text, no title that says what
it is, relationships left for the reader to reconstruct, parts drawn in
unrelated styles. That is the layer this document owns.

## Source

Stone Librande, *One-Page Designs* (GDC, https://www.youtube.com/watch?v=E9_wLks1kAg),
a game designer's account of why one-page documents beat design bibles and
wikis, watched in the Inside Success daily meeting on 2026-09-23. The claims
below are his, restated for this repository's job; the applications are ours.

## Two layers: the catalog of principles, and the Librande checklist

**Status update, 2026-09-25 (later the same day).** The owner's doubt was
right: one checklist from one talk, applied after the build, is not a holistic
design layer. The router now carries two things:

1. `catalog/composition-heuristics.json` — 25 page-level principles with named
   sources (Gestalt grouping: proximity, similarity, common region; Williams'
   contrast, repetition, alignment, proximity; Tufte's data-ink, layering and
   separation, small multiples; Few's single-screen and density rules;
   Shneiderman's overview, zoom, detail; Nielsen's recognition over recall and
   visibility of status; Ware's preattentive pop-out; reading-order patterns;
   and Librande's one-page principles). Each entry states when it applies, how
   it shapes the page plan, the sentence given to the image generator, and the
   check applied to the build.
2. The `one-page-composition-quality` method below, kept as the always-on hard
   checklist.

The catalog enters at three stages, which is the point:

| Stage | Where | What happens |
| --- | --- | --- |
| Plan | `src/composition-plan.mjs`, emitted as `compositionPlan` on every recommendation | The use case is tagged (compare, graph, explanatory, over-time, ...), the applicable principles are selected, and a page plan is written: the one question, the primary element and its form, secondary elements (legend, status line, time strip, detail panel), reading order, groups, hierarchy levels, marks per object kind, the one emphasis state, a density budget with an honest over-budget verdict, and the reveal-on-click map. |
| Sketch | `composePrompts(spec, { compositionCatalog })`, used by `npm run sketch-set` | Every picture's prompt states the applicable principles before the picture instruction, so image generation is told what good composition is before it draws. A spec may narrow the list with `composition: [ids]`. |
| Review | `quality.softChecks` on the recommendation, collected by the disposition CLI | Each applicable principle's check joins the checklist, so the build is judged against the same principles it was planned and sketched with. |

The score is untouched by this layer; the plan and the checks are the record.

## The principles, as checks

`catalog/quality-methods.json` carries them as `one-page-composition-quality`,
a composition-layer method that `selectQualityMethod` appends to **every**
recommendation's checks. It never replaces the renderer-level method; it sits
on top of it. The disposition step therefore cannot pass the mark-level checks
while skipping the page-level ones.

| Principle (Librande) | Check id | What it means here |
| --- | --- | --- |
| A page has a title; people read headlines and pictures, not text | `title-states-what-this-is-and-for-whom` | The first thing on the surface says what it is and who it is for. |
| The whole design on one page | `whole-design-visible-on-one-screen-at-the-target-viewport` | No scrolling to see the whole; grow the page (his bigger paper) before splitting it. |
| Readable in about a minute | `cold-reader-gets-the-mechanism-in-sixty-seconds` | A newcomer sees the mechanism, not just the parts. |
| Lists to scan, tables to compare, flows for transitions, maps for connections | `form-matches-job-lists-scan-tables-compare-flows-transition-maps-connect` | Each part uses the form its job needs. |
| The wiki chops connections; a hyperlink is not a relationship | `relationships-drawn-not-implied-by-adjacency-or-links` | Draw the relation; do not make the reader infer it. |
| Picture before prose, when the picture carries relations or magnitudes (Larkin & Simon 1987; Few; Brian 2026-10-03) | `each-element-encodes-its-answer-visually-text-only-where-no-visual-form-fits` | Every part shows its answer as a path, bar, strip, grid, map, or list first; a part made only of sentences says why nothing visual fits. |
| Diagram earns its space (Larkin & Simon 1987; Tufte, data-ink; Brian 2026-10-04: "the graph adds almost nothing over a list with repeat at the end") | `each-drawing-shows-relations-a-list-cannot-linear-sequences-are-lists` | Soft: draw only branching, meaningful back-edges, many-to-many links, typed port-to-port flows, or spatial layout; a straight chain of steps, even with a "repeat" at the end, is a numbered list. |
| One visual language across the document | `same-object-same-mark-across-every-view` | The same object keeps the same mark on every tab. |
| Owner condition, 2026-09-25 | `every-object-reveals-more-on-click-nothing-is-a-dead-end` | Approval of the four-view set was conditional on this. |
| Owner condition, 2026-10-05: "they always need to fit on the page and then you could zoom or scroll within the graphic like google maps" (Shneiderman overview-zoom-filter; slippy maps) | `every-drawing-fits-its-frame-on-load-and-zooms-and-pans-within-it` | A drawing opens whole inside its frame; detail comes from zoom and pan inside it, never from overflowing the page. |
| Owner condition, 2026-10-05: "the tour should also make highlight the current tab" (Nielsen visibility of system status; wayfinding) | `tour-step-keeps-current-navigation-item-visible-and-marked` | A tour step never dims the navigation away: the tab for the explained view stays visible and marked current. |
| Owner condition, 2026-10-05: "building should be done through natural language" (Carroll minimalism; progressive disclosure) | `creation-tool-opens-on-plain-language-input-with-tutorial-not-a-form` | A creation tool opens on a do-first landing page with a numbered tutorial and one plain-language input; the form editor is an advanced link. |
| Owner condition, 2026-10-05: "It should just be like check boxes for what views and then a place to talk to an agent"; "the topic needs to be as prominent as the views" (Shneiderman overview/filter/details; Tufte small multiples only for comparison) | `views-and-topics-chosen-by-control-or-agent-not-tiled` | Views and topics are equal visible controls beside an agent that answers and sets them; only the chosen views are drawn, not a tiled grid of every view and thread. |
| Owner condition, 2026-10-03: "maybe what was really needed is to just combine them" (rule of parsimony, Baldonado et al. 2000) | `overlapping-views-merged-into-one-view-with-forms-not-thinned` | Soft: two views of the same parts become one view with forms; never thin one to avoid repeating the other. |
| Owner condition, 2026-10-04: "the failure modes dont seem to reflect what i said" (Tufte 2006, faithful quotation) | `attributed-claims-traced-to-source-no-invented-items` | Soft: each claim attributed to a person comes from the source, in their words; separate claims stay separate; no item is invented to complete a pattern. |
| Owner condition, 2026-10-04: "what is the reasoning behind the order of the slides" (Minto 1987) | `argument-pages-follow-the-speakers-order-and-keep-their-reasons` | Soft: a page presenting someone's argument follows their order and keeps their reasons as a stop. |
| Owner condition, 2026-10-04: "B is easier. but i think there is a best of both worlds"; "C is good. but in some cases we will want it to be dynamic" (D2 + ELK) | `drawing-laid-out-by-engine-with-content-and-optional-motion-layers` | Soft: a layout engine places the drawing; facts sit inside groups as obstacles; motion, where it helps, runs on the engine's own lines with step and play/pause. |
| Prior art, Anthropic frontend-design: "visual structure is information" | `structural-devices-encode-information-not-decoration` | Soft: a border, number or label must encode something. |
| Prior art, Anthropic frontend-design: the tells of a generated page | `no-generated-defaults-cream-serif-card-kit-caps-labels-middle-dots` | Soft: no default treatment that would appear for any subject. |
| Prior art, excalidraw-diagram-skill (restated, cited) | `each-concept-drawn-in-a-shape-that-mirrors-its-behaviour` | Soft: each concept takes the shape of what it does. |
| A big drawing with callouts | `one-primary-drawing-with-callouts-not-parallel-columns-of-text` | Soft: prefer one drawing annotated over columns of prose. |
| Lots of white space | `white-space-separates-groups-and-carries-hierarchy` | Soft. |
| Let structure emerge | `structure-earned-by-content-not-imposed-taxonomy` | Soft: no sections the content did not ask for. |
| Space and time together | `space-and-time-shown-together-when-the-subject-changes-over-time` | Soft. |
| Date it; iterate until it goes on the wall | `page-carries-its-date-and-version`, `a-person-would-pin-it-on-a-wall` | Soft. |

Repair order when a surface fails: fix the title, get the whole onto one screen,
replace prose columns with a drawing plus callouts, cut imposed sections, unify
marks, add reveal-on-click, and never repair by hiding source or caveat truth.

## When a principle applies

A heuristic enters a plan only when its `appliesWhen` names a tag that
`compositionTags` emits from the use case. The tags, and the use-case fields
that produce them, are listed in `COMPOSITION_TAGS` in
`src/composition-plan.mjs`. For example, `constraints.mobile` produces
`multi-device`, `constraints.realtime` produces `live`, and
`surfaceContext.medium: "dashboard"` produces `dashboard`. Prose conditions
may stay beside the tags as documentation, but they never match on their own.
`test/composition-heuristics.test.mjs` fails when a heuristic names no emitted
tag. Issue #62: eleven heuristics, several from owner critiques, were
unreachable this way until 2026-10-05.

## The score is advisory; the justification is the record

The router still computes a score from heuristic weights, and the weights are
still hypotheses (`heuristics/core.json`). The owner's position, 2026-09-23:
the score is not what matters; the agent's stated choice and reasons are.
Accordingly:

- Whenever the router offers alternatives, the disposition checklist carries a
  `choice-justified:<representation>` line that the builder must write in their
  own words, comparing the chosen representation with the alternatives for this
  audience and job. A score margin is not a justification.
- Agents should treat the ranked list as candidates to reason about, not as a
  verdict, and may choose an alternative when they can say why.

## Where image generation fits

Composition is judged fastest by looking at a whole page. `npm run sketch-set`
draws a set of candidate pages under one shell so a person can judge
composition across tabs in seconds, before any code. The composition checks
above are the questions to ask of those sketches as much as of the build.
