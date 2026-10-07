# Design model

Representation Router treats representation and interface design as a sequence of decisions rather than a lookup table from “data type” to “chart type.”

## 1. Semantic model

The semantic model describes what exists and what it means: entities, relationships, attributes, constraints, behavior, states, requirements, evidence, and provenance.

A SysML model, UML model, architecture model, graph, database schema, simulation state, project-planning model, source-code model, runtime model, or ordinary domain object graph can all play this role. The semantic model should not be forced to look like any particular diagram or interface.

Representation Router does not own this truth. A consuming product or domain system remains authoritative for semantic meaning, workflow state, evidence custody, and allowed mutations.

## 2. Concern and viewpoint

A stakeholder rarely wants “the model.” They want an answer to a concern.

Examples:

- Which requirements lack verification coverage?
- What depends on this service?
- How does a failure propagate?
- What changed between releases?
- What happens during startup?
- Which decision is supported by which evidence?
- What work is blocked, and why?
- Does this implementation match the planned architecture?

A viewpoint bundles the stakeholder, intent, tasks, and conventions used to answer that class of concern.

### Outcome and learning contract

A concern states the question, but it does not always state what successful use looks like. `successCriteria` may therefore record observable outcomes such as “a newcomer can identify the next action without instruction” or “after guided practice, the user can predict an unseen case.” These criteria are carried into ViewSpec so implementation and QA do not silently optimize only for rendering quality.

When the job is learning rather than one-time explanation, `learning` makes the learner journey explicit: entry mode, target outcomes, scaffolding, prediction-before-reveal, and unseen transfer. The router converts those outcomes into soft representation-fit signals and interaction patterns. This keeps the input goal-level: callers should not have to know that fluency happens to require `scaffolding-fade` or `transfer-assessment` in the current catalog.

Learning outcomes are not hard representation requirements by default. A conventional table or state diagram may still be the right teaching representation when it serves the task better. Use `requiredCapabilities` only when a capability is genuinely non-negotiable.

## 3. Projection

The projection chooses what part of the model is relevant and how it should be transformed before rendering. Typical operations include select, filter, derive, aggregate, group, sort, and window.

This is where a 20,000-node dependency model can become a 30-node neighborhood view, a risk-ranked table, or an aggregated matrix rather than a giant node-link graph.

Projection is semantic selection, not rendering convenience. The domain owner decides which facts and relations are eligible for the semantic view. Representation Router must not infer richer semantics merely because a particular visual form would be attractive.

The current `ViewSpec.projection` contract is intentionally modest. More detailed eligibility, derivation, aggregation meaning, omission reasons, and lineage should not be added as a new universal abstraction until independent consumers demonstrate the same missing contract; this is tracked during Consolidation v0.

## 4. Semantic view

A semantic view is the concern-specific architectural, planning, analytical, implementation, review, or product slice after projection. It answers *what this view means* independently of how it is drawn.

One semantic view may have several useful representations. For example, the same exchange view can be shown as a node-link network for topology, a source-resource-destination flow for direction, or a matrix for dense comparison. Those are different representations of the same semantic view, not different models.

### Semantic lenses

A semantic lens is an optional terminology or interpretive layer over the same semantic view. It changes how model elements are named or explained without changing their identity, relationships, or projection. Examples include canonical source terminology, a plain-language gloss, a practitioner-specific vocabulary, or a deliberately speculative interpretation.

Lens values should carry a status such as `canonical`, `source-derived`, `interpretive`, `practitioner-specific`, `illustrative`, or `speculative`. Switching lenses should preserve selection and topology. When a gloss is derived from source material rather than quoted or formally defined, its provenance should remain inspectable rather than being promoted silently into the semantic model.

This separation is especially important for formal viewpoint systems such as DoDAF, UAF, SysML, UML-derived practices, and architecture-description frameworks. A named view should not be equated with one historical diagram convention unless the convention is semantically required.

## 5. Representation

The representation determines the visual/structural form used to expose the semantic view. Initial families include graph, matrix, hierarchy, sequence, temporal, table, architecture, state, comparative, application UI, and explorable explanation.

A representation is not automatically a picture. It may be a table, inspector, matrix, canvas, sequence view, editor, or several coordinated views.

