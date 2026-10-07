# Multi-Feature Adapter Coverage v0

**Planning path:** durable single-contributor  
**Status:** complete — technical stop condition reached; human acceptance pending  
**Risk tier:** Tier 2 — generalized brief contract + second implementation adapter/runtime  
**Target:** PR #23 / `feature/review-workbench-v0`

## Why this tranche exists

Implementation Runner v0 proved one implementation brief could be routed through a known adapter, dry-run as a deterministic plan, built into a candidate, verified, receipted, and returned for human review.

It did **not** yet prove the runner is genuinely feature-general. The original `implementation-brief/v0` shape contains Saved Graph Layouts-specific decisions (`rememberMode`, `saveReceipt`, `resetMode`, etc.), so simply adding another adapter against that shape would create false generality.

Human checkpoint:

> **Can the same runner core accept two genuinely different feature families, route each to a separate adapter/runtime, expose feature-specific decisions without changing the core contract, and explicitly abstain from a third unsupported feature?**

The user explicitly authorized continuing to the next planned checkpoint without immediate artifact review. Human acceptance for this checkpoint therefore remains pending even though the technical stop condition is complete.

## Roadmap

### Checkpoint B — Multi-Feature Adapter Coverage v0 — complete

1. Introduce `implementation-brief/v1` as a generic, typed engineering-intent contract.
2. Keep `implementation-brief/v0` valid and normalize it internally for backward compatibility.
3. Keep Saved Graph Layouts on its existing adapter/runtime path.
4. Add a second unrelated feature family: **Evidence Gap Focus**.
5. Route/build both feature families through the same implementation-runner core.
6. Preserve explicit abstention for unknown features and unsupported decisions.
7. Build and retain both candidate families in CI.

### Checkpoint C — Task-first engineering home — next

A person begins from a job such as **Build**, **Fix**, **Understand**, **Review**, or **Release**. RR chooses the working surface, representations, and implementation path beneath that task.

## Generic `implementation-brief/v1`

Required fields:

- `schemaVersion: "implementation-brief/v1"`
- `featureId`
- `baselineRevision`
- `outcome`
- `successCriterion`
- `decisions[]` with stable IDs and typed values
- `constraints[]` with stable IDs and typed values
- `acceptanceScenarios[]`
- optional `implementationImpact[]`
- `verification.status = "planned-not-executed"`
- `authority.effect = "handoff-only"`
- repository/planning/product writes all `false`

The core brief validator owns only generic structure, identity, verification, and authority invariants. Feature-specific decision vocabularies belong to adapters.

## Backward compatibility

`implementation-brief/v0` remains valid.

`src/implementation-brief.mjs` normalizes the existing Saved Graph Layouts v0 object into the canonical internal brief form without rewriting the recorded v0 artifact or historical receipt chain.

The Saved Graph Layouts adapter remains publicly versioned `0.1`; its supported product/authority contract did not change during the internal normalization migration.

## Second feature family — Evidence Gap Focus

### Human outcome

> **When reviewing a software change, let me focus quickly on requirements or claims that still lack strong executed evidence, without changing the underlying requirements, evidence records, or approval state.**

This feature is deliberately unrelated to graph layout/persistence.

### Feature ID

`evidence-gap-focus`

### v1 decisions

- `default-focus`
  - `all-items`
  - `gaps-first`
- `grouping`
  - `by-requirement`
  - `flat-list`
- `covered-items`
  - `show`
  - `collapse`

### Fixed constraints

- source/evidence records remain read-only;
- exact subject revision remains visible;
- filtering/grouping changes presentation only;
- no requirement state mutation;
- no evidence state mutation;
- no approval/review state mutation;
- missing/ambiguous evidence remains explicit.

### Candidate runtime

`implementation-runner-evidence-gap-v0/` is a separate review runtime. It consumes the adapter-generated candidate spec and real `review-workbench/pr22.model.json` data.

The candidate can:

- switch between **Needs evidence** and **All requirements**;
- group by requirement or use a flat list;
- compact/expand already-supported items;
- inspect why an item is classified as executed-evidence-backed, needing executed evidence, or still needing human review;
- reopen exact source/evidence details;
- never edit requirement/evidence/approval truth.

`src/evidence-gap-focus.mjs` keeps that classification logic testable outside the UI.

## Runner architecture

```text
implementation brief v0/v1
        ↓
normalize generic brief
        ↓
route by feature + adapter support
        ↓
implementation-plan/v0
        ↓
dry-run
        ↓
adapter candidate spec
        ↓
selected candidate runtime
        ↓
self-contained candidate artifact
        ↓
CI execution receipt
        ↓
human review
```

The runner core contains no product behavior branch for either feature. Adapters declare runtime metadata; the shared build entrypoint builds whichever runtime the selected adapter names.

## Exact two-feature proving run

Exact implementation head:

`a2217ac6e613f3f62b375b0221c8cf6aa1d1ca73`

