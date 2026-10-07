# Consolidation dogfood implementation order

**Status:** active companion to `docs/plans/consolidation-v0.md`  
**Purpose:** use Representation Router on its own existing planning/review consumers while preventing dogfood from becoming another scope-expansion path.

Dogfooding is valuable only if it creates evidence about the reusable Representation Router boundary. Building another surface to prove that Representation Router can build surfaces would repeat the failure mode Consolidation v0 is meant to stop.

The governing rule is:

> **Use existing consumers to expose a repeated failure. Promote only the smallest abstraction that removes that repeated failure.**

`No new core abstraction` is a valid and often preferable result.

## Why implementation order matters

Representation Router already contains many successful proving applications. That creates a strong temptation to respond to every useful idea by adding another schema, workflow, lens, dashboard, or lifecycle capability.

The safer sequence is evidence-gated:

```text
validate what already exists
        ↓
dogfood existing consumers
        ↓
observe one concrete ambiguity/failure
        ↓
solve it locally first
        ↓
repeat in an independent existing consumer
        ↓
compare semantics
        ↓
promote only the smallest common contract, if any
        ↓
re-run existing consumers as regressions
```

Each downward transition requires evidence. Interesting ideas do not skip gates.

## Stage 0 — freeze the capability surface

During this sequence, do not add:

- a new product/workbench/dashboard;
- a new engineering lifecycle stage;
- a new renderer or representation family;
- a universal evidence graph;
- a universal software-engineering ontology;
- a generalized confidence system;
- a new durable projection/evidence schema merely because one proving app could use it; or
- new workflow authority inside Representation Router.

Use the existing Company Planning review integration, code-review proving case, Review Workbench family, Self Map, and current contracts as the available experimental substrate.

A new proving surface is justified only if the existing consumers literally cannot exercise the question. That should be demonstrated, not assumed.

## Stage 1 — validate the contracts we already claim

Issue #26 is implemented on the consolidation branch. The five existing public structural contracts now have runtime validation ownership, actionable failures, and regression coverage; no new representation/workflow capability or schema was added.

Priority boundaries were:

1. use-case input;
2. agent recommendation output;
3. `ViewSpec`;
4. `CollectionSpec`; and
5. `SurfaceSpec`.

The implementation also exposed and repaired one pre-existing schema/output mismatch: a direct accepted routing result could emit an empty `ViewSpec.rationale` even though the schema requires at least one rationale item.

Detailed ownership is recorded in [`runtime-contract-validation.md`](runtime-contract-validation.md).

**Gate to Stage 2:** satisfied on the consolidation branch. Keep issue #26 open until PR review/merge so branch implementation is not confused with landed project state. This gate authorizes dogfood analysis and consumer-local experiments; it does not authorize a core schema change.

## Stage 2 — dogfood two existing independent consumers

The first bounded two-consumer experiment is implemented on the consolidation branch and recorded in [`evidence/projection-epistemic-dogfood-v0.md`](evidence/projection-epistemic-dogfood-v0.md).

It used two already-existing cases that stress different domains:

### Consumer A — bounded Company Planning review

Questions include:

- what work was intended;
- what architecture/contracts are implicated;
- what evidence exists for the exact reviewed subject;
- what remains unsupported or partial; and
- what human judgment remains.

The local experiment separates required evidence from observed execution evidence, pins observed evidence to the reviewed contract revision, and rejects a mismatched evidence revision.

### Consumer B — code-review SurfaceSpec/proving case

Questions include:

- what exact files/contracts changed;
- what requirements and architecture are affected;
- what verification actually executed;
- what is definition/configuration versus execution evidence; and
- what review disposition is still pending.

The local experiment uses a separate proving-case overlay to distinguish executable check definitions from missing execution evidence and rejects a stale overlay revision. Existing ViewSpecs and SurfaceSpec remain unchanged.

**Gate to Stage 3:** satisfied for the first hypothesis. The same high-level distinction repeats, but its lifecycle/data shape does not repeat strongly enough to earn a core evidence-state contract.

## Stage 3 — test one abstraction hypothesis at a time

The first hypothesis was:

> Can a load-bearing visible claim or relationship distinguish its source/revision, supporting evidence, presentation-time epistemic state, and limitation/non-claim without confusing source authority with rendered review state?

The result is conservative:

- **shared invariant:** required evidence is not observed evidence; observed evidence is revision-bound and should carry a limitation/non-claim;
- **consumer-local representation:** item-level evidence state stays with the adapter/proving case;
- **no core promotion:** no new `EvidenceSpec`, `ProjectionSpec`, `SemanticViewSpec`, ViewSpec field, SurfaceSpec field, universal state enum, or confidence system is justified by this experiment.

Candidate state names used during dogfood are consumer semantics, not a proposed universal vocabulary.

**WIP limit:** one reusable-abstraction hypothesis at a time. Adjacent ideas stay in the backlog rather than being bundled into the completed evidence-state experiment.

