# SurfaceSpec

`SurfaceSpec` is the application-facing contract above one or more `ViewSpec`s. It describes how concern-specific representations become one human working surface without moving semantic truth, workflow authority, persistence, or external effects into Representation Router.

This is a durable contract/design document. Exact revisions in the proving-case sections are **pinned historical fixtures**, not claims about the current project, deployment, or domain state.

Use it when the human job spans multiple views, exact source revisions, shared semantic focus, reusable interface patterns, or consequential actions. Keep using a plain `ViewSpec` when one view is enough. Keep using `CollectionSpec` when the need is primarily a repeated portfolio/collection with common presentation and quality behavior.

## Layer boundary

```text
source / domain / workflow authority
            ↓
   concern-specific projection
            ↓
         ViewSpec(s)
            ↓
        SurfaceSpec
  ┌─────────┼──────────┐
  │ source/revision     │
  │ shared focus        │
  │ interface patterns  │
  │ action boundaries   │
  │ provenance          │
  │ success criteria    │
  └─────────┼──────────┘
            ↓
 product-owned application
```

A SurfaceSpec does not decide what facts belong in a semantic view. It receives ViewSpecs after semantic eligibility/projection has already been established by the source domain.

## Company Planning mapping

Company Planning owns outcomes, goals, decisions, work units, authority, evidence, planning lifecycle, and acceptance semantics. Representation Router should consume projections of those records rather than copy the planning ontology.

| Company Planning concern | RR semantic view / ViewSpec | Useful interface pattern | Surface responsibility |
| --- | --- | --- | --- |
| What is blocked and what can happen next? | work dependency / readiness view | `project-graph-home`, `task-list-progress` | coordinate work focus and blocker detail |
| How does planned work relate to the system? | architecture/boundary view | `linked-planning-and-architecture-lenses` | preserve identity while keeping work dependencies distinct from architecture edges |
| What requirement is still unsupported? | criterion → architecture/work/evidence trace | `requirement-to-evidence-traceability` | coordinate assurance state without turning a passing check into acceptance |
| Does this exact submitted revision satisfy the accepted outcome? | review/output view | `review-before-completion` | bind the human disposition to exact planning/evidence revisions |

A Company Planning review action becomes `authoritative-write` only when the consuming integration supplies the source-owned destination/target revision, exact reviewed subject revision, actor/authority basis and scope, stale-submission behavior, and retained evidence.

Without that contract, the review surface remains read-only or surface-local. Rendering an Approve button does not grant planning authority.

## DoDAF mapping

DoDAF owns governed architecture assertions, DM2 meaning, canonical DoDAF projection eligibility, readiness/insufficiency, analyst workflow, and final product decisions. Representation Router begins **after** the canonical semantic projection.

```text
source/evidence
  -> governed IR
  -> canonical DoDAF projection registry
  -> projection result / typed context
  -> ViewSpec representation routing
  -> SurfaceSpec analyst workspace composition
  -> product renderer
```

The DoDAF rule “representation family is grammar metadata, not semantic authority” remains intact. An OV-2 and OV-3 surface may share one selected governed resource while using different representations, but the flow/matrix choice never decides which assertions are valid members of OV-2 or OV-3.

| DoDAF concern | RR semantic view / ViewSpec | Surface behavior |
| --- | --- | --- |
| Who produces a resource and who consumes it? | OV-2 flow representation | primary flow lens, exact evidence inspector |
| Which exchanges exist at density? | OV-3 matrix representation | complementary matrix lens sharing the same selected semantic identity |
| What is absent or semantically unsupported? | diagnostic/unavailable view | explicit gap state; no invented edge or fallback membership |
| What should the analyst inspect next? | finding/context view | primary-detail or dashboard progressive disclosure without promoting suggestions into facts |

The shared state contract preserves a governed semantic selection across representation pivots. If the selected object is absent from the next view, the surface reports `not represented` rather than selecting something with the same label. When the source/corpus revision changes, focus is cleared or explicitly remapped.

## Real E2E proving case: DoDAF semantic-path convergence

`examples/e2e-dodaf-semantic-path-convergence.json` exercises the contract against one real software change rather than a prepared visualization fixture. The retained fixture pins DoDAF plan/gate revision `e9e7086906abefc3fbb0ac7fc581c12e29750a0d` and deployed product revision `e01742e57a40f28ce0a27df4da98707d05f9d44d`.

