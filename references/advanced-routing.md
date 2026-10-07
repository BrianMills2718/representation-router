# Advanced Representation Routing

This reference retains the detailed selection, interaction, explanatory,
implementation, and verification guidance. All unqualified repository paths
below are relative to the Representation Router repository root.

Use this skill before building or substantially refactoring a visualization, diagram, graph explorer, architecture/modeling view, workflow editor, dashboard view, or explorable explanation.

The core principle is:

> The model is the truth. A diagram, table, matrix, animation, widget, or editor is a task-specific projection of that model.

Do **not** begin by choosing a library or drawing a graph. First determine what the user needs to understand or do.

## Required workflow

1. Inspect the request, relevant code, data/model shape, and existing UI conventions.
2. Normalize the problem into the dimensions in `../schemas/use-case.schema.json`.
3. Separate the semantic model from the concern-specific semantic view. Do not treat an existing diagram as the only possible model or rendering.
4. Review mature prior art for the problem before inventing notation. Relevant sources can include UML, SysML, BPMN, UAF/DoDAF, ArchiMate, C4, ER/data modeling, graph analysis, GIS, project scheduling, process mining, scientific visualization, and investigative/analytic UX.
5. Generate multiple plausible representation patterns from `../catalog/representations.json`. Keep more than one when they answer materially different tasks. Check `../catalog/representation-relations.json` for reviewed substitute/complement relationships before flattening alternatives into a ranking.
6. Apply hard constraints before preferences. Eliminate representations that cannot satisfy scale, required capabilities, semantics, or interaction needs. **Gate semantic availability before ranking:** if the concern-specific semantic view is unavailable, return an unavailable state instead of a visualization; if partial, preserve the missing semantics in the ViewSpec and UI.
7. Rank the remaining candidates using `../heuristics/core.json` and the principles below.
8. Decide whether the product needs one representation, an adaptive representation that changes with scale/context, or coordinated composite representations.
9. Select interaction patterns from `../catalog/interaction-patterns.json` and reusable visual/interaction building blocks from `../catalog/visual-primitives.json`.
10. Select an implementation approach from `../catalog/implementations.json`, preferring existing project capabilities and native web primitives before adding dependencies.
11. Select the matching construction method from `../catalog/implementation-playbooks.json`; a renderer name is not an implementation plan.
12. Produce a `ViewSpec` and concise rationale before implementation.
13. Select the renderer-specific post-render quality method from `../catalog/quality-methods.json`.
14. If implementation is requested, build the selected representation, render it with final fonts/data, measure actual geometry, repair collisions/clipping, and verify it at target viewports before considering it complete.

See `../docs/render-quality.md` for the execution pattern. Automated geometry checks are a completion gate, not a substitute for screenshot-level composition review.

## Normalize the problem

Capture at least these dimensions. Infer them from context when possible rather than interrogating the user for every field.

- **Concern:** the question the representation must answer.
- **Stakeholder:** who is using it and what expertise they have.
- **Intent:** inspect, compare, understand, decide, create, modify, navigate, monitor, troubleshoot, communicate, or trace.
- **Information structure:** scalar, list, table, hierarchy, network, timeline, sequence, spatial, document, process, state machine, or matrix.
- **Explanatory focus:** structure, mechanism, transformation, provenance, comparison, causality, uncertainty, state, flow, dataflow (which step passes which typed data to which: port graph), or interface (what each part provides and requires: UML component/class view) — what aspect must become perceptually obvious, which may differ from the underlying data structure.
- **Task:** lookup, locate, filter, sort, rank, correlate, trace, aggregate, annotate, select, enter, confirm, compare, inspect, edit, simulate, or scrub.
- **Scale:** item count, relationship count when known, and density.
- **Interaction:** read-only, exploratory, direct manipulation, authoring, or collaborative; static, interactive, animated, or simulated.
- **Audience/context:** expertise, frequency, desktop/mobile, accessibility needs, and available screen space.
- **Learning contract:** when the representation is meant to teach, state the entry mode, desired outcomes (orientation, recognition, prediction, discrimination, composition, transfer, fluency), scaffolding level, and whether prediction/transfer must be tested. Prefer this over hand-enumerating pedagogy implementation features in `requiredCapabilities`.
- **Success criteria:** observable conditions that would make the representation successful for the user, such as independent prediction on an unseen case. Preserve these into ViewSpec so QA can test the user outcome.
- **Surface context:** whether this view sits in a repeated collection, whether neighboring representations are heterogeneous, and whether they must share an outer interaction grammar.
- **Consequence:** risk and reversibility of actions or interpretation errors.
- **Provenance:** whether visual marks must resolve back to model elements, calculations, or evidence.
- **Explanatory focus:** what the representation should make easiest to see: structure, mechanism, transformation, provenance, comparison, causality, uncertainty, state, flow, dataflow (which step passes which typed data to which: port graph), or interface (what each part provides and requires: UML component/class view).
- **Representation role:** explanatory, operational, analytic, authoring, or audit.
- **Abstraction level:** caricature, overview, or detailed. A portfolio caricature and an analyst workbench may project the same model very differently.
- **Concern hierarchy:** distinguish the primary stakeholder question from secondary concerns and whether assurance/quality-control mechanics are secondary, coequal, or primary.

