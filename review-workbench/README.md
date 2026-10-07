# Review Workbench

This directory contains the tangible human-review checkpoints for Representation Router's lifecycle-wide working-surface model.

The early checkpoints review merged PR #22, which introduced `SurfaceSpec`. The newer checkpoints use that review surface to test the larger product thesis: a person should be able to understand and then perform real software-engineering work through task-appropriate representations while retaining exact technical truth underneath.

## v0 baseline

Generate with `npm run build:review-workbench`.

Output: `artifacts/review-workbench-v0/index.html`.

The v0 lenses are Change, Architecture, Requirements, Evidence, and Review.

## v1 architecture lens pack

Generate with `npm run build:review-workbench:v1`.

Output: `artifacts/review-workbench-v1/index.html`.

v1 adds static Component, Sequence, and State diagrams while keeping Requirements, Evidence, and Review.

## v1.1 interactive architecture

Generate with `npm run build:review-workbench:v1.1`.

Output: `artifacts/review-workbench-v1.1/index.html`.

v1.1 proves draggable/selectable graph interaction, relationship inspection, connection highlighting, and linked evidence/requirements. Human review identified implementation-oriented language such as `Lock layout` and `Neighbors on/off` as a comprehension problem.

## v1.2 task-first capability pass

Generate with `npm run build:review-workbench:v1.2`.

Output: `artifacts/review-workbench-v1.2/index.html`.

v1.2 keeps the interaction/technical truth but changes the default language and interaction policy:

- first screen starts with what changed, why it matters, what the person can do, and what still needs a person;
- graph controls become **Show whole diagram** and **Reset positions**;
- connection highlighting becomes automatic;
- exact `ViewSpec`, `SurfaceSpec`, IDs, formal relationships, revisions, and sources remain under **Technical details**.

The generalized rule is in [`docs/task-first-engineering-language.md`](../docs/task-first-engineering-language.md) and [`SKILL.md`](../SKILL.md):

> **Lead with the job. Teach the technical language in context. Preserve the exact truth underneath.**

## v1.3 Build a Feature v0 — current checkpoint

Generate with:

```bash
npm run build:review-workbench:v1.3
```

Output: `artifacts/review-workbench-v1.3/index.html`.

v1.3 is the first create-and-ship vertical slice rather than another review-only surface. The real feature is **Remember my diagram arrangement**.

The default **Build this feature** screen walks through the same feature that the artifact actually implements:

1. **Outcome**
2. **Behavior**
3. **Design**
4. **Build**
5. **Test**
6. **Release**
7. **Use**

### Real saved-layout behavior

In **System map** or **What happens next**:

- drag a box;
- the positions are saved automatically in this browser;
- reopen/reload the same exact reviewed revision and the arrangement is restored;
- **Reset positions** deletes the saved arrangement for that diagram and restores deterministic defaults;
- if browser storage is blocked, the graph remains usable and says the positions will not be remembered.

The persistence contract is renderer-independent in [`src/layout-persistence.mjs`](../src/layout-persistence.mjs). Saved state is intentionally limited to:

```text
workbench + exact subject revision + diagram lens
+ saved time
+ node id / x / y positions
```

A saved layout contains no semantic relationships, requirements, evidence, permissions, or workflow state. It is local presentation memory, not architecture truth.

See [`docs/plans/build-feature-saved-layouts-v1.3.md`](../docs/plans/build-feature-saved-layouts-v1.3.md) and [`review-workbench/saved-layout-feature-v1.3.json`](saved-layout-feature-v1.3.json).

## Shared authority boundary

All workbench versions are representations over source-owned truth. Graph movement may change local/persisted presentation state, but it never changes semantic identity, relationship direction/type, source evidence, Git state, planning state, authorization, or product/workflow authority.

CI retains v0, v1, v1.1, v1.2, and v1.3 from the exact tested PR revision so the checkpoints can be compared directly.
