# Implementation Loop v0 — Brief to Verified Candidate

**Planning path:** durable single-contributor  
**Status:** complete — candidate, executed evidence, and loop surface verified  
**Risk tier:** Tier 2 — candidate implementation from revision-bound engineering intent  
**Target:** PR #23 / `feature/review-workbench-v0`

## Outcome

Close the next lifecycle gap after Feature Studio v0: prove that a revision-bound implementation brief can drive a concrete candidate implementation, verification can execute against that candidate, and the resulting code/evidence can return to a human-readable surface.

Human checkpoint:

> **Can a person trace one authored engineering decision all the way from intent → implementation change → executed verification → candidate product, without starting in source code and without confusing a generated brief with executed evidence?**

## Proving brief

Use a prepared implementation brief derived from the verified Saved Graph Layouts baseline. It is a proving case, not a claim about the user's final product preference.

Baseline revision:

`b61f210a2e8749ca18ce78b61a0411fa62eafecd`

Candidate decisions:

- `rememberMode`: `explicit-save` — dragging changes the working layout but does not persist until the person chooses **Save arrangement**.
- `saveReceipt`: `visible-after-save` — successful persistence produces an explicit receipt.
- `resetMode`: `confirm-before-reset` — Reset positions requires a confirmation step before deleting the saved layout.
- storage/authority constraints remain unchanged: browser-local, exact-revision-only, node-id-and-position-only, continue-without-persistence.

## Lifecycle path

```text
Feature Studio implementation brief
  ↓
validate exact baseline + supported decisions
  ↓
implementation candidate
  ↓
source diff / impacted files
  ↓
executable checks
  ↓
execution receipt
  ↓
candidate browser artifact
  ↓
human review
```

## Candidate product

**Review Workbench v1.4 — Explicit Save candidate** is separate from the v1.3 baseline.

Behavior:

1. Dragging a box changes only the current layout and marks it unsaved.
2. **Save arrangement** persists the current node positions.
3. Reload/reopen restores only the last explicitly saved arrangement.
4. **Reset positions** first asks for confirmation.
5. Confirming reset clears the saved layout and restores deterministic defaults.
6. Cancelling reset preserves the current/saved arrangement.
7. Storage failure remains honest and non-blocking.
8. Node/edge semantics and source authority remain unchanged.

## Implementation contract

The implementation workflow may write source code because this repository/branch is the authorized implementation target for this proving tranche. The browser Feature Studio remains handoff-only.

The candidate remains separately identifiable from the baseline by:

- brief ID / baseline revision;
- candidate artifact name;
- exact candidate source revision;
- changed files;
- test definitions;
- execution receipt.

## Evidence rules

- A Feature Studio brief is **intent**, not implementation evidence.
- Test definitions are **checks**, not execution evidence.
- CI success on the exact candidate revision is execution evidence for the checks it ran.
- A candidate artifact existing does not establish human usefulness or acceptance.

## Deliverables

1. `examples/implementation-brief-explicit-save-v0.json` — prepared revision-bound brief.
2. `review-workbench-v14/` — explicit-save candidate.
3. `test/review-workbench-v14.test.mjs` — candidate product behavior/authority tests.
4. `src/implementation-loop.mjs` — brief/candidate receipt validation helpers.
5. `test/implementation-loop.test.mjs` — lifecycle/receipt invariants.
6. `examples/implementation-receipt-explicit-save-v0.json` — exact executed candidate receipt.
7. `implementation-loop-v0/` + `scripts/build-implementation-loop-v0.mjs` — human-readable brief → implementation → evidence → review surface.
8. `test/implementation-loop-surface.test.mjs` — evidence-surface provenance/nonclaim tests.
9. CI builds/retains `review-workbench-v1.4` and `implementation-loop-v0`.

## Verified candidate evidence

The candidate was frozen and verified before the evidence surface was authored.

Exact candidate revision:

`4b1b4d46fc5bbde46a17ecabefde78c5018890fb`