When the source is UML, SysML, KerML, C4, DoDAF/UAF, an architecture-description model, or another formal model, preserve its semantics. A viewpoint/view is a projection over the model for a concern; it is not a replacement for the model.

## Keep three levels distinct

Do not collapse these concepts:

1. **Semantic view** — what concern-specific slice of the model is being shown.
2. **Representation** — how that slice is presented: graph, matrix, sequence, timeline, process, table, composite view, etc.
3. **Primitive** — reusable marks and interactions used to construct representations: node, edge, lane, lifeline, event, state, matrix cell, annotation, focus state, inspector, evidence link, and so on.

A semantic view may have several valid representations. Multiple representations may reuse the same primitives. Consistency should live primarily in semantic identity, visual primitives, and interaction contracts—not in forcing every view into the same diagram template.

**Do not confuse family validity with instance availability.** A representation grammar can be correct for a semantic family while the current model instance lacks the relationships, measures, hierarchy, forecast, or other semantics needed to populate it. Carry `semanticAvailability` (`available` / `partial` / `unavailable`) from the concern-specific projection into the ViewSpec. Unavailable semantic views belong in a clearly disabled/reference state, not in the primary set of completed analyst visualizations. Partial views must disclose what is missing without allowing the limitation notice to dominate the useful content that is present.

**Selection detail must expose the semantic neighborhood.** An inspector should combine intrinsic properties with governed incoming/outgoing relationships and evidence when they exist. Never say an item has “no additional detail” merely because its inline property bag is empty while the model contains connected assertions. A genuinely sparse item should say that directly and distinguish sparse instance detail from unavailable semantic structure.

**Evaluate repeated surfaces at the collection level.** When a page, dashboard, portfolio, or workbench contains several heterogeneous representations, standardize the outer interaction contract—activation, temporary preview, persistent focus, exit, keyboard behavior, and common control placement—before trying to make the representations themselves uniform. Internal representation type, animation semantics, and depth of interaction may vary by item when the task warrants it.

When several ViewSpecs share a repeated surface, create a `CollectionSpec` with `../src/collection-spec.mjs` / `../schemas/collection-spec.schema.json`. Use it to carry the shared interaction grammar, collection-scoped semantic mark bindings, UI-focus-vs-semantic-color rule, and collection-level quality contract. Do not duplicate those invariants ad hoc inside every card.

### When the notation itself must be learned

Treat “what do these symbols mean?” as a distinct task, not as ordinary graph inspection. When a newcomer must decode the visual grammar before they can use the model, declare the desired learning outcome in `useCase.learning` first. The router should derive the relevant pedagogical capabilities; `requiredCapabilities` is for genuine hard requirements, not a checklist copied from the implementation catalog.

- prefer **progressive model reveal** over presenting the fully layered diagram at once;
- separate canonical model grammar from domain interpretation and from one concrete running example;
- if a relationship is itself the source or target of another relationship, reify it visually rather than drawing a misleading node-to-node edge;
- when a background process continues while one focal route moves through or exits it, animate the baseline and focal trace as distinct semantic layers;
- provide stable previous/next or scrubbed states in addition to autoplay.
- when notation familiarity is novice, default to a **guided learning sequence** rather than the full explorer; progressive reveal is not instruction by itself;
- introduce one new semantic distinction per instructional step and define every term before first use;
- show the most likely wrong reading explicitly when it would otherwise be easy to infer (for example, “not 2 → 5”);
- keep **Learn** and **Explore/Reference** as separate modes when the expert surface requires the user to already know what to inspect;
- convert observed user confusion, failed explanations, and repeated clarification questions into acceptance criteria for the learning surface.

