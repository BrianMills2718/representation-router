# Review Workbench v0 Plan

**Planning path:** durable single-contributor  
**Status:** active  
**Risk tier:** Tier 2 — product review surface  
**Target repository:** `brianmills-spec/representation-router`  
**Branch:** `feature/review-workbench-v0`

## Outcome

Produce the first tangible browser-based Representation Router review surface from real repository truth. A nontechnical or technical reviewer should be able to understand what PR #22 changed, why it changed, how the architecture now fits together, what evidence exists, what the evidence does not prove, and what human judgment remains—without opening raw code first.

The artifact is the checkpoint. It must be a self-contained HTML workbench generated from a revision-pinned model, not another conceptual document.

## Review question

**Does this make it materially easier to understand and evaluate the software change than reading the PR, files, tests, and planning documents separately?**

## Current truth

- PR #22 merged as `c746125d6dec518ca0ba2df0a278890bb408df35`.
- Its verified pre-merge head was `03a74c99fe277daf2a75aac327b1649ad21b996f` against base `52c694a0dc44a040550f69e2ed6e7cf0aa4b21f6`.
- GitHub Actions run `35044053698` completed successfully, including `npm ci` and `npm test`.
- SurfaceSpec, its authority-boundary tests, the DoDAF E2E proving case, and the real code-review proving case are now on `main`.
- Existing interface patterns already describe the intended behavior: `review-before-completion`, `primary-detail-inspector`, `requirement-to-evidence-traceability`, `dashboard-progressive-disclosure`, and `completion-receipt`.

## Scope

1. Add a revision-pinned `review-workbench-pr22` model containing the outcome, change story, architecture layers, requirements/obligations, evidence/nonclaims, source links, and final review state.
2. Add a dependency-free HTML generator that converts that model into one self-contained interactive artifact.
3. Give the artifact five coordinated lenses: Change, Architecture, Requirements, Evidence, and Review.
4. Use progressive disclosure: overview first, click/select for detailed evidence and source links.
5. Keep semantic status distinct from UI focus styling and include text labels for all state.
6. Make the artifact responsive and keyboard-operable.
7. Add a build command and deterministic source-level tests.
8. Produce the artifact at `artifacts/review-workbench-v0/index.html` and expose its source entrypoint under `review-workbench/`.

## Non-goals

- Do not implement a generic IDE, Git client, or automatic code-analysis engine.
- Do not add a visualization library for this first surface.
- Do not create write-back, approval, merge, deployment, or planning mutations.
- Do not replace GitHub, Company Planning, or DoDAF as source authority.
- Do not widen SurfaceSpec unless this concrete UI cannot be expressed with the merged contract.
- Do not hide raw sources; use progressive disclosure so they remain one click away.

## Working-surface composition

```text
merged PR #22 truth
  -> change-story view
  -> architecture view
  -> requirement/evidence traceability view
  -> verification view
  -> review/completion view
  -> Review Workbench v0
       - shared selected concept
       - detail inspector
       - exact source links
       - explicit nonclaims
       - human review question
```

The primary surface starts with the human outcome rather than a file list. Source files and commit identities live in the inspector/evidence layer.

## Acceptance criteria

1. Opening one HTML file is enough to review the artifact.
2. The first screen states what changed, current status, CI evidence, and the remaining human review question.
3. The Change lens shows an understandable left-to-right story from problem → contract → implementation → evidence → result.
4. The Architecture lens distinguishes source/domain truth, ViewSpec, SurfaceSpec, and product-owned implementation.
5. The Requirements lens traces every major obligation to implementation and evidence and makes missing evidence visible.
6. The Evidence lens separates `proves` from `does not prove` and links to exact sources/revisions.
7. The Review lens states implemented/tested/merged status and asks for human comprehension/usefulness rather than treating CI as acceptance.
8. Selecting a concept updates one shared inspector without losing the current lens.
9. The artifact is usable at desktop and narrow/mobile widths without essential hover-only information.
10. `npm test` passes and the build command emits a deterministic self-contained HTML artifact.

## Implementation slices

### Slice 1 — model

Add `review-workbench/pr22.model.json` with stable IDs, source bindings, five lens definitions, traceability rows, evidence/nonclaims, and exact merged/verified revisions.

### Slice 2 — renderer

Add `src/review-workbench.mjs` with a deterministic HTML renderer. Use native HTML/CSS/SVG only. No new dependency.

### Slice 3 — product source + build

Add `review-workbench/index.html` as a lightweight source entrypoint/documentation page and `scripts/build-review-workbench.mjs` to emit the self-contained review artifact. Add `build:review-workbench` to `package.json`.

### Slice 4 — evidence

Add tests for model/source integrity, revision pinning, traceability coverage, nonclaim visibility, self-contained output, accessible controls, and critical visible copy.

## Verification

Required repository evidence:

- `npm test` on the exact PR head;
- `npm run build:review-workbench` succeeds;
- generated HTML contains no external runtime dependency;
- source-level responsive/accessibility invariants are tested;
- PR diff shows no unrelated router/catalog changes.

Browser geometry QA is desirable but not required if the connected browser environment is unavailable; in that case the first human review of the actual artifact is itself the comprehension/usability checkpoint.

## Stop condition

Stop when the workbench artifact exists, the exact source/evidence identities are visible, repository tests are green, and the artifact is ready for Brian to review. Do not start the documentation-learning tranche before this human checkpoint.

## Reset conditions

Revise rather than widen scope if the artifact requires domain-specific changes to SurfaceSpec, if the first screen devolves into a raw file/test dump, or if CI/test state is presented as human acceptance.