GitHub Actions run `35059363567` completed successfully:

- `npm ci` — success
- `npm test` — success
- `npm run build:review-workbench:v1.4` — success
- candidate artifact upload — success

Retained exact candidate artifact:

- artifact id `10431538910`
- artifact name `review-workbench-v1.4`
- archive digest `sha256:d2049bdf6531d4389445e09d537383b1a1e41ab6641f5380653e088e41d79f1a`
- generated `index.html`: 462,148 bytes
- HTML SHA-256: `1c831834fffe11347449e76d0da8963ccb80e7c3a3089d7b899bf4408b8cae19`

The implementation receipt preserves this candidate identity even though later commits add evidence-surface code. The loop renderer intentionally does not substitute a later candidate rebuild for the retained receipt artifact.

## Verified Implementation Loop surface

Evidence-surface implementation revision:

`2591d0118a91ff567781c7a47655a335b5a74dde`

GitHub Actions run `35059802526` completed successfully:

- `npm ci` — success
- `npm test` — success
- v0 / v1 / v1.1 / v1.2 / v1.3 / v1.4 workbench builds — success
- Feature Studio v0 build — success
- `npm run build:implementation-loop:v0` — success
- all configured artifact uploads — success

Retained Implementation Loop artifact:

- artifact id `10432147037`
- artifact name `implementation-loop-v0`
- archive digest `sha256:befefc6e82c26db2abdd804b135d63a68ca954e45ce64137b23ed031a3fd92b7`
- generated `index.html`: 17,690 bytes
- HTML SHA-256: `bd8e64b6ff155e4d8574918e7a496bdfbdf989a71174155731289772137e1c3e`

The surface explicitly separates:

- **Intent** — authored brief, baseline, requested acceptance scenarios;
- **Implementation** — exact candidate revision and changed files;
- **Checks** — executable definitions;
- **Executed evidence** — successful CI run and exact candidate artifact identity;
- **Human review** — still pending.

## Final completion-record verification

Completion-record head before this final reproducibility note:

`b0647d0110f51fe7c5a3388806e64ac31af2e223`

GitHub Actions run `35059892266` completed successfully across the complete repository suite, all workbench builds, Feature Studio, Implementation Loop build, and all artifact uploads.

The current-head Implementation Loop artifact was retained as artifact `10431754051` with archive digest `sha256:04c8fbff1fcee34a4b98419114880d0e06cab7e21ca834825fc4eed639d2550b`.

Its generated HTML is byte-for-byte identical to the earlier verified loop surface:

- 17,690 bytes
- SHA-256 `bd8e64b6ff155e4d8574918e7a496bdfbdf989a71174155731289772137e1c3e`

## Non-goals

- No generic autonomous code generator yet.
- No arbitrary brief execution.
- No automatic merge.
- No change to the baseline v1.3 artifact.
- No cloud persistence or semantic graph editing.
- No claim that this one candidate proves every Feature Studio decision can be implemented automatically.

## Acceptance criteria

1. ✅ Prepared brief validates against `implementation-brief/v0` expectations and exact baseline revision.
2. ✅ Candidate behavior differs from v1.3 exactly where the brief requires: explicit save + confirmed reset.
3. ✅ Candidate source keeps browser-local/exact-revision/positions-only authority boundaries.
4. ✅ Candidate tests cover unsaved drag, explicit save/restoration semantics, confirm/cancel reset mechanics, and storage boundary behavior through the shared persistence contract.
5. ✅ Implementation receipt links brief, baseline, candidate revision, changed files, check definitions, CI execution, and artifact identity.
6. ✅ Implementation Loop surface clearly separates **Intent**, **Implementation**, **Checks**, **Executed evidence**, and **Human review**.
7. ✅ Candidate exact-head CI succeeded and both candidate + loop artifacts are retained from their relevant verified runs.

## Stop condition

**Reached.** Stop for human review. Do not add generic autonomous code generation, repository write-back from Feature Studio, or merge PR #23 until this closed-loop representation is reviewed.