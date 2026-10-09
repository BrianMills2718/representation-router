# Bounded Company Planning review integration

**Status:** retained integration/case-study guide. This is not the current Representation Router roadmap and does not make Representation Router the Company Planning authority.

This adapter demonstrates how planning, architecture, assurance, implementation evidence, and a human review checkpoint can be coordinated without copying their authority into the renderer.

Reusable planning/review guidance lives in [`../references/planning-review.md`](../references/planning-review.md). Dated experiment details, exact historical receipts, and the authenticated-route investigation now live in [`evidence/company-review-integration-history.md`](evidence/company-review-integration-history.md).

## What this integration proves

The bounded review asks a concrete question over immutable source revisions:

> **Should this implemented company work-graph projection contract be accepted, given its source and execution evidence?**

The authentic historical subject is weekly-plans item `W26-G1`. The adapter is intentionally narrow: another work item needs its own explicit architecture/evidence binding rather than an invented association with this contract.

The integration demonstrates the durable ownership model:

```text
Company Planning / weekly plan truth
        +
implemented contract / architecture source
        +
fresh executed evidence
        ↓
validated projections
        ↓
Work | Architecture | Assurance | Review
        ↓
local revision-bound human disposition
```

Representation Router selects/composes the representation. Company Planning and the source repositories continue to own planning semantics, workflow state, and authoritative effects.

## What each view means

| View | Meaning |
| --- | --- |
| **Work** | Work units and real prerequisite/dependent relationships from the pinned plan graph. |
| **Architecture** | The implemented contract/schema structure. Containment/definition edges are not silently reinterpreted as runtime flow or dependency order. |
| **Assurance** | Acceptance criteria and fresh executed evidence, with partial/missing coverage kept explicit. Passing tests do not establish full requirement satisfaction. |
| **Review** | The reviewed subject, exact source/evidence links, limitations/non-claims, and local review disposition. |

A reviewer should be able to start from the work item, inspect the relevant implemented contract, follow its evidence, and decide without first reconstructing the relationship manually from disconnected files.

## Source and evidence boundary

The build uses full immutable Git revisions. Local uncommitted changes are not part of the reviewed subject.

Keep these distinct:

- **plan state** — what the owning planning source records;
- **implementation source** — what code/schema/config exists at the pinned revision;
- **check definition** — what a test or validator is configured to check;
- **executed evidence** — retained output showing that check actually ran;
- **rendered surface** — the review projection over those sources;
- **human disposition** — the reviewer's revision-bound judgment; and
- **authoritative workflow mutation** — any state change performed by the owning system.

A source-plan item marked accepted does not pre-approve the review artifact. A test file is not evidence that the test passed. A rendered Approve control does not mutate Company Planning, weekly task state, GitHub, deployment state, or any company gate.

## Decision persistence

The local review server exposes the same bounded review API used by the browser:

- `GET /api/review` reads the current subject and decision.
- same-origin `POST /api/review` records a disposition against the exact subject and prior decision.

Decisions are append-only local JSON records outside the generated artifact. The subject includes exact source revision and semantic/lineage digests; retained subject material preserves the basis of the decision across rebuilds. Stale or conflicting submissions are rejected rather than silently re-targeted.

This is a declared local reviewer flow, not authenticated multi-user workflow authority.

## Reproduce the retained checkpoint

Requires Node 22.22.3+, Git, tar, and a Python environment containing the dependencies required by the pinned Company Planning revision.

The historical checkpoint is intentionally reproducible from its immutable source pins:

```bash
npm ci
npm run build:company-review -- \
  --weekly-repo /path/to/weekly-plans \
  --weekly-sha 0ddc566c237aa9f0a8ed3937d65403498da5acfe \
  --company-repo /path/to/company-planning \
  --company-sha 228c0562f720f3ed0bdcfe38f864444cfb3c84d9

npm run serve:company-review -- \
  --decisions-dir /path/to/persistent-local-review-records \
  --actor local-reviewer
```

Open `http://127.0.0.1:4321`.

The generated output contains the standalone review HTML plus the projected models, source surface, session subject, decision schema, and executed evidence needed to reconstruct what was reviewed.

Only execute builds from trusted source revisions because the build runs source-owned contract tests.

## Validation expectations

A technically valid run should establish only the claims its checks exercise. At minimum:

- source revisions are immutable and visible;
- source/model references resolve;
- owning validators accept the generated projection where required;
- executed evidence is retained separately from check definitions;
- stale/cross-subject decisions fail visibly;
- review state remains local unless an authoritative write contract exists; and
- browser/render checks cover the required views/states when the rendered artifact itself is under review.

Human comprehension, usefulness, and final acceptance remain human readouts rather than implications of green automation.

## Company Planning integration boundary

Company Planning owns:

- planning/work semantics;
- lifecycle and review meaning;
- authoritative acceptance/write-back rules;
- evidence expectations; and
- semantic eligibility of its projections.

Representation Router owns:

- representation selection/composition;
- shared semantic focus behavior at the surface layer;
- renderer/playbook/quality guidance; and
- explicit preservation of provenance and action boundaries.

This adapter is therefore a **bounded consumer-side implementation**, not a universal Company Planning projector and not adoption of a second planning database.

## Historical authenticated-route work

Later experiments tested a live authenticated company-work answer, same-run composition, and answer-owned `review_handoff` behavior. Their important general lesson is that an authenticated answer, a same-run renderer composition, and a true source-owned review handoff are different claims and require different evidence.

Those dated runs and exact receipts are retained in [`evidence/company-review-integration-history.md`](evidence/company-review-integration-history.md) and the referenced evidence directories. They are intentionally not part of this current integration guide.

## Source-bound system-model review

The maintained system-model consumer selects a bounded adoption flow from Company Planning's
own ODD model. [Open the retained review](../artifacts/system-model-review/index.html).
It uses the existing `planning-review-surface.v1` contract; it does not introduce a second model
language or transfer planning authority to the Router.

```bash
node scripts/build-system-model-review.mjs \
  --surface /path/to/company-planning/proposals/system-model-review/model-review.json \
  --company-repo /path/to/company-planning \
  --company-sha FULL_VALIDATOR_COMMIT \
  --source-repo BrianMills2718/company-planning=/path/to/company-planning \
  --subject-revision BrianMills2718/company-planning=FULL_REVIEWED_COMMIT \
  --output artifacts/system-model-review
```

The validator code and contracts must match the pinned validator revision. Company Planning
checks every declared source against the independently supplied reviewed revision and the
SHA-256 of its committed bytes before the renderer writes output. A wrong revision, unavailable
repository or changed digest refuses the build. A prior retained artifact remains tied to its
original sources; a refused rebuild does not refresh it.

The boxes select model elements; the arrows are typed data handoffs, not state transitions.
Select any box to inspect its relationships and exact source. Coverage is explicitly partial:
source verification proves provenance, not semantic completeness, an executed adoption run,
or human acceptance. Recommendation and disposition are retained beside the review.