GitHub Actions run `35070699521` completed successfully:

- `npm ci` — success
- `npm test` — success
- existing Review Workbench / Feature Studio / Implementation Loop builds — success
- Saved Graph Layouts runner build — success
- Evidence Gap Focus runner build — success
- all configured artifact uploads — success

### Saved Graph Layouts pre-receipt artifact

- artifact id `10435509857`
- artifact digest `sha256:06689dcd622ddcb0519f26f2400a70b313a15ab69c2c03734b55f87567649faa`
- root surface: 9,593 bytes, SHA-256 `66fcd15f9f850a6df40569f61751bf8de39674e42f53f35832ce6bd39b3f33c0`
- generated candidate: 443,827 bytes, SHA-256 `14932f5e8cf5048b3e2d399212a8c7b07ce7998b9ad36c649dfbcac13fcfd95c`

A fresh Saved Graph Layouts receipt was created for this normalized build because candidate bytes changed from the earlier runner checkpoint; historical receipts were not reused as evidence for new bytes.

### Evidence Gap Focus pre-receipt artifact

- artifact id `10435798573`
- artifact digest `sha256:108bec58df109ee3469a994adbb902cd35408658a40c8e0a4876a2997a9baf5a`
- root surface: 9,205 bytes, SHA-256 `aaef3645a3f9ab8888f60dd025144a6ca17fd105287658f5f8f5a131018568d7`
- generated candidate: 248,503 bytes, SHA-256 `06f6e6f9d2801c96d28048af6ca179e90d1949a888974d0790c792c165b29d43`

The pre-receipt Evidence Gap surface correctly showed **Execution evidence pending**.

## Fresh receipts

Current receipt records:

- `examples/implementation-runner-saved-layouts-receipt-v1.json`
- `examples/implementation-runner-evidence-gap-receipt-v0.json`

Both pin the exact two-feature implementation head/run/artifact above and keep `humanReview.status = pending`.

Receipt-crosscheck tests prove neither receipt can validate against the other feature's plan/runtime.

## Exact receipt-enabled proving run

Exact receipt-enabled head:

`f6a38b338910fcfa5d73156b2e01bc8d426f8956`

GitHub Actions run `35070981063` completed successfully:

- `npm ci` — success
- `npm test` — success
- both runner feature builds — success with their exact receipts attached
- all configured artifact uploads — success

### Final Saved Graph Layouts artifact

- artifact id `10436441270`
- artifact digest `sha256:f25daf08720a1586b94695d06cccd6d3f749fcc54b7f52c89eec7200a2af722c`
- root surface: 9,711 bytes, SHA-256 `5395cd28f14d8333fbd53d7a9be24e378e2b903d476d597a77e98597759cebc0`
- candidate remains 443,827 bytes, SHA-256 `14932f5e8cf5048b3e2d399212a8c7b07ce7998b9ad36c649dfbcac13fcfd95c`

### Final Evidence Gap Focus artifact

- artifact id `10436222596`
- artifact digest `sha256:a1d0fea40a4b85006480c0a8c971eda0e50c28c130a466743af98f53fdd258b6`
- root surface: 9,773 bytes, SHA-256 `a20b6924aa4b3b88ee34687b968948f701b9acf0c011e966b66906f57f8da61b`
- candidate remains 248,503 bytes, SHA-256 `06f6e6f9d2801c96d28048af6ca179e90d1949a888974d0790c792c165b29d43`

For both features, attaching receipts changed only the outer evidence surface; each generated candidate remained byte-for-byte identical to its pre-receipt build.

## Acceptance criteria result

1. Generic v1 brief validation is feature-agnostic — **met**.
2. Existing v0 Saved Graph Layouts brief still routes/builds — **met**.
3. Evidence Gap Focus v1 brief routes to a different adapter — **met**.
4. Plans name different adapters and different runtimes — **met**.
5. Both candidates build through the same runner core/build entrypoint — **met**.
6. Evidence Gap Focus uses real requirement/evidence data and a non-graph review UI — **met**.
7. Unsupported feature IDs abstain explicitly — **met**.
8. Feature-specific invalid decisions are rejected by adapters — **met**.
9. Authority constraints are visible and test-backed for both — **met**.
10. CI tests/builds/retains separate artifacts — **met**.
11. Human review remains pending after green CI — **met**.

## Non-goals preserved

- No third feature adapter was added.
- No arbitrary LLM code synthesis.
- No automatic merge.
- No browser repository writes.
- No Company Planning workflow authority changes.

## Stop condition

**Reached.** Exact CI-tested, receipted runner artifacts now exist for both Saved Graph Layouts and Evidence Gap Focus. Generic v1 normalization, separate adapters/runtimes, explicit unknown-feature abstention, and cross-feature receipt isolation are all test-backed.

Human acceptance remains pending. The user explicitly authorized proceeding to the planned Task-First Engineering Home checkpoint without waiting for immediate artifact review.