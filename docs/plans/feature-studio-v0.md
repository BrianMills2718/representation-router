# Feature Studio v0 — Guided Authoring

**Planning path:** durable single-contributor  
**Status:** implemented and CI-verified; awaiting human review  
**Risk tier:** Tier 2 — local engineering-intent authoring  
**Target:** PR #23 / `feature/review-workbench-v0`

## Outcome

Prove the next step toward end-to-end software engineering through Representation Router: a person can author a real feature definition through task-first representations, see the technical consequences, and produce a precise implementation brief without needing to begin in source code.

Human checkpoint:

> **Can a person change the feature outcome/behavior/design/tests, understand what those decisions affect, and produce a trustworthy implementation brief without the surface pretending it has repository write authority?**

## Baseline feature

Use the verified v1.3 **Saved Graph Layouts** feature as the initial editable subject.

Baseline implementation revision: `5e2845c823a8bdf951ee293a940d666549d4009b`.

The authoring surface edits engineering intent above that baseline. It does not rewrite the baseline source itself.

## Implemented authoring path

```text
Outcome
  ↓
Behavior
  ↓
Design decisions
  ↓
Acceptance tests
  ↓
Implementation impact
  ↓
Review changes
  ↓
Implementation brief
  ↓
authorized implementation workflow (outside this static artifact)
```

Feature Studio v0 now lets a person:

1. edit the plain-language outcome and observable success criterion;
2. choose meaningful product behavior (automatic vs explicit save, visible vs quiet receipt, immediate vs confirmed reset);
3. inspect fixed architecture constraints in task language;
4. add/edit/remove `Given / When / Then` acceptance scenarios;
5. see decision-derived implementation impact and concrete source/test areas;
6. review changes against the verified v1.3 baseline;
7. save the draft locally in the browser;
8. preview/download a deterministic JSON implementation brief; and
9. see continuously that the draft is not the implementation and carries no repository/planning/product write authority.

## Draft + handoff contract

`src/feature-draft.mjs` defines:

- `feature-draft/v0` normalization/validation;
- the exact Saved Layouts baseline draft;
- meaningful decision vocabularies;
- decision-derived implementation impact;
- `implementation-brief/v0` generation;
- browser/local storage scoping by feature + exact baseline revision;
- local draft save/load/clear helpers.

The generated implementation brief includes:

- exact baseline revision;
- outcome + success criterion;
- typed decisions;
- acceptance scenarios;
- derived implementation impact;
- `verification.status = planned-not-executed`;
- an explicit statement that the presence of checks is **not evidence that they ran or passed**; and
- `handoff-only` authority with repository/planning/product writes all false.

## Architecture / authority boundary

Feature Studio v0 is **authoring and handoff**, not authoritative source mutation.

It may edit local draft intent, persist the local draft, derive implementation impact, preview a deterministic implementation brief, and download/export the brief.

It may not commit or push code, edit GitHub PR state, update Company Planning authority, claim tests ran, claim implementation exists merely because a brief exists, or change semantic graph relationships.

Unsupported authority-expanding values such as cloud-account storage or saving the semantic graph are rejected by the draft contract rather than exposed as valid choices.

## Verification

`test/feature-draft.test.mjs` covers schema-valid baseline authoring state, exact-baseline draft persistence scoping, rejection of authority-expanding values, decision-dependent implementation impact, implementation-brief semantics, the planned-vs-executed evidence boundary, local draft clear, and storage failure fallback.

`test/feature-studio-v0.test.mjs` protects the complete authoring path, task-first behavior decisions, editable Given/When/Then scenarios, derived impact, planned evidence language, local draft persistence + JSON export, absence of network write APIs, and responsive single-file configuration.

## Test-only repair history

The initial Feature Studio CI attempt failed before build because of a syntax typo in the new unit-test file plus a brittle source assertion requiring the internal enum `browser-local` in UI source. The product contract was not weakened: the syntax was fixed, and the UI test now protects the intended task-first phrase **This browser only** while the internal enum remains verified in the draft-contract tests.

## Final review evidence

Exact review head:

`11c30613fd40a3b26063609d3ed36db0755b4870`

GitHub Actions run `35057580741` completed successfully on that exact head:

- `npm ci` — success
- `npm test` — success
- all v0/v1/v1.1/v1.2/v1.3 workbench builds — success
- `npm run build:feature-studio:v0` — success
- all artifact uploads — success

Exact Feature Studio artifact from that run:

- artifact id `10430359383`
- archive digest `sha256:9fe0173f742aeafd14bf40a0e6afc9c7218d6dcd8e72eaf5968c7ef9eba1b34b`
- generated `index.html`: 254,545 bytes
- HTML SHA-256: `14bebd3877fa518ef461f95c65b8f0e88088f23157b775859c4526a3aa24a4f6`
- no external `<script src>` dependency

This HTML is byte-for-byte identical to the earlier green Feature Studio implementation artifacts.

## Non-goals retained

- No GitHub write-back from the browser artifact.
- No automatic code generation inside the artifact.
- No cloud draft sync.
- No multi-user collaboration.
- No free-form architecture mutation.
- No unsupported storage/backend options.
- No claiming generated implementation-impact data is execution evidence.

## Acceptance status

All implementation acceptance criteria are met and exact-head CI-verified. The remaining criterion is the human checkpoint itself: whether this authoring/handoff model makes a person feel able to make real full-stack engineering decisions without beginning in source code.

## Stop condition

Reached. Stop at human review of the exact Feature Studio v0 artifact. Do not add repository write-back or automatic code generation until the authoring/handoff model is reviewed.