## Stage 4 — run negative controls

The first experiment includes a negative control in each consumer:

```text
Company review
execution evidence revision != reviewed contract revision
    → reject; criterion remains unobserved

Code review
local evidence-state revision != reviewed subject revision
    → reject as stale; do not treat evidence state as current
```

These complement existing distinctions between evidence definitions/configuration and actual execution evidence.

**Gate to Stage 5:** satisfied for the first experiment. Both consumers fail closed on the tested revision mismatch.

## Stage 5 — compare before generalizing

The comparison in [`evidence/projection-epistemic-dogfood-v0.md`](evidence/projection-epistemic-dogfood-v0.md) classifies the repeated evidence-state idea as:

> **common concept, adapter-owned representation**

The two consumers agree on the need to distinguish required versus observed evidence and to bind evidence to the exact reviewed revision. They do not yet share the same evidence lifecycle, owners, or useful state vocabulary.

Do not promote merely because two JSON objects can be made to look alike.

## Stage 6 — promote the minimum, or promote nothing

For the first experiment, the promotion result is **documentation/invariant only**.

The reusable rule is:

1. required evidence is not observed evidence;
2. observed evidence is scoped to an exact subject/revision;
3. observed evidence should expose what it does not establish; and
4. presentation state does not become source/workflow authority.

Item-level evidence-state structures remain consumer-local.

For future hypotheses, prefer the smallest possible change, in order:

1. documentation/invariant only;
2. validation rule over existing fields;
3. reusable helper over existing contracts;
4. optional field on an existing contract;
5. new durable contract only when the earlier options cannot express the repeated requirement cleanly.

A new schema is therefore the **last** promotion option, not the first implementation step.

## Stage 7 — regress against the proving portfolio

Any promoted core change must keep existing proving applications useful as regression consumers without importing their product semantics into core.

The first experiment promotes no code-level core change. Its consumer-local changes must still keep:

- existing router/recommendation tests green;
- Company Planning review behavior source-bound;
- code-review evidence/authority distinctions intact;
- Self Map/other proving builds free of product-specific core exceptions; and
- core modules independent of proving applications.

A green build establishes compatibility with configured automation, not human usefulness.

## Stage 8 — human review before the next hypothesis

**Gate disposition:** cleared by contributor direction to proceed after review of the bounded dogfood/T3B findings.

Before starting another abstraction hypothesis, review:

- Was the review question easier to answer?
- Did the required-versus-observed distinction become clearer rather than noisier?
- Could the reviewer reach exact source/evidence when needed?
- Did the local metadata remove ambiguity, or only add fields?
- Did the surfaces remain smaller and comprehensible?
- Did any new concept accidentally absorb source/workflow authority?

If the result is weak, keep or remove the local metadata as appropriate. Do not start #28 automatically.

## Ordering of the current consolidation backlog

The completed consolidation sequence is:

```text
#26 runtime contract validation
        ↓
#27 first two-consumer evidence-state dogfood
        ↓
contributor review / proceed gate
        ↓
T3B architecture provider-boundary falsification
        ↓
#28 abstention / complement-set analysis
        ↓
no mass physical reorganization (measured coupling does not justify it)
```

This ordering is intentional.

- #26 establishes trustworthy executable boundaries.
- #27 uses existing applications to discover rather than invent semantics.
- contributor review allowed the bounded work to advance without promoting the consumer-local evidence model.
- #28 found a complement/projection mismatch but did not justify recommendation-contract machinery.
- physical reorganization remains unjustified because the minimal core path is already separable.

## Relationship to newer AES ideas

Canonical AES reinforces this order rather than requiring a new RR capability immediately.

AES separates target/current/gap/plan/evidence authorities and explicitly prefers capability reuse before residual local implementation. For RR dogfood, that suggests two useful disciplines:

1. **characterization/evidence may be richer than the representation contract** — RR should consume the minimum projection needed for a concern instead of becoming the evidence store; and
2. **representation policy should prove value through an authentic consumer** — not through self-description or a new RR-only product shell.

If AES later presents a real representation/context capability requirement, it should be treated as an external independent consumer/provider-resolution case, not used as permission to pre-build a universal AES surface inside RR.

## Stop conditions

Stop the dogfood sequence without promotion when any of these is true:

- the ambiguity occurs in only one consumer and is naturally domain-owned;
- an existing contract already expresses the needed distinction once validation is enforced;
- additional metadata does not improve a real human/agent task;
- the proposed abstraction requires importing planning/code/evidence ontology into core;
- the experiment starts requiring a new product surface merely to justify itself; or
- the cost/complexity of the abstraction exceeds the repeated reasoning it removes.

The objective is not to maximize what Representation Router can model.

The objective is to keep the reusable representation-policy layer **small, evidence-earned, and useful across independent consumers**.