When authoritative terminology and explanatory language coexist, model them as **semantic lenses** over the same semantic view. Preserve the canonical identity in every lens and label the status of alternate wording (`canonical`, `source-derived`, `interpretive`, `practitioner-specific`, `illustrative`, or `speculative`). A plain-language gloss must not silently become the model definition. Provenance should resolve at the claim or mark level when the distinction matters.

When the explanation is inherently dynamic, prefer an **explorable explanation** over a lesson deck: keep one primary visual object persistent while prose/scroll changes its semantic state; let small manipulations reveal rules or invariants; and, when useful, synchronize concrete example, plain-language model, and canonical/formal representation as linked abstraction levels. Interaction should participate in the argument, not sit beside it as a demo.

Do not treat successful guided interaction as proof of independent understanding. After constructive practice, **fade scaffolding** and add at least one **transfer assessment** when independent operation matters: remove answer-filtering/hints, reintroduce plausible wrong readings, withhold correctness feedback until commitment, and use an unseen state, route, or example. The semantic task should remain the same while the support is removed.

When the learner must become fluent enough to **operate** the model, explanation and micro-manipulation are not the end state. Add a constructive practice phase: derive available actions from the semantic model, expose only semantically legal operations, ask the learner to predict the outcome before revealing it, then explain the governing rule. A useful progression is **explanation → manipulation → prediction → construction → expert exploration**. Prediction is valuable when it externalizes the learner’s current mental model; construction is valuable when recognition alone could hide a misunderstanding.

For source-defined systems with dense or esoteric vocabulary, use **source-grounded semanticization**: keep four things distinct for each important element—canonical identity, source-derived associations/phrases, a concise plain-language gloss, and the epistemic status of that gloss. Prefer a compact semantic key or inspector over stuffing all of those layers into the visual mark itself. Concrete examples should carry their own status separately (for example, canonical worked example vs. later-practitioner functionalization).

## Prior art before invention

Treat established visual languages as accumulated design knowledge, not as competing frameworks. Reuse what is already effective and adapt only where a concrete user/task deficiency exists.

Examples:

- ordered participant interactions → consider UML sequence diagrams, message sequence charts, BPMN choreography, and distributed-trace UIs;
- lifecycle behavior → consider UML/SysML state machines and statecharts;
- workflows with events, decisions, exceptions, or participant handoffs → consider BPMN/activity-diagram conventions;
- logical information structure → consider ER, UML class, ontology, and schema-browser conventions;
- layered software/system architecture → consider C4, UML component/deployment, SysML, and ArchiMate patterns;
- project/time dependencies → consider Gantt, PERT/CPM, milestone roadmaps, and dependency networks;
- geographic relationships → consider GIS/cartographic conventions rather than arbitrary node placement;
- dense networks → consider adjacency/DSM-style matrices, aggregation, neighborhoods, and graph-analysis techniques;
- magnitude-bearing flows → consider Sankey/alluvial conventions when quantity is genuinely part of the semantics.

Borrow the mature grammar; unify the interaction. A product may use a UML-like sequence representation and a matrix representation while still sharing the same selection, provenance, gap, confidence, evidence, and navigation behavior.

## Representation selection

Prefer representations that make the user's primary operation perceptually cheap. The most visually impressive representation is not necessarily the best one.

Use position, alignment, ordering, grouping, and direct labeling before decorative encodings. Prefer representations that expose the structure relevant to the task and suppress irrelevant structure.

### Common routing heuristics

- **Trace a modest dependency network:** node-link graph, usually with path highlighting, search, filtering, and details on demand.
- **Inspect a very large network:** do not render the full hairball. Prefer search, aggregation, neighborhood expansion, adjacency matrix, table, or overview + detail.
- **Understand ordered interactions:** sequence diagram or timeline; add scrubbing/step-through when state changes matter.
- **Understand lifecycle behavior:** state-machine view; add simulation only when changing state or parameters teaches something useful.
- **Understand a process with branching/events:** activity/process representation; use BPMN-like gateways/events when those semantics materially matter.
- **Find requirement/evidence coverage gaps:** traceability matrix or structured table before a generic graph.
- **Communicate layered system structure:** architecture/container view with deliberate abstraction boundaries; avoid showing every implementation dependency.
- **Compare repeated entities or scenarios:** aligned table, small multiples, or matrix; preserve common scales and ordering.
- **Inspect/edit many records:** master-detail, searchable table, or list + inspector rather than a spatial canvas.
- **Explore causal or policy behavior:** explorable simulation with explicit assumptions, parameters, baseline, and state history.
- **Navigate a strict hierarchy:** tree or indented browser; use a node-link layout only when cross-links materially matter.
- **Inspect geographically meaningful structure:** map/spatial representation only when geography itself affects the task.