Representation selection should consider established prior art before inventing a new visual language. UML sequence/state/activity conventions, BPMN process/choreography notation, C4 abstraction levels, ER diagrams, Gantt/PERT scheduling, geospatial maps, graph-analysis views, traceability matrices, review patterns, and other mature forms are reusable design knowledge rather than competing frameworks.

### Multiple candidate representations

Do not force a semantic view into one rendering when alternatives answer materially different questions. Keep multiple candidates when they provide distinct analytical value, and record the task each candidate makes perceptually cheap.

### Adaptive representations

Scale and density can change the preferred representation without changing the semantic view. A dependency graph may be effective at 30 nodes while the same semantic slice should route to a matrix, table, aggregation, neighborhood view, or another supported reduction strategy at larger scale.

A caller allowing aggregation does not grant every representation an aggregation capability. Scale adaptation must use a strategy the selected representation actually supports.

### Composite representations

A useful view may be a coordinated composition rather than one diagram: for example, a finding summary + graph + exception list + inspector + evidence panel. Composite views should share selection, filtering, provenance, and identity rather than behave as unrelated widgets.

## 6. Working surface

A **working surface** is the application-facing composition in which a person actually understands, plans, edits, reviews, operates, learns, or makes a decision. It may contain one ViewSpec or coordinate several ViewSpecs with reusable interface patterns.

Examples include:

- a planning surface linking work dependencies, architecture, assurance, and review evidence;
- an architecture workspace linking topology, contract details, sequence behavior, and evidence;
- a code-review surface linking a diff to architecture impact, tests, requirements, and reviewer actions;
- a documentation surface combining a conceptual view, examples, glossary, and source links;
- the product UI through which an end user acts on the domain model.

`SurfaceSpec` is the renderer-independent contract for this layer. It adds what does not belong inside one representation:

- the human job, audience, and lifecycle context;
- the participating ViewSpecs and their primary/complementary/supporting roles;
- source owners, exact revisions, and source roles;
- reusable interface-pattern composition;
- shared semantic focus behavior across representation pivots;
- revision-change behavior so stale semantic focus is not silently reinterpreted;
- read-only, local, or authoritative action contracts;
- provenance expectations; and
- surface-level success criteria.

A working surface is **not** a second semantic or workflow authority. Company Planning remains authoritative for planning state and dispositions. DoDAF remains authoritative for architecture projection eligibility. A code repository remains authoritative for code revisions. SurfaceSpec only records how those authorities are bound into a human working experience.

### Action boundary

A control does not gain authority because it is visible. A read-only action carries no write destination. An authoritative write must identify its destination and target revision, the exact subject revision being acted on, the actor/authority basis and scope, stale-submission behavior, and evidence-retention rule. The consuming product performs and validates the write.

### Shared semantic focus

Selection should normally be keyed by stable semantic identity and survive representation pivots even when the selected object is not visible in the new view; the surface should say that it is not represented rather than silently switch subjects. A source or corpus revision change clears semantic focus or requires an explicit remap rather than matching by display text.

### CollectionSpec versus SurfaceSpec

`CollectionSpec` remains useful for repeated/portfolio surfaces whose main need is common preview, activation, semantic-mark, selection-detail, and quality behavior across many ViewSpecs. `SurfaceSpec` is for a working application surface with source/revision ownership and potentially consequential actions. A product may use both.

## 7. Visual primitives

A visual primitive is a reusable building block used inside representations. It is lower-level than a semantic view, representation pattern, or working surface.

Examples include nodes, edges, lanes, lifelines, events, intervals, states, matrix cells, hierarchy branches, spatial anchors, flow bands, annotations, inspectors, and evidence links. See `catalog/visual-primitives.json`.

The relationship is:

```text
semantic / workflow truth
    ↓
concern / viewpoint
    ↓
projection
    ↓
semantic view
    ↓
optional semantic lens
    ↓
one or more candidate representations / ViewSpecs
    ↓
optional CollectionSpec / SurfaceSpec composition
    ↓
visual + interaction primitives
    ↓
product-owned renderer / implementation
```

Consistency should primarily live at the primitive, interaction, and working-surface state layers: the same entity identity, selection state, relationship semantics, evidence affordance, time direction, gap encoding, accessibility behavior, and source revision should survive across compatible representations.

## 8. Interaction

Interaction is part of the representation and working-surface contract:

