# Implementation Runner v0 — Routed Brief Execution

**Planning path:** durable single-contributor  
**Status:** complete — human review checkpoint reached  
**Risk tier:** Tier 2 — supported brief execution into a candidate workspace  
**Target:** PR #23 / `feature/review-workbench-v0`

## Why this tranche exists

Implementation Loop v0 proved that a Feature Studio brief can be turned into a real candidate and verified, but the proving candidate was still authored by the repository workflow itself. The next gap is to make the implementation path repeatable from the brief rather than hand-building each candidate.

Human checkpoint:

> **Can a person author a supported feature brief, have the repository implementation workflow route it to a known implementation adapter, preview the exact change plan, build the candidate, and see whether the resulting artifact/evidence matches the authored intent — without starting in source code?**

## Roadmap from this checkpoint

### Checkpoint A — Implementation Runner v0 (this tranche)

Build one adapter-routed execution path for `implementation-brief/v0`:

```text
Feature Studio brief
  ↓
validate exact baseline + authority
  ↓
route to supported implementation adapter
  ↓
implementation-plan/v0
  ↓
dry-run preview
  ↓
apply into generated candidate workspace
  ↓
build candidate artifact
  ↓
run repository verification
  ↓
runner/evidence receipt
  ↓
human review
```

### Checkpoint B — multi-feature adapter coverage (next tranche; not part of this work)

Add at least one unrelated feature family and prove the runner is not a saved-layout-specific shell. The router should be able to abstain when no adapter exists.

### Checkpoint C — task-first engineering home (after adapter generality is proven)

A person begins from a job such as **Build**, **Fix**, **Understand**, **Review**, or **Release**. Representation Router chooses the appropriate working surface and underlying representation/implementation path.

## Scope for v0

1. Define `implementation-plan/v0` as a deterministic, inspectable execution contract.
2. Add an implementation-adapter registry separate from representation routing.
3. Implement one adapter for `featureId = saved-graph-layouts`.
4. Support the currently authored behavior choices:
   - `automatic-after-drag` or `explicit-save`;
   - `visible-after-save` or `quiet` receipt;
   - `immediate-reset` or `confirm-before-reset`.
5. Keep fixed authority constraints:
   - browser-local;
   - exact-revision-only;
   - node-id-and-position-only;
   - continue-without-persistence.
6. Produce a **dry-run** plan before applying/building anything.
7. Produce a generated candidate workspace/artifact from the same plan.
8. Emit a runner manifest containing:
   - brief identity;
   - adapter identity/version;
   - baseline revision;
   - supported decisions;
   - generated files;
   - planned checks;
   - authority boundaries.
9. CI must run tests, build the runner output, and retain the artifact.
10. Keep human acceptance separate from runner/build success.

## Architectural boundary

The runner is an **authorized repository implementation workflow**, not a browser permission expansion.

Feature Studio remains handoff-only. The runner may create generated candidate files in its build workspace because the repository/CI workflow owns that effect for this proving tranche.

The runner must not:

- merge a PR;
- update Company Planning authority;
- claim human acceptance;
- invent unsupported implementation behavior;
- silently widen storage/persistence authority;
- treat an unknown feature ID as implementable.

## Adapter contract

A supported adapter must answer:

- `adapterId`
- `version`
- supported `featureId`
- supported brief schema
- exact decision vocabulary it accepts
- fixed constraints it enforces
- `plan(brief)` → `implementation-plan/v0`
- `renderCandidate(plan)` / candidate-spec generation
- checks required for that plan

Unknown/unsupported briefs return an explicit `unsupported` result with reasons. The runner must abstain rather than guess.

## Candidate strategy

For v0, do not rewrite arbitrary repository source text. Generate a candidate workspace from a generic saved-layout runtime plus an adapter-produced `candidate-spec/v0`.

This keeps the proving case deterministic:

```text
implementation brief
  ↓
saved-layouts adapter
  ↓
candidate-spec/v0
  ↓
generic candidate runtime
  ↓
self-contained candidate artifact
```

The generic runtime interprets only the supported decision vocabulary. Adding another feature family later requires another adapter/runtime boundary rather than adding hidden feature-specific branches to the core runner.

## Dry-run requirement

The runner must expose a plan before build/apply. The plan must show, in task-first language:

- what behavior will change;
- what remains fixed;
- generated candidate files;
- checks that will execute;
- exact baseline revision;
- unsupported requests, if any.

Dry-run performs no candidate workspace write beyond optional plan output.

## Evidence rules

- A runner plan is not implementation evidence.
- A generated candidate is not execution evidence.
- Test definitions are not test results.
- CI success on the exact runner head is execution evidence only for the checks that ran.
- Human usefulness/acceptance remains a separate review state.

## Acceptance criteria