### Multiple, adaptive, and composite representations

Do not require a single winner when alternatives answer different questions. Treat `../catalog/representation-relations.json` as machine-readable reviewed evidence about whether common pairs are substitutes or complements; an unclassified pair still requires task-level reasoning.

For example, one semantic exchange view might legitimately expose:

- a node-link network for topology;
- a source → resource → destination flow for direction and handoffs;
- a matrix or ledger for dense comparison.

If scale changes the best encoding, recommend an adaptive policy rather than stretching one representation beyond usefulness. If the concern requires several complementary operations, recommend coordinated composite views with linked selection and filtering rather than unrelated dashboard tiles.

## Dynamic visualization

Animation must encode a meaningful transition, not decorate the interface. Preserve object identity across states so the user can track what changed.

**Route multi-stage methods differently from single-stage views.** When a system's value comes from a chain of heterogeneous transformations — for example source ingestion → extraction → hypothesis testing → probabilistic update → causal graph → audited conclusion — do not compress the whole system into whichever one stage happens to fit a familiar matrix, graph, or table. Prefer a **staged explanatory machine** when all of these are true:

- the primary concern is how a method or system transforms material from input to output;
- several stages use meaningfully different representations;
- the same semantic objects or provenance chain should remain trackable across stages; and
- a single static view would either hide important stages or overload the screen.

Use one concrete running example as the payload moving through the method, while keeping the method architecture general. Keep stage labels short and reviewer-facing; move domain jargon, exact contracts, and diagnostic detail into focus/inspection. Preserve the same semantic mark for the same object class across stages and neighboring views. A matrix may still be the correct representation *inside one stage* without being the correct representation for the whole explanation.

For this pattern, keep the stations persistent and move/highlight the material through them rather than presenting a sequence of unrelated slides. Autoplay should make the mechanism legible without interaction; focused mode should expose play/pause, scrub/step, and provenance inspection.

**Preserve identity only while the semantic unit persists.** Do not force one token to travel through every stage when the method changes what is being analyzed. Show the transformation explicitly: source documents may emit evidence items; evidence may be pooled into a dependence-aware bundle; evidence may ground nodes or edges in a causal graph; the graph itself may then become the object audited downstream. Same semantic object → same mark, but a genuine change of semantic object → a genuine change of mark.

**Do not confuse semantic adjacency with semantic identity.** A thing being derived from, attached to, or used as evidence does not make it an evidence item. Reserve each canonical mark for one semantic class. For example: an evidence observation, an expected-but-absent trace, a pooled evidence aggregate, a diagnostic judgment, a graph edge status, and a derived analytical result should not all reuse the evidence mark merely because they are epistemically related. Audit the visual vocabulary across neighboring views, not just within one card.


**Distinguish execution order from data dependency.** A runtime may schedule two downstream analyses sequentially even when neither consumes the other. For explanatory views, prefer a branched dataflow when it better communicates the actual dependency graph; if this differs from runtime scheduling, say so in focused detail rather than drawing a false causal pipeline.

**Use overview + moving camera for large explanatory machines.** If legible station labels require showing only part of the machine at once, keep a persistent minimap/overview showing the full topology and current viewport. Do not shrink the whole method until labels become unreadable.

**Animate the operation, not just the transport.** Choose motion verbs that match the semantic operation at each stage: sources may **emit** evidence; evidence may **dock** into a test; a test may **classify** or **transform** it; a stage may **emit** a new result object; related items may **pool**; evidence may **ground** graph nodes/edges; downstream products may **synthesize** into a conclusion. Avoid conveyor-belt motion when the important event is an interaction or transformation.

**Autoplay and scrubbing have different jobs.** Autoplay may show partial arrival, accumulation, and transition. Scrubbing or stepping to a phase should show a stable, completed snapshot of that phase so the user can inspect it without waiting for lagging tokens or CSS transitions to finish. Put scrub/step controls adjacent to the overview/minimap when the camera moves over a larger explanatory machine. If scrubbing is a primary way to understand the representation, expose the scrub affordance before focus/pin; progressively reveal secondary controls such as step, replay, and play/pause after focus.

