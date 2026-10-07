# Generic Build + Fix Authoring v0

**Planning path:** durable single-contributor  
**Status:** complete — technical stop condition reached; human acceptance pending  
**Risk tier:** Tier 2 — generic authoring contracts + supported diagnostic-to-implementation path  
**Target:** PR #23 / `feature/review-workbench-v0`

## Outcome

Build and Fix now converge on the same engineering handoff and implementation path:

```text
Build intent ───────────────┐
                            ↓
                   implementation-brief/v1
                            ↓
                   Implementation Runner
                            ↓
                 candidate + CI evidence
                            ↓
                      human review
                            ↑
problem-intent/v0 → diagnosis/v0
        Fix intent ─────────┘
```

Human checkpoint:

> **Can a person either define a supported feature or describe a supported problem, understand the engineering decisions/consequences, and produce the exact implementation brief that the existing runner can execute — without starting in source code?**

Human acceptance remains pending. The user explicitly authorized continued implementation without immediate artifact review.

## Generic Build authoring

Implementation adapters now optionally own plain-language authoring metadata:

- title/summary;
- default outcome and success criterion;
- decision definitions and options;
- fixed constraints;
- default acceptance scenarios.

`src/implementation-authoring.mjs` is feature-generic and uses this metadata to:

- list authorable feature families;
- create local authoring drafts;
- validate decisions against adapter options;
- edit decisions;
- produce `implementation-brief/v1`;
- revalidate the exported brief through the selected implementation adapter.

Current authorable feature families:

1. Saved Graph Layouts
2. Evidence Gap Focus

The generic authoring core contains no feature-specific `if` branches.

## Engineering Studio v1

`engineering-studio-v1/` provides one task-first browser workspace with:

- **Build something**
- **Fix something**
- **Review handoff**

### Build

A person can:

1. choose either supported feature family;
2. edit outcome/success criterion;
3. make adapter-declared behavior decisions;
4. inspect fixed constraints and technical adapter/runtime details;
5. edit/add/remove Given/When/Then acceptance scenarios;
6. review/download a deterministic `implementation-brief/v1`.

The browser does not write Git/product/planning state and does not claim planned checks executed.

## Fix contract and routing

`src/problem-intent.mjs` defines revision-bound `problem-intent/v0` with:

- stable problem ID;
- exact baseline revision;
- summary;
- observed behavior;
- expected behavior;
- reproduction steps;
- evidence references;
- affected capability;
- typed problem signals;
- handoff-only authority.

`src/diagnostic-router.mjs` routes to registered diagnostic adapters and returns:

- `diagnosed`
- `unsupported`
- `ambiguous`

Unknown problem families abstain rather than generating guessed fixes.

## Proving Fix case

Problem fixture:

`examples/problem-intent-saved-layout-reset-v0.json`

Problem:

> Reset positions deletes my saved arrangement immediately; I expected confirmation before destructive reset.

Diagnostic adapter:

`saved-layout-reset-safety/v0`

The diagnosis changes only:

```text
reset-mode: immediate-reset → confirm-before-reset
```

while preserving the reported save behavior/feedback and all browser-local/exact-revision/positions-only constraints.

The diagnostic output is a normal `implementation-brief/v1`, which then routes through the existing `saved-graph-layouts/v0` implementation adapter/runtime.

## Exact initial Fix proving run

Exact implementation head:

`c293a107130c6084686c8d9124741adb219f477b`

GitHub Actions run `35072674436` completed successfully:

- `npm ci` — success
- `npm test` — success
- Engineering Studio v1 build — success
- diagnostic routing / Fix proving build — success
- nested Implementation Runner candidate build — success
- Engineering Home build — success
- all configured artifact uploads — success

### Engineering Studio artifact

- artifact id `10437041893`
- artifact digest `sha256:f9177cfa2452b14658899962e5acf8c4c49b3379fcf27de28d50c2974869838c`
- `index.html`: 275,578 bytes
- SHA-256 `79bd137a21845ed39758d2797310674a471a52954ca54cd0032f3a738156acad`

### Pre-receipt Fix artifact

- artifact id `10436444283`
- artifact digest `sha256:1f7d0750590e6f89b421a1dcdb44a7a15961840345417e61b1cac03b48791421`
- Fix root: 6,827 bytes, SHA-256 `25007ff8c43d3232f0fdc167e164193148d8fc3a0bc09476e28f3e52f46647a6`
- runner root: 9,117 bytes, SHA-256 `7720302892727cdd43a9e431163b9764a1647062a2d817095741de957cd92307`
- generated candidate: 443,016 bytes, SHA-256 `bb69cd47ddc70a94cdfc9c0f1918cceccf056480cb78ffc2cb137d44852c5e33`

