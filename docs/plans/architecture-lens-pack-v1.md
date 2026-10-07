# Architecture Lens Pack v1 Plan

**Planning path:** durable single-contributor  
**Status:** implemented and CI-verified; awaiting human review  
**Risk tier:** Tier 2 — review-surface behavior  
**Target:** PR #23 / `feature/review-workbench-v0`

## Outcome

Extend the first Review Workbench checkpoint with architecture representations that answer materially different questions without forcing the reviewer into raw code or one overloaded diagram.

Human checkpoint: **Do component, sequence, and state views make the architecture and lifecycle of the change easier to understand and inspect?**

## Current truth

- Review Workbench v0 remains the verified comparison baseline.
- v1 adds actual Component, Sequence, and State diagrams while keeping Requirements, Evidence, and Review lenses.
- The user explicitly requested richer visual language, including UML-style architecture diagrams.
- Representation choice remains downstream of the human concern: structure, ordered interaction, and lifecycle state are separate views rather than one overloaded graph.

## Implemented scope

1. v0 remains intact as the comparison baseline.
2. Added `review-workbench/pr22.architecture-v1.json` as explicit source-bound diagram semantics.
3. Added a **component diagram** for structural ownership/boundaries.
4. Added a **sequence diagram** for machine/human handoffs over time.
5. Added a **state diagram** for implementation → verification → merge/build → human review.
6. Linked diagram nodes/messages/states to the same provenance inspector used by the rest of the workbench.
7. Kept Requirements, Evidence, and Review lenses alongside the diagrams.
8. Added `src/review-workbench-v1.mjs`, `scripts/build-review-workbench-v1.mjs`, and `test/review-workbench-v1.test.mjs`.
9. CI builds and retains both v0 and v1 artifacts from the same tested revision.

## Design decisions

- Use simplified UML-compatible visual grammar, not UML formalism for its own sake.
- Component view uses typed boxes, owner boundaries, named dependencies, and direction.
- Sequence view uses participants, lifelines, ordered messages, and explicit human/machine handoffs.
- State view uses named states, guarded transitions, and a visually distinct human-review gate.
- Do not infer semantics from layout. Every node/message/state/transition comes from explicit model data.
- Use native SVG/HTML for v1 so this checkpoint tests the representation before adding another renderer dependency.
- The state model contains no direct `Machine verified → Accepted` transition; human review is an explicit gate.

## Non-goals

- No universal UML metamodel.
- No class diagram unless the review question actually requires a domain/type model.
- No automatic source-code reverse engineering in this tranche.
- No editing or write-back from diagrams.
- No changes to router scoring, SurfaceSpec, or domain semantics.

## Acceptance evidence

CI run `35047758582` on exact head `fd815150c0ce8849ee4f1c4b33ee8760731f56bf` completed successfully:

- `npm ci` — success
- `npm test` — success (102 tests; 100 passed, 1 skipped, 0 failed)
- `npm run build:review-workbench` — success
- `npm run build:review-workbench:v1` — success
- v0 artifact upload — success
- v1 artifact upload — success

Retained v1 artifact:

- artifact name: `review-workbench-v1`
- artifact id: `10427960991`
- archive digest: `sha256:9ee0cedd0c094e8ff68477b82e6e7ffdc3c4fa03ec64975ae9ff5d7d529355c2`
- generated `index.html`: 59,207 bytes
- generated HTML SHA-256: `46ecd088cb2d7073944d5fd64ee4b26987aa066c6509f9c6dd00feb2cf8eebfb`

Static artifact inspection confirms seven lenses (`overview`, `component`, `sequence`, `state`, `requirements`, `evidence`, `review`), three SVG diagrams, one shared inspector, and no external script source.

One CI failure occurred during implementation because a test regex mistook embedded provenance URLs for external JavaScript. The renderer contract was already self-contained; the assertion was narrowed to actual `<script src>` dependencies and the exact rerun above passed.

## Stop condition

Reached. The verified v1 artifact is now the human-review subject. Do not add class/activity diagrams or automated diagram routing until the user reviews Component, Sequence, and State.