**Do not duplicate intermediate outputs merely to prove that a stage produced them.** A producer stage should usually show the transformation itself; materialize the derived output at the handoff or consumer where its identity matters. Repeating the same result box inside the producer, downstream analysis, and synthesis adds visual bookkeeping without adding meaning. Preserve a repeated object only when continuity of that exact object is itself important to the explanation.

**Use emphasis only when it has semantic basis.** A thicker stroke, brighter accent, selected fill, or other pre-attentive highlight must correspond to actual data/state, current selection, focus, or a deliberate explanatory cue. Do not leave one rival, category, or branch highlighted merely because it was once the example/default.

**Fit labels to the canonical mark.** Long labels must wrap, shorten, or move into details-on-demand while preserving the mark's semantic identity. Never let text overflow its container or resize one instance so aggressively that the shared visual vocabulary becomes inconsistent.

**Foreground stakeholder concern over assurance mechanics.** Primary labels and visual stages should answer the question the stakeholder is likely to ask. Deduplication, retry logic, validation, evidence pooling, audits, guardrails, bounds, and other hardening/quality-control mechanisms are usually secondary unless the concern is explicitly trust, safety, verification, or operations. Preserve the rigor, but encode it through visual structure, small annotations, or focused detail rather than promoting it to the main story.

**Layer plain-language purpose over technical sophistication.** Use reviewer-facing labels for the primary visual grammar (for example, “possible explanations,” “which fits best?”, “how did it happen?”, “causal answer”) and retain precise technical terms (for example, Bayesian update, hoop test, mechanism audit) as secondary labels or inspectable detail. Sophistication should be visible in what the representation does, not require the viewer to know the method vocabulary beforehand.

**Make the payoff state self-explanatory and let it linger.** The final state of an explanatory sequence must state what the system actually returns and why that output is useful in stakeholder language; prefer a concrete representative output over an internal artifact name. Give the payoff materially more dwell time than ordinary intermediate phases, and avoid snapping immediately back to setup before the viewer can read it.

**Once time carries the order, stop drawing the order.** A static notation for interaction (a sequence diagram, numbered arrows, a timeline) spends a spatial axis or a label on *when*. In a dynamic view, time itself already carries that, so pre-drawing every message as a numbered arrow and then lighting them up one by one is a static diagram that moves. It defeats the point. In the dynamic view:

- keep the places fixed and arranged by **structure** (teams, boundaries, who owns whom), not by order of appearance;
- draw nothing for a message until it travels; a message is a labelled token that moves from sender to receiver and is gone;
- show **state inside the places** instead of edges between them: a queue that fills and empties, a counter, a badge, a worker marked "waiting"; and
- use what a static page cannot show cleanly: concurrency (several teams asking at once), volume against scarcity (constant background traffic against the few items that cross a boundary), and waiting (who is blocked until an answer returns).

Keep the whole-sequence static view as a separate toggle, generated from the same message list, for the reader who needs everything on one screen. Real case, 2026-10-01 (AI Astronauts hive-brain explainer, tab 2): the first "dynamic" version animated numbered arcs over a fixed timeline. The reviewer rejected it because it "still shows the entire timeline at once", and pointed to the tabs that move typed cards between persistent stations instead.

**Verify a dynamic view by freezing it, not by watching it once.** Expose a URL parameter that renders a given moment (for example `#lt=7.4`). In a real browser, assert the state at several moments (queue counts, which tokens are visible), check both colour schemes, and confirm no page error in *any* view of the page. Embedded views share one script, so a name clash or a missing element in one view silently stops every view after it. Check that live mode advances too. A reload is needed between frozen moments, because changing only the URL fragment does not re-run the page.

Do not introduce a visually privileged “hero token” unless one item is semantically privileged in the underlying method. Use a small equal-status cohort when the important property is accumulation across multiple observations.

For temporal or simulated views, provide explicit play/pause when motion is continuous, a scrub/step control when ordered states matter, and a static state for reduced-motion users. Make selection persistent; do not require hover to retain important information.

## Interaction selection

Interaction should reduce cognitive or navigation cost for the primary task. Add it because the task requires it, not because the library supports it.

