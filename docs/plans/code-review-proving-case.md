# Code Review Working-Surface Proving Case

**Planning path:** durable single-contributor  
**Status:** complete — source + canonical repository suite verified  
**Risk tier:** Tier 2 — product state / contract adapter  
**Target:** PR #22 on `feature/working-surface-spec`  
**Review snapshot:** base `52c694a0dc44a040550f69e2ed6e7cf0aa4b21f6` → subject `bf2ee50c5246135b9f901d576ab430dc08bc32fc`

## Outcome

Prove that `SurfaceSpec` can support a real code-review workflow over a revision-pinned pull request by coordinating change/diff, architecture-contract impact, requirement-to-implementation traceability, test/evidence state, and review state without importing Git/GitHub or source-code ontology into the core schema.

The reviewer should be able to answer: **What changed, why was it required, which architectural contracts changed, what evidence exists, what evidence is still missing, and is this exact revision ready for a disposition?**

## Current truth

- PR #22 is itself the proving subject, not a synthetic code-review fixture.
- GitHub owns PR/change/review workflow truth; Representation Router only projects it.
- The reviewed snapshot spans schema, builder code, tests, conceptual architecture, agent instructions, examples, and CI.
- Self-review found and repaired two contract defects before acceptance:
  - `surface-local` actions could carry external destination/authority fields;
  - read-only actions silently normalized write-like stale/evidence inputs instead of rejecting them.
- The canonical repository suite now has executable evidence on the current PR head: GitHub Actions run `35043941479`, job `test`, with both `npm ci` and `npm test` completed successfully.

## Scope

1. Close the `surface-local` authority loophole in schema and builder.
2. Make read-only action inputs reject schema-invalid stale/evidence semantics rather than silently normalize them.
3. Add regression coverage for both boundaries.
4. Add a revision-pinned code-review fixture for PR #22.
5. Model Git/code relationships inside concern-specific ViewSpecs, not SurfaceSpec fields.
6. Distinguish test definitions and CI configuration from executed test evidence.
7. Keep review disposition read-only/surface-local unless an explicit external review-authority contract is supplied.
8. Record the reusable lessons from the proving case.

## Non-goals

- No GitHub or AST ontology in Representation Router core.
- No automatic GitHub approval/request-changes write-back.
- No claim that test files or CI YAML prove a passing run.
- No code-diff renderer or Git client.
- No Git-specific expansion of `SurfaceSpec`.

## Design decision

```text
PR/base/head truth
  -> change-map ViewSpec
  -> contract-impact ViewSpec
  -> requirement-to-change/evidence ViewSpec
  -> verification-state ViewSpec
  -> review-state ViewSpec
  -> SurfaceSpec
       - exact base/head/source revisions
       - shared semantic focus
       - review/interface patterns
       - local/read-only actions
       - provenance + success criteria
```

Relations such as `changes`, `implemented-by`, `documented-by`, `verified-by-definition`, and `blocks` remain code-review semantic data inside ViewSpecs.

## Acceptance criteria and result

1. **Surface-local cannot imply external authority — met.** Schema and builder reject destination, subject revision, or authority on `surface-local` actions.
2. **Read-only inputs are strict — met.** Write-like stale/evidence values are rejected rather than normalized away.
3. **Exact review snapshot — met.** `examples/e2e-code-review-pr22.json` pins base and subject revisions.
4. **Evidence semantics are explicit — met.** Test definitions and CI configuration are distinguished from executed test evidence.
5. **Five concern-specific review views — met.** Change, contract impact, traceability, verification, and review-state views are coordinated.
6. **No GitHub-specific SurfaceSpec field — met.** Git/PR concepts remain ViewSpec/source-binding data.
7. **No manufactured authoritative review action — met.** The proving surface uses read-only patch inspection plus a surface-local note only.
8. **Regression protection — met.** `test/surface-spec.test.mjs` and `test/e2e-code-review-surface.test.mjs` protect the authority/evidence boundaries.
9. **Repository integration evidence — met.** CI run `35043941479` succeeded; its `test` job completed `npm ci` and `npm test` successfully.

## Evidence semantics learned

- PR diff → **evidence of what changed**.
- Test file → **implementation of an executable check**, not proof it passed.
- CI YAML → **implementation of an execution path**, not proof a run occurred.
- Successful CI execution receipt → **evidence that the configured suite passed for that revision**.

This distinction should carry into other verification surfaces: the existence of a check is not evidence that the check ran.

## Implementation evidence

- `schemas/surface-spec.schema.json`
- `src/surface-spec.mjs`
- `test/surface-spec.test.mjs`
- `examples/e2e-code-review-pr22.json`
- `test/e2e-code-review-surface.test.mjs`
- `docs/surface-spec.md`
- GitHub Actions run `35043941479` / job `test`

## Stop condition

Reached. Do not expand this slice into code-diff rendering, automated code analysis, or GitHub write-back. The source contract and canonical repository suite are both verified.

## Reset conditions

None fired. The proving case strengthened rather than widened the abstraction: Git-specific semantics stayed outside SurfaceSpec, local actions lost external authority, and verification semantics now distinguish defined/configured checks from executed evidence.