Both surfaces correctly showed execution evidence pending.

## Fix execution receipt

`examples/fix-proving-runner-receipt-v0.json` pins the exact head/run/artifact/candidate above.

`test/fix-proving-receipt.test.mjs` validates that receipt against the diagnosis-derived implementation plan.

## Exact receipt-enabled and integrated run

Exact integrated head:

`d5820c7f358845dba8bcbedf0346cb860044ef84`

GitHub Actions run `35073221466` completed successfully:

- full repository test suite — success
- all Review Workbench builds — success
- Feature Studio v0 — success
- Engineering Studio v1 — success
- both implementation runner feature builds — success
- receipted Fix proving build — success
- updated Engineering Home bundle — success
- all configured artifact uploads — success

### Current Engineering Studio artifact

- artifact id `10436573011`
- artifact digest `sha256:984f740a79751fc07675c53e919cdd6f78827fb9e1561cc73b82729f4a449c59`
- `index.html`: 275,578 bytes
- SHA-256 `79bd137a21845ed39758d2797310674a471a52954ca54cd0032f3a738156acad`

### Current Fix proving artifact

- artifact id `10436214636`
- artifact digest `sha256:bf847f6c8c83521ffd141b099f8e4a213b32e3097cac3705dada5eacda6301cc`
- Fix root: 7,115 bytes, SHA-256 `b1296121a85b55fa8cedb6e88706ae24499e2946b511ac0b3745b659acaa5f4b`
- runner root: 9,641 bytes, SHA-256 `3e0264b9471b89625df51d0674326529217692b606bbba6488ad7c2d655c1007`
- generated candidate remains 443,016 bytes, SHA-256 `bb69cd47ddc70a94cdfc9c0f1918cceccf056480cb78ffc2cb137d44852c5e33`

Attaching the execution receipt changed only the evidence surfaces. The fix candidate remained byte-for-byte identical.

### Refreshed Engineering Home artifact

- artifact id `10436304111`
- artifact digest `sha256:3ad418562b6cf1bb59eed604628b97daad8c612a1ede85689c1bce804da64769`
- root `index.html`: 18,636 bytes, SHA-256 `fa0d0d860f773098dbf3efbc143ad8cfcbc30ae77fd980929404030a6a4c2717`
- bundle manifest: 1,834 bytes, SHA-256 `9c1ebc178c1b6fc6a5ad3ade32477f39ce266d1c35b0b1c2425671500744c5f0`

Engineering Home now bundles exact current entrypoints for:

- Understand — Review Workbench v1.2
- Review — Evidence Gap Focus
- Build/Fix — Engineering Studio v1
- Implementation — Saved Graph Layouts runner
- Fix proof — receipted Fix proving loop

## Acceptance criteria result

1. Both feature adapters expose authoring metadata — **met**.
2. Generic core builds v1 briefs without feature branches — **met**.
3. Studio authors/exports both feature families — **met**.
4. Studio remains task-first/progressive — **met**.
5. `problem-intent/v0` is generic/revision-bound — **met**.
6. Diagnostic router supports/abstains/ambiguity contract — **met**.
7. Reset-safety problem produces one diagnosis/v1 brief — **met**.
8. Derived fix brief routes through existing implementation adapter — **met**.
9. Unknown problem abstains — **met**.
10. CI retains Engineering Studio — **met**.
11. CI proves diagnosis → runner → candidate — **met**.
12. Planned checks remain separate from execution evidence — **met**.
13. Human acceptance remains pending — **met**.

## Authority boundary

Engineering Studio and diagnostic surfaces remain local/handoff-only. They do not:

- write Git;
- mutate requirements/evidence;
- approve a review;
- release/deploy;
- claim unsupported diagnoses;
- equate acceptance scenarios with executed tests.

Repository/CI Implementation Runner remains the authorized candidate-generation workflow for supported adapters.

## Roadmap

### Release + Operate Loop v0 — next

Add revision-bound release intent, environment/authority contracts, deployment evidence receipts, runtime observation evidence, and rollback semantics without giving RR deployment authority by default.

## Stop condition

**Reached.** Exact CI-tested artifacts exist for Engineering Studio v1 and a supported Fix problem routed through diagnosis into the existing implementation runner/evidence path.

Human acceptance remains pending. Per explicit user instruction, work may proceed to Release + Operate.