1. A valid saved-layout implementation brief routes to exactly one adapter.
2. Unsupported feature IDs and unsupported decisions abstain with explicit reasons.
3. The dry-run plan is deterministic for the same brief/baseline.
4. Dry-run performs no candidate generation side effect.
5. Apply/build generates `candidate-spec/v0` and a self-contained candidate artifact from the same plan.
6. Generated candidate behavior follows the brief for save/reset/receipt choices.
7. Fixed authority boundaries remain enforced regardless of brief input.
8. Runner tests distinguish planning, generation, executed checks, and human acceptance.
9. CI builds and retains the runner artifact on the exact head.
10. A human-readable Runner surface shows **Brief → Adapter → Plan → Candidate → Checks → Human review** without requiring source-code reconstruction.

## Non-goals

- No LLM-driven arbitrary patch generation.
- No generic code synthesis for unknown features.
- No second feature family in this tranche.
- No automatic PR merge.
- No browser Git write access.
- No cloud persistence or semantic graph editing.

## Checkpoint result

Implementation Runner v0 is implemented.

### What changed from the prior checkpoint

Compared with Implementation Loop head `9555873407f0945c64ab73cf831c9cf549de88e7`, the runner tranche added the adapter/runner/generation path, tests, build script, candidate runtime, CI retention, and execution receipt. The pre-receipt implementation head was `06de6e5dab7d250c0be0d9596ffc28ddbe0fe514`.

The runner now:

- validates `implementation-brief/v0` before execution;
- routes supported briefs to a registered implementation adapter;
- explicitly abstains for unknown feature IDs, stale baselines, unsupported decisions, or authority expansion;
- generates deterministic `implementation-plan/v0` and `candidate-spec/v0` records;
- exposes `--dry-run` with no candidate-generation side effects;
- builds a generated saved-layout candidate from `candidate-spec/v0` rather than a separately hand-authored candidate source tree;
- interprets automatic/explicit save, visible/quiet receipt, and immediate/confirmed reset from typed decisions;
- retains browser-local / exact-revision / positions-only authority constraints;
- validates `implementation-runner-receipt/v0` before the review surface can claim execution evidence.

### Exact first execution evidence

Exact runner implementation head:

`06de6e5dab7d250c0be0d9596ffc28ddbe0fe514`

GitHub Actions run `35064559417` completed successfully:

- `npm ci` — success;
- `npm test` — success;
- existing workbench / Feature Studio / Implementation Loop builds — success;
- `npm run build:implementation-runner:v0 -- examples/implementation-brief-explicit-save-v0.json` — success;
- all configured artifact uploads — success.

Retained pre-receipt runner artifact:

- artifact id `10433762812`;
- artifact digest `sha256:98d058d2d927b8825a5187b8597b91d3bfe7550e477365ec25f372ffdb8c2f94`;
- runner surface `index.html`: 9,175 bytes, SHA-256 `905df444bf295580f5de7a16b52229cf5e82ebf2b2ed169e12895d180fb2de2e`;
- generated candidate `candidate/index.html`: 443,739 bytes, SHA-256 `83be4b0d70c3ca1a4cd812ec96d34ce18c3de072cce6939933b0c976f4f4edd5`;
- candidate has no external `<script src>` dependency;
- the pre-receipt surface correctly displayed execution evidence as pending.

### Receipt-enabled evidence surface

`examples/implementation-runner-receipt-v0.json` pins that exact run/head/artifact. The receipt head `d00f26cc1558520382c8c37ce5f5eef47eea760e` passed GitHub Actions run `35064668809` successfully, including the runner build and all artifact uploads.

Retained receipt-enabled runner artifact:

- artifact id `10433314413`;
- artifact digest `sha256:1d803f070a10e29cb071bf4dd6b553535b5c2ccc8409d0ecd21dfdfa44b29877`;
- runner surface `index.html`: 9,640 bytes, SHA-256 `7de0f79727da7ce880f2891ef445c3951c26971cab8df2c320ce0c57b307bca9`;
- generated candidate remains 443,739 bytes, SHA-256 `83be4b0d70c3ca1a4cd812ec96d34ce18c3de072cce6939933b0c976f4f4edd5`;
- candidate bytes are identical before/after attaching execution evidence;
- the outer surface now displays the exact executed receipt and no longer claims execution is pending.

### Human checkpoint

Human review remains pending. The question is:

> **Does this make the implementation step feel like a trustworthy, inspectable continuation of Feature Studio — where you can see the selected adapter, preview the exact plan, open the generated candidate, and understand what actually executed — without needing to start from code?**

## Stop condition

Reached. Do not begin Checkpoint B (multi-feature adapter coverage) or Checkpoint C (task-first engineering home) until this Implementation Runner checkpoint is reviewed.