# Project planning + review template

Representation Router should provide one stable project shell that is **projected onto** rather than rebuilt per project.

The authoritative plan remains in Company Planning. RR consumes a standardized `project-review-projection.v1` record plus purpose-specific planning-review surfaces and renders them into the same shell.

## Stable template

### Planning

Planning is normative and dialogue-derived.

The template exposes:

- goals and intended outcomes;
- ordered implementation slices;
- intended Component, Sequence, and State views when applicable;
- acceptance / planned-evidence references; and
- the final target state.

Planning never claims that an intended slice, architecture element, or acceptance condition has been implemented.

### Review

Review is checkpoint-bound.

The template exposes:

- a checkpoint / slice selector;
- what changed in the selected slice;
- current slice status;
- the exact implementation revision;
- gap to the next slice;
- gap to the final target;
- the actual product artifact at that revision;
- concrete run / example references;
- actual Component, Sequence, and State views when applicable; and
- observed evidence and unsupported claims.

The current product is an **artifact binding**, not a renderer-owned reconstruction. RR may embed exact supplied artifact bytes or link to the pinned product artifact. It must not redesign the project UI.

## Identity continuity

The same goal, slice, architecture element, requirement, and checkpoint identities should remain traceable across Planning and Review.

A review checkpoint binds:

```text
plan revision
+ slice id
+ implementation revision
+ review-surface refs
+ evidence refs
+ product artifact
+ concrete run refs
```

Changing the plan through dialogue creates a new Company Planning plan revision. Historical checkpoints remain bound to the plan revision they were implemented against.

## Diagrams

Different architectural questions remain separate full-size views. Do not compress Component, Sequence, State, Contract, or other materially distinct views into thumbnail cards merely to fit one page.

Every semantic node and relationship in a rendered diagram must be selectable and resolve into the shared inspector.

## Product artifact rule

> RR may wrap the product UI, but it should not recreate the product UI.

If the product artifact cannot be resolved for the exact checkpoint, Review should show it as unavailable with the exact repository, revision, entrypoint, and required resolver step.

## Company Planning boundary

Company Planning owns `project-review-projection.v1`. The record is a derived projection over native roadmap/design/work/evidence records, not a second planning authority.

RR owns:

- template composition;
- representation selection and rendering;
- cross-view navigation;
- the shared inspector; and
- read-only presentation of exact product/run bindings.

Company Planning owns:

- goals and plan revisions;
- slice identities/order and acceptance intent;
- authoritative planning source references;
- checkpoint-to-slice bindings;
- exact implementation/product/run references supplied to Review; and
- any authoritative plan mutation produced by later dialogue.

## Proving project

`examples/twitter-prospecting-project-template.json` and
`examples/twitter-prospecting-project-surfaces.json` dogfood the template against the current
`Inside-Success/twitter-prospecting` project.

The example product binding is pinned to commit
`ab2cfba0e8c43f0198716dee4414dedf2212d478` and entrypoint
`apps/twitter_prospecting/static/index.html`.

The example does not claim a live provider run unless exact run evidence is attached.
