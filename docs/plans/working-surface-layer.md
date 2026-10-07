# Working Surface Layer Plan

**Planning path:** durable single-contributor  
**Status:** complete — source, real proving cases, and canonical repository suite verified  
**Target repository:** `brianmills-spec/representation-router`

## Outcome

Add a reusable Representation Router contract for composing one or more `ViewSpec`s into a human working surface across planning, architecture, implementation, documentation, review, evidence, operations, learning, code review, and product UI without becoming a second semantic or workflow authority.

The proving domains are deliberately different:

- **Company Planning** — lifecycle/work semantics and revision-bound review authority;
- **DoDAF** — formal semantic projection, readiness/gaps, evidence, and a real product UI;
- **PR #22 code review** — revision-pinned source changes, architectural contract impact, verification semantics, and reviewer authority boundaries.

## Design decision

```text
domain / workflow truth
  -> concern-specific semantic projection(s)
  -> ViewSpec(s)
  -> SurfaceSpec
       - human job / lifecycle context
       - source + exact revision bindings
       - shared semantic focus / filters
       - interface-pattern composition
       - action authority boundaries
       - provenance + success criteria
  -> product-owned implementation
```

`SurfaceSpec` coordinates views; it does not decide semantic membership, own workflow state, persist authoritative data, or execute external effects.

Domain-specific relations such as `implemented-by`, `verified-by`, `published-as`, `reviewed-under`, `changes`, and `documented-by` remain ViewSpec projection data. They did not require generic SurfaceSpec fields in either the DoDAF or code-review proving case.

## Scope completed

1. Added `schemas/surface-spec.schema.json`.
2. Added deterministic `src/surface-spec.mjs` builder.
3. Preserved `CollectionSpec` as the repeated/portfolio collection contract.
4. Added exact source/revision bindings, shared focus rules, interface-pattern composition, provenance, success criteria, and action authority contracts.
5. Updated README, agent instructions, design model, and integration boundary docs.
6. Added Company Planning and DoDAF mappings in `docs/surface-spec.md`.
7. Added real DoDAF E2E proving case and regression tests.
8. Added real PR #22 code-review proving case and regression tests.
9. Added repository CI running Node 20, `npm ci`, and `npm test`.
10. Hardened action boundaries discovered during code review.

## Authority and evidence invariants

- Representation family, renderer, and interface pattern never establish semantic eligibility.
- A representation pivot changes the lens, not semantic identity.
- A source revision change clears semantic focus or requires explicit remapping.
- `read-only` actions cannot carry destination, subject revision, authority, write-like stale behavior, or retained-action evidence.
- `surface-local` actions cannot carry an external destination, subject revision, or authority object.
- `authoritative-write` actions require destination/target revision, exact subject revision, actor/authority basis + scope, stale-submission behavior, and retained evidence.
- Test definitions and CI configuration are not execution evidence. A green-suite claim requires an execution receipt.

## Acceptance criteria and result

1. **Compose ViewSpecs into one human working surface — met.**
2. **Read-only and writable surfaces do not imply unsupplied authority — met.**
3. **Authoritative writes are revision-bound — met.**
4. **Stable semantic focus survives compatible pivots and resets on source revision change — met.**
5. **Source/provenance bindings preserve owner + exact revision — met.**
6. **Company Planning and DoDAF fit without importing their ontologies — met.**
7. **Lifecycle-wide mission/boundary documented — met.**
8. **Adversarial authority/schema tests present — met.**
9. **Real DoDAF E2E case stays domain-neutral — met.**
10. **Real code-review case stays Git-neutral — met.**
11. **Canonical repository suite executes successfully — met.** GitHub Actions run `35043941479`, job `test`, completed `npm ci` and `npm test` successfully.

## Proving-case evidence

### Company Planning

`test/surface-spec.test.mjs` includes a revision-bound review action that must carry explicit destination, subject revision, authority, stale-write behavior, and evidence retention.

### DoDAF

`examples/e2e-dodaf-semantic-path-convergence.json` and `test/e2e-surface.test.mjs` span planning → semantic architecture → implementation → verification → deployed product UI → release evidence → pending owner review while preserving DoDAF-owned semantic eligibility.

### Code review

`examples/e2e-code-review-pr22.json` and `test/e2e-code-review-surface.test.mjs` coordinate changed files, architectural contract impact, requirement traceability, verification state, and review state for an exact PR snapshot without adding GitHub-specific SurfaceSpec fields.

The code-review pass found and repaired two concrete contract defects:

- `surface-local` could carry external write authority fields;
- read-only actions silently normalized schema-invalid stale/evidence inputs.

Both are now rejected and regression-tested.

## Verification

Canonical repository evidence is GitHub Actions run `35043941479`:

- `actions/checkout@v4` — success
- `actions/setup-node@v4` / Node 20 — success
- `npm ci` — success
- `npm test` — success

This closes the earlier checkout/CI verification gap.

## Non-goals preserved

The work did not add a universal software-project ontology, GitHub ontology, workflow engine, approval system, persistence layer, write API, new renderer dependency, or domain-specific semantic compiler.

## Stop condition

Reached. The working-surface layer and its two real E2E proving cases are implemented and repository-verified. Further work should be a new bounded tranche driven by a new pressure (for example documentation/learning, operations, or a real end-user product UI), not continued widening of this contract by default.
