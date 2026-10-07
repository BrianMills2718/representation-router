# Build a Feature v0 — Saved Graph Layouts

**Planning path:** durable single-contributor  
**Status:** implemented and CI-verified; awaiting human review  
**Risk tier:** Tier 2 — user-specific presentation persistence  
**Target:** PR #23 / `feature/review-workbench-v0`

## Outcome

Prove the next Representation Router capability: a person can start with a plain-language product need and follow it through behavior, design, implementation, tests, release evidence, and product use in one coordinated working surface.

Feature outcome:

> **When I rearrange a system diagram so it makes sense to me, remember that arrangement on this browser when I come back — without changing the actual system architecture.**

Human checkpoint: **Can a person understand the feature, use it, and trace how it was designed/built/tested without starting from source code or internal persistence terminology?**

## Why this feature

Saved graph layouts are the first end-to-end build vertical because they require a real decision across product behavior, architecture boundary, data contract, frontend persistence, revision handling, tests, release, and review.

```text
system / semantic truth       user presentation state
          |                            |
          | no mutation                | node positions only
          v                            v
     architecture model        browser-saved layout
```

A saved layout never becomes semantic authority.

## Implemented user behavior

1. Open **System map** or **What happens next**.
2. Drag a box.
3. The arrangement saves automatically in this browser.
4. Reload/reopen the same workbench revision and the saved arrangement is restored.
5. **Reset positions** deletes the saved arrangement for that diagram and restores deterministic model-derived positions.
6. A different reviewed software revision gets a different storage key and does not silently inherit the old arrangement.
7. Known saved nodes may restore while new/unsaved nodes keep defaults and unknown saved node IDs are ignored.
8. If browser storage is unavailable, the graph still works and exposes an honest `Positions won't be remembered in this browser` state.

## Persistence contract

Saved record fields are deliberately narrow:

```text
schemaVersion
workbenchId
subjectRevision
lens
savedAt
positions[]
  - id
  - x
  - y
```

The record contains no semantic labels, relationships, requirements, evidence, permissions, or workflow state.

### Scope and authority

- owner: local browser profile
- effect: presentation-only / surface-local
- storage: browser `localStorage`
- server/backend: none
- cross-device sync: none
- source-of-truth write-back: forbidden
- revision binding: exact `subjectRevision`
- stale revision behavior: ignore and use deterministic defaults

## Full-stack engineering path in v1.3

The first screen is **Build this feature** and follows the actual implementation:

1. **Outcome** — human problem and observable success criterion.
2. **Behavior** — save / restore / reset / revision-change behavior.
3. **Design** — presentation-state boundary and positions-only record.
4. **Build** — exact implementation artifacts.
5. **Test** — executable persistence/safety checks.
6. **Release** — exact CI-built self-contained artifact.
7. **Use** — exercise the real behavior in System map or lifecycle map.

## Implemented slices

### Slice 1 — persistence core

`src/layout-persistence.mjs` now provides:

- revision/lens/workbench-scoped storage keys;
- positions-only record serialization;
- saved-record parsing/validation;
- explicit stale-revision rejection;
- safe merging of known positions into cloned default graph nodes;
- save/load/remove through a supplied storage adapter;
- an exported persistence contract stating presentation-only effect and exact-revision binding.

### Slice 2 — v1.3 workbench

`review-workbench-v13/` now:

- restores Component/System map and State/Lifecycle positions at startup;
- autosaves when a drag finishes;
- shows `Arrangement saved in this browser` / `Saved arrangement restored` receipts;
- clears stored state through **Reset positions**;
- degrades honestly when local storage cannot be used;
- exposes `How saving works` with exact revision/presentation-state boundaries;
- adds the feature engineering path as the default screen.

### Slice 3 — evidence and CI

`test/layout-persistence.test.mjs` covers:

- exact workbench/revision/lens key scoping;
- positions-only persistence records;
- save + reload restoration without semantic alias mutation;
- stale revision rejection;
- new/default and unknown-node behavior;
- reset/removal behavior;
- storage failure fallback.

`test/review-workbench-v13.test.mjs` protects the product contract, including real persistence-core usage, plain-language persistence receipts, no semantic graph editing, visible feature lifecycle, technical detail access, and the self-contained build path.

## Verification evidence

CI run `35053171445` on exact feature head `8b4e99ba743f8a7b54d7b87e0fad521492eb2f7e` completed successfully:

- `npm ci` — success
- `npm test` — success
- v0 / v1 / v1.1 / v1.2 builds — success
- `npm run build:review-workbench:v1.3` — success
- all workbench artifact uploads — success

Retained v1.3 artifact from that run:

- artifact id: `10428889097`
- archive digest: `sha256:35cb780de8cf8921ef95f74f341368747db7784cc008a089d7b38e5c6f1d62a0`
- generated `index.html`: 480,029 bytes
- generated HTML SHA-256: `c0f3a140a24cf6d231ee97bd6cbe7b79497237584b50a10ac2a2c10ed148cf10`
- no external `<script src>` dependency

Static artifact inspection confirms the generated file contains the **Build this feature** path, saved/restored browser receipts, reset control, exact-revision language, and browser storage implementation.

## What this evidence does not prove

- CI/unit tests do not prove the user's browser permits local storage.
- CI does not prove the interaction is understandable or that reload persistence feels useful in the user's actual review environment.
- Browser-local persistence is not cloud/account persistence.
- A green repository suite is not human acceptance of the feature or of the guided full-stack workflow.

## Non-goals

- No backend persistence.
- No accounts/cloud sync.
- No layout collaboration.
- No semantic graph editing.
- No edge/node creation or deletion.
- No saved selection/filter state yet.
- No automatic migration across source revisions.
- No new diagram family.
- No authoritative repository/planning/product write-back.

## Acceptance status

1. Drag persistence implemented — **source + unit contract complete**.
2. Same-revision restore implemented — **source + unit contract complete**.
3. Reset clears saved state — **source + unit contract complete**.
4. Workbench + revision + lens scoped key — **verified by unit test**.
5. Stale revision rejected — **verified by unit test**.
6. Positions-only record — **verified by unit test**.
7. Unknown/new node handling — **verified by unit test**.
8. Storage failure fallback — **verified by unit test and UI copy contract**.
9. Outcome → Behavior → Design → Build → Test → Release → Use path — **implemented and artifact-inspected**.
10. CI build/retention — **verified**.
11. Actual user-browser reload behavior and comprehension — **pending human review**.

## Stop condition

Reached for implementation/CI. Stop here for human review of the exact v1.3 artifact. Do not add cloud sync, semantic editing, or another feature until the end-to-end build path and real browser persistence behavior are reviewed.