- select → reveal provenance
- select node → highlight dependency path
- filter → recompute visible projection
- scrub → move through ordered states
- parameter change → recompute simulation
- edit → update the semantic model through an authorized product-owned contract
- pivot → preserve selected semantic identity while changing representation
- compare → coordinate selection and scales across views
- review disposition → bind the action to the exact subject revision and evidence

The same underlying projection may be rendered read-only, exploratory, animated, simulated, or editable. The product owns state persistence and external effects.

Persistent cross-view selection is especially valuable when a product offers several representations of the same semantic world. Switching representations should not reset the investigation unless the user explicitly clears focus or the authoritative source revision changes.

## 9. Provenance

A useful target invariant is:

```text
visual mark / working action
    ↕
semantic model element(s)
    ↕
derived calculation / projection
    ↕
source / evidence / exact revision
```

Where possible, users should be able to move from a visual claim back to the model objects and evidence that produced it. Consequential actions should likewise record which exact subject and source revisions were acted on.

## Router stages

The intended router is a constraint-and-ranking system plus an optional working-surface composition layer:

1. Normalize the concern, stakeholder, task, semantic structure, scale, constraints, success criteria, and any explicit learning outcomes.
2. Identify the semantic view/projection needed to answer the concern.
3. Generate candidate representation patterns, including mature prior-art forms.
4. Apply hard constraints.
5. Score candidates using soft heuristics.
6. Decide whether one representation, adaptive routing, or a coordinated composite is warranted.
7. Explain every score contribution and rejection.
8. Produce a renderer-independent ViewSpec.
9. When several views or interface patterns must form one working experience, compose them into a source-bound SurfaceSpec.
10. Send the ViewSpec/SurfaceSpec to product-owned renderers and application integration assembled from reusable primitives and interface patterns.

The current implementation covers hard-constraint filtering, explainable scoring, reviewed substitute/complement relations, ViewSpec generation, CollectionSpec generation, SurfaceSpec generation, render-plan adapters, implementation routing, and renderer-specific quality methods. Current policy ownership is documented in [`policy-ownership.md`](policy-ownership.md); proving-application separation is documented in [`core-reference-boundary.md`](core-reference-boundary.md).

## Hard vs. soft rules

Hard constraints describe invalid or unusable choices: a required capability is missing, semantic availability is absent, a representation cannot support required behavior, or scale exceeds a known bound without a supported reduction strategy. At the surface layer, an authoritative action without explicit revision/authority/stale-write/evidence behavior is likewise invalid.

Soft heuristics express preferences: matrices may tolerate denser networks than node-link graphs for some tasks, sequence diagrams fit ordered interactions, tables are strong for lookup and exact values, and direct manipulation is useful for authoring but unnecessary for passive communication.

The distinction mirrors constraint-based visualization recommendation systems such as Draco. The numeric weights and thresholds remain evidence-sensitive defaults rather than universal laws.

## Open design questions, not roadmap commitments

The active work plan is [`plans/consolidation-v0.md`](plans/consolidation-v0.md). The questions below are deliberately **not** a capability roadmap; they should be promoted only when existing cases demonstrate a concrete failure or repeated need.

1. **Semantic projection contract** — do independent consumers need stronger eligibility, derivation, aggregation, omission, and lineage semantics than current ViewSpec projection fields provide? Tracked by issue #27.
2. **Abstention** — when should the router return “no suitable representation known” instead of a weak winner? Tracked by issue #28.
3. **Complement-aware set selection** — when should complementary representations participate in selection rather than only being classified after a primary wins? Also issue #28.
4. **Adaptive thresholds** — how should task, audience, density, layout, and empirical evidence qualify scale defaults?
5. **Policy ownership** — which interaction/implementation rules should remain code-owned versus move into inspectable rule data? See [`policy-ownership.md`](policy-ownership.md) and issue #25.
6. **Viewpoint reuse** — does a separate `ViewpointSpec` earn a contract through repeated independent reuse, or is current input sufficient?
7. **Reusable surface patterns** — when does repeated product composition justify a core interface-pattern entry?
8. **Repository separation** — does measured coupling justify a later physical core/contracts/reference-app split? See [`core-reference-boundary.md`](core-reference-boundary.md) and issue #29.
9. **Empirical calibration** — how should measured task performance and repeated product outcomes update heuristics without overfitting one product?

These questions should remain falsifiable and bounded. A successful proving application is evidence to inspect, not automatic justification for expanding the reusable core.