The surface coordinates lifecycle trace, semantic-path architecture, implementation seams, verification/evidence, the deployed product UI at that recorded checkpoint, and lifecycle gate state. Domain-specific relations such as `implemented-by`, `verified-by`, `published-as`, and `reviewed-under` remain projection data in the lifecycle-trace ViewSpec rather than generic SurfaceSpec metadata.

Deployment, repository tests, browser checks, and release receipts are represented as evidence. They do not become an approval action. Because no DoDAF-owned Gate A write-back contract is supplied, the SurfaceSpec exposes only read-only and surface-local actions and leaves owner approval external.

`test/e2e-surface.test.mjs` protects the pinned planning/product revisions, source roles, lifecycle stages, non-authoritative action set, and source-revision focus reset behavior.

## Real E2E proving case: code review

`examples/e2e-code-review-pr22.json` uses Representation Router PR #22 itself as a code-review subject. The fixture pins comparison base `52c694a0dc44a040550f69e2ed6e7cf0aa4b21f6` and reviewed subject `bf2ee50c5246135b9f901d576ab430dc08bc32fc` rather than silently following a moving branch head.

The surface coordinates five concern-specific ViewSpecs:

1. change map — which exact files changed and which contract area they affect;
2. contract impact — how ViewSpec, CollectionSpec, SurfaceSpec, source authority, and action boundaries relate;
3. requirement trace — accepted obligations → implementation/docs/test definitions;
4. verification state — configured/defined checks versus actual execution evidence; and
5. review state — what remains before an external disposition can be justified.

The code-review case did **not** require GitHub-specific fields in SurfaceSpec. Git/code relations such as `implemented-by`, `documented-by`, and `verified-by-definition` remain ViewSpec projection data. GitHub/PR state appears only through exact source bindings.

Two reusable verification rules emerged:

- **the existence of a check is not evidence that the check ran** — test files and CI YAML are implementation artifacts until an execution receipt exists;
- **local interaction is not external authority** — a `surface-local` action cannot name an external destination, subject revision, or authority object, and a read-only action cannot carry write-like stale/evidence semantics.

The proving case therefore exposes only read-only patch inspection and a surface-local review note. It does not emit an authoritative GitHub review action merely because the connected repository can technically support one.

`test/e2e-code-review-surface.test.mjs` protects exact revision pinning, evidence-role separation, domain-neutral SurfaceSpec shape, local/read-only action boundaries, requirement coverage, and focus reset when the reviewed revision changes.

## Other lifecycle producers

The same boundary should extend without adding a universal engineering ontology:

- **source code / AST / dependency analysis** owns symbols, references, revisions, and code truth; RR may provide architecture, change-impact, call-flow, schema, or review views;
- **tests and runtime evidence** own observations and execution identity; RR may provide coverage, evidence, failure-propagation, trace, or conformance views;
- **documentation systems** own authored statements and revisions; RR may provide explorable explanations, conceptual maps, examples, traceability, and navigation surfaces;
- **product/domain systems** own user-visible state and permitted operations; RR may help specify the actual UI while the product owns persistence, authorization, and effects.

## Contract shape

The v0.1 contract records:

- `purpose` — human job, audience, lifecycle stage(s), modes;
- `views` — referenced ViewSpecs plus primary/complementary/supporting role;
- `sourceBindings` — source ID, owner, exact revision, role, optional locator;
- `interfacePatterns` — reusable working-surface behaviors from the catalog;
- `stateContract` — semantic selection identity, pivot behavior, revision-change behavior, shared-filter scope;
- `actions` — read-only, surface-local, or authoritative-write contracts;
- `provenance` — surface/view/source/evidence trace expectations; and
- `successCriteria` — observable human outcome for the composed surface.

The contract is intentionally not a persistence model, event protocol, database schema, workflow engine, universal project ontology, domain projection registry, source-control model, or authorization framework.

## Open falsification questions

Company Planning, DoDAF, and the retained code-review snapshot already exercise planning/review semantics, formal architecture projection, product UI, cross-lifecycle traceability, revision-pinned source review, and evidence/non-evidence distinctions.

Potential future falsification pressures include documentation/learning surfaces, operational product-owned actions, and end-user product UI composition. **They are not the active roadmap during Consolidation v0.** New proving expansion should wait until the consolidation stop conditions justify it.

When future cases are evaluated, the governing question remains: can SurfaceSpec express the reusable application-facing coordination without absorbing domain-specific meaning, persistence, authorization, or workflow execution? Fields that repeatedly require domain-specific meaning belong in adapters or products, not the core SurfaceSpec.