Good defaults include details-on-demand for inspection, search + focus for known-item lookup, filter for relevance reduction, collapse/expand for hierarchical complexity, linked highlighting for comparison, neighborhood expansion for graph exploration, and provenance inspection for evidence-backed claims.

When several representations share the same semantic world, preserve selected element identity across representation changes. A pivot should normally change the lens, not reset the investigation.

For every important interaction, provide a tap/click or keyboard-accessible path. Hover may enhance an interaction but must not be the only way to access essential information.

## Render quality is a separate stage

Representation routing can choose the right semantic form and still produce an ugly or misleading artifact. **Do not treat successful rendering as visual correctness.** After selecting an implementation, use `../catalog/quality-methods.json` as a renderer-specific execution and QA method.

For SVG/custom vector work, render with the actual fonts and data, measure the DOM/SVG geometry (`getBBox()` / `getBoundingClientRect()`), and explicitly detect text-text, text-node, clipping, and control-overflow failures. Repair in this order: move labels among valid anchors; reroute edges around measured obstacles; increase spacing/container size; shorten only secondary display labels; move secondary detail to an inspector. Do not solve collision problems by shrinking required text below readable size.

For graph layout engines, pass measured node sizes into layout, then audit crossings, label fit, group-boundary clearance, ports, and arrowheads. For Canvas/WebGL, use screen-space label budgets and level-of-detail rather than attempting to draw every label. For text-diagram generators, inspect the generated layout rather than assuming the generator made a usable diagram.

At minimum validate the intended desktop width, the smallest supported width, maximum/long-label content, the most information-dense state, and at least one focused/selected state. Automated bounding-box checks and screenshot regression are complementary: geometry catches collisions; screenshots catch poor hierarchy, spacing, and composition.

For explanatory/caricature surfaces, also run the `novice-explainer-quality` method from `../catalog/quality-methods.json`: a newcomer should be able to identify the input or starting situation, the important transformation/comparison, and the output/payoff without already knowing the method vocabulary. Geometry passing is necessary but not sufficient.

## Implementation playbooks

Choosing a renderer answers only **what tool will draw the view**. It does not answer how to make the result legible. Read `../catalog/implementation-playbooks.json` after renderer selection and follow the matching construction sequence. For custom SVG/D3, this includes measuring real text, placing primary structure before annotations, trying multiple label anchors, routing edges around measured obstacles, using progressive disclosure, and switching to a distinct narrow-screen layout when scaling would destroy readability. For graph layout tools, measure node content before layout and route/place edge labels only after node geometry is known.

Do not skip directly from `renderer: d3` or `renderer: react-flow` to ad hoc drawing code. The construction playbook and the post-render quality method are separate contracts: the playbook reduces predictable implementation defects; render QA catches what still went wrong in actual pixels.

## Implementation selection

Read `../catalog/implementations.json` after choosing the representation. Do not reverse this order.

Prefer, in order:

1. an existing project component or visualization dependency that already fits;
2. native HTML/CSS/SVG/Canvas when the representation is straightforward;
3. a focused library whose strengths match the chosen representation and interaction;
4. a larger modeling framework only when the product actually needs its model-editing/workbench capabilities.

Do not add a dependency solely because it appears in the catalog. Check the current project stack, bundle/runtime constraints, licensing requirements, and existing conventions first.

Treat layout and rendering as separate concerns. For example, ELK can compute a layered layout while React Flow, SVG, Canvas, or another renderer draws and edits it.

### Implementation routing shortcuts

- **React Flow:** node-based editors, workflow builders, interactive diagrams, custom React nodes, and direct manipulation at modest graph scale.
- **Cytoscape.js:** interactive network visualization when graph-theoretic analysis, graph operations, and rich graph interactions matter.
- **Sigma.js:** exploratory rendering of thousands of graph nodes/edges when WebGL scale matters more than diagram editing.
- **ELK / elkjs:** automatic layout for directed, layered, port-aware, or compound diagrams; pair it with a renderer.
- **Graphviz:** deterministic automatic graph drawing and generated documentation when editing is not the primary experience.
- **D2 / Mermaid:** text-sourced diagrams when reviewable source, documentation workflows, and reproducibility matter more than arbitrary direct manipulation.
- **Observable Plot:** concise conventional statistical/analytic charts and exploratory tabular-data visualization.
- **D3:** bespoke, highly interactive or animated visualization when low-level control is worth the implementation cost.
- **tldraw:** spatial/infinite-canvas applications and arbitrary direct manipulation, not automatic semantic graph layout by itself.
- **GLSP:** custom web-based graphical language editors with language-specific behavior separated into a server.
- **Sirius Web:** substantial model-based engineering studios with semantic models, domain-specific visual languages, and multiple synchronized representation types.

