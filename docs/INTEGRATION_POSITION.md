# Integration position

Representation Router is the reusable **representation design and policy layer** between authoritative semantic/workflow sources and the product-owned surfaces people use to understand, plan, review, edit, learn, or decide.

It does not own domain semantics, planning/workflow truth, evidence custody, persistence, authorization, application state, deployment state, or external effects.

Its reusable job is narrower:

```text
authoritative domain / workflow truth
        ↓
concern-specific semantic projection
        ↓
representation policy
        ↓
ViewSpec(s)
        ↓
optional CollectionSpec / SurfaceSpec
        ↓
product-owned renderer / application / workflow
```

## What belongs to the reusable core

The core exists to make representation decisions explicit, inspectable, and reusable across domains.

Stable core responsibilities are:

- keep semantic truth, semantic projection, representation, visual primitive, renderer, and working surface distinct;
- reject unavailable semantic views rather than fabricating plausible output;
- preserve partial/missing semantics in successful projections;
- apply hard representation constraints before soft ranking;
- explain score contributions and rejection reasons;
- distinguish reviewed substitute and complement representation relationships;
- preserve provenance, semantic identity, interaction, accessibility, scale, and success criteria;
- produce renderer-independent `ViewSpec`s;
- standardize repeated collections with `CollectionSpec` where appropriate;
- compose source-bound human working surfaces with `SurfaceSpec` when several views, shared focus, source revisions, interface patterns, or action boundaries must work together;
- keep authoritative-write contracts explicit about destination, subject revision, actor/authority basis, stale-submission behavior, and retained evidence; and
- route an already-selected representation toward an implementation/playbook/quality method without making a library the starting point.

The core recommends, composes, explains, and validates representation policy. It does not become the executor of the surrounding product workflow.

## Planning and review

Planning/review is a primary proving use of the core, but Representation Router does not become the planning system.

An owning planning/workflow system supplies authoritative plan/work meaning. Architecture sources supply architecture truth. Git/code supplies implementation revisions. Tests, CI, evidence stores, and runtime systems supply the evidence they actually own.

Representation Router can project those sources into coordinated concern-specific views such as:

- **Work** — intended outcomes, units, dependencies, blockers, and next actions;
- **Architecture** — affected boundaries, components, contracts, and flows;
- **Assurance** — requirements, risks, checks, evidence, and gaps; and
- **Review** — implemented change, demonstrated behavior, drift, limitations, and pending human judgment.

Prospective planning and completed-work review use the same ownership rule: the surface is a revision-bound projection over external truth, not a second planning database.

Recorded plan state, implementation state, executed evidence, displayed review state, human disposition, and authoritative workflow state remain separate concepts.

See [`../references/planning-review.md`](../references/planning-review.md).

## Core versus proving/reference applications

This repository contains both the reusable policy layer and applications built to exercise it.

Current proving/reference applications include planning/review workbenches, Review Workbench generations, authoring studios, implementation runners, diagnostic/fix flows, Engineering Home, Release + Operate staging proofs, and the Representation Router Self Map.

These applications are important because they reveal real representation failures. They are **not automatically part of the minimal core**.

A product-specific behavior should move toward core only when repeated independent cases show that it is lifecycle/domain neutral and materially reduces duplicated reasoning. Workflow semantics, persistence, execution adapters, deployment behavior, and product-specific state should otherwise stay with the consuming application.

This distinction is now an explicit consolidation constraint. See [`plans/consolidation-v0.md`](plans/consolidation-v0.md).

## Relationship to consuming domains

### Company Planning

Company Planning owns planning meaning, outcome/work lifecycle, authority, evidence expectations, and review/write-back semantics. Representation Router may project that truth into planning, architecture, assurance, implementation, and review surfaces without becoming a second planning authority.

### Architecture / formal-modeling systems

DoDAF, UAF, SysML, UML-derived practices, architecture repositories, and product-specific architecture models own semantic eligibility and domain meaning. Representation Router may reuse representation families, coordinated-view behavior, provenance, shared focus, and quality policy without deciding what belongs in the underlying model.

### Code, tests, CI, runtime, documentation, and product models

The same boundary applies: each source owns the facts and authority it can legitimately establish. Representation Router can coordinate their projections without merging them into one universal ontology.

## ViewSpec, CollectionSpec, and SurfaceSpec

- **ViewSpec** describes one concern-specific semantic projection and its representation, interactions, availability, provenance, and success criteria.
- **CollectionSpec** standardizes repeated or portfolio-like collections of ViewSpecs with common presentation/selection behavior.
- **SurfaceSpec** coordinates one or more ViewSpecs into a source-bound working surface with human job, source/revision bindings, shared semantic focus, interface patterns, actions, provenance, and surface-level success criteria.

`SurfaceSpec` does not authorize an external effect merely because an action is visible.

A read-only action has no write destination. A surface-local action may change presentation or local review state only. An authoritative write must name the owning destination, target revision, exact subject revision, actor/authority basis and scope, stale-submission behavior, and evidence-retention rule. The consuming product performs and validates the write.

## Shared semantic focus

A representation pivot changes the lens, not semantic identity.

Selection should normally be keyed by stable semantic IDs and survive compatible pivots. If the selected subject is absent from the new view, the surface should say that it is not represented rather than silently changing subjects.

A source-revision change clears focus or requires an explicit remap. Display-label matching is not a safe semantic remapping strategy.

## Evidence and recommendation policy

The repository deliberately separates:

- source or model truth;
- a test/check definition;
- evidence that the check executed;
- a rendered working surface;
- human comprehension/usefulness; and
- authoritative acceptance or workflow mutation.

Passing automation establishes only the behavior that automation exercised.

Likewise, the router's heuristic weights and numeric thresholds are inspectable hypotheses, not universal design laws. They should change because observed routing failures or repeated task-performance evidence justify a change, not because the catalog could be made larger.

## What remains open

During Consolidation v0, the following are questions to make testable rather than capabilities to rush into the core:

1. how to express semantic projection eligibility, derivation, aggregation meaning, omission, and lineage more rigorously;
2. when the router should abstain rather than return a weak winner;
3. how complement relationships should influence coordinated-set selection before a final recommendation;
4. how adaptive scale thresholds should carry task/audience/evidence context;
5. whether implementation and interaction policy should be data-owned, code-owned, or split along an explicit boundary;
6. whether a reusable `ViewpointSpec` earns a separate contract;
7. when a repeated working-surface pattern is genuinely reusable rather than product composition; and
8. whether physical repository separation into core/contracts/reference applications will materially reduce coupling after dependency boundaries are measured.

## Boundary

Representation Router should remain valuable if every proving application is removed.

Its durable contribution is an evidence-sensitive, inspectable decision layer that can tell a consuming product **which human representation should exist, what semantic truth it is allowed to represent, why the representation fits the task, what limitations remain, and where product/workflow authority still lives**.