These are starting points, not permanent facts. If implementation choice materially depends on current library capabilities, verify the library's current official documentation before adding it.

## Provenance and formal models

When provenance is required, maintain a resolvable chain:

`visual mark → semantic model element(s) → derived calculation/transformation → source/evidence`

A graph edge should identify the relationship it represents. A displayed metric should identify its derivation when practical. A claim or evidence marker should be inspectable back to its source.

For UML/SysML/KerML, DoDAF/UAF, and architecture-description work, prefer multiple concern-specific views over a single comprehensive diagram. Preserve element identity across views so selection and navigation can cross representation boundaries.

## Anti-patterns

Reject or strongly question these unless the task provides a specific justification:

- full node-link graphs at scales where labels, paths, and neighborhoods cease to be legible;
- force-directed layouts for inherently ordered processes, sequences, or layered architecture when order is the meaning;
- using a diagram merely because the underlying data contains relationships;
- inventing new notation without checking mature prior art for the same perceptual/task problem;
- forcing every semantic view into one representation when alternative forms answer distinct questions;
- treating representation consistency as “every view looks the same” rather than preserving semantic identity and interaction grammar;
- encoding important state by color alone;
- hover-only explanations or controls;
- animation without user control or a semantic state transition;
- dashboards that show many metrics but do not support a concrete decision or monitoring task;
- spatial canvases for problems whose main operation is search, sort, filter, or bulk editing;
- conflating a visual layout with the underlying semantic model;
- generated schematic data presented as though it were project evidence;
- introducing a large visualization framework when existing UI primitives are sufficient.

## Agent output contract

Before implementation, state the recommendation in this compact form. JSON is preferred when another agent or tool will consume it.

```json
{
  "primary": {
    "representation": "node-link-graph",
    "interaction": ["path-highlighting", "details-on-demand"],
    "implementation": { "renderer": "react-flow", "layout": "elkjs" }
  },
  "alternatives": ["adjacency-matrix", "master-detail"],
  "avoid": [{ "pattern": "full-network-node-link", "reason": "Too dense at the requested scale." }],
  "rationale": ["The primary task is dependency tracing.", "The graph is modest enough for direct path inspection."],
  "assumptions": [],
  "viewSpec": { "...": "full renderer-independent ViewSpec when machine-producing the recommendation" }
}
```

When alternatives answer different questions rather than merely scoring lower, say so explicitly instead of presenting them as inferior backups.

If the user asked only for design guidance, stop after the recommendation and rationale. If the user asked for implementation, continue into the codebase.

## Implementation behavior

When implementing:

- Reuse the project's design system and state/data architecture.
- Keep semantic/model data separate from screen coordinates and renderer-specific state.
- Give stable IDs to represented entities and relationships.
- Preserve stable semantic identity across linked views and representation pivots.
- Reuse the visual/interaction vocabulary in `../catalog/visual-primitives.json` before inventing representation-specific behavior.
- Make layout deterministic when reproducibility matters.
- Add interaction incrementally around the primary task.
- Provide useful empty, loading, error, and over-scale states.
- Preserve accessibility: keyboard access, focus visibility, non-color cues, readable labels, and reduced-motion behavior.
- For dense views, implement search/filter/aggregation before adding more zoom.
- For animation/simulation, preserve object identity and expose the current state explicitly.
- When a view is schematic, label it as schematic. Never imply generated sample marks are actual model evidence.

## Verification

Test the representation against the task, not merely against rendering correctness.

Ask:

- Can the user answer the original concern faster with this view?
- Can they find and inspect the important entity or relationship?
- Does the representation remain useful at realistic scale?
- If another representation serves a different important task, can the user pivot without losing semantic focus?
- Are cross-view selection, provenance, and evidence semantics consistent?
- Are irreversible/high-risk actions explicit and confirmable where appropriate?
- Can important information be reached without hover or color discrimination?
- If provenance was required, can visible marks resolve back to semantic objects/evidence?
- Would a simpler established representation solve the task just as well?

The optional `../web/` playground exists to inspect routing behavior. It is not the primary product interface for this repository.
