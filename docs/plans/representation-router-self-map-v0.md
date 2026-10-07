# Representation Router Self Map v0

**Planning path:** durable single-contributor  
**Status:** refreshed after Consolidation v0 — technical artifact rebuilt; refreshed human review pending  
**Risk tier:** Tier 2 — project self-representation over repository/planning/evidence truth  
**Target:** PR #23 / `feature/review-workbench-v0`

## Why this tranche exists

Representation Router now has many working surfaces and a long sequence of proving checkpoints. The current Engineering Home is primarily the **product shell**: it asks what software-engineering job a person wants to do.

That is different from applying Representation Router to **Representation Router itself**.

The user needs one artifact that makes the RR project understandable without reconstructing ~200 commits, many plan documents, source modules, CI runs, and separate proving artifacts.

Human checkpoint:

> **Can one Representation Router working surface explain Representation Router itself — what it is, how it works, what has been built, what is proven, what is still partial/unavailable, what we are doing now, and what comes next?**

## Subject and authority

Subject:

- repository: `brianmills-spec/representation-router`
- branch under review: `feature/review-workbench-v0`
- current source snapshot: injected from the exact CI checkout revision at build time
- current PR: #23

Authority stays distributed:

- repository source owns implementation truth;
- plan documents own tranche intent/status records;
- GitHub Actions receipts/artifacts own execution evidence;
- RR Self Map is a read-only projection/working surface over those sources;
- the Self Map does not become the planning, Git, CI, product, or deployment authority.

## Core distinction the artifact must teach

### Representation Router core

The reusable representation-intelligence layer:

- use-case / concern normalization;
- semantic availability;
- representation routing/scoring;
- ViewSpec production;
- interaction patterns;
- implementation/playbook/quality recommendations;
- SurfaceSpec composition and authority boundaries;
- implementation-authoring/adapter routing where supported.

### Representation Router product/proving surfaces

Interfaces and workflows built to exercise the core and the larger end-to-end thesis:

- Review Workbench;
- Engineering Studio;
- Implementation Runner;
- Engineering Home;
- Release + Operate staging proof;
- self-map itself.

The Self Map must not imply every proving surface belongs in the minimal core library.

## Primary questions

The first screen must answer, without requiring RR terminology:

1. **What is Representation Router?**
2. **Why are we building it?**
3. **Where are we now?**
4. **What is the next meaningful step?**
5. **What should I inspect if I want more detail?**

## Views

### 1. Start here

Plain-language project briefing:

- mission;
- product thesis;
- core vs product distinction;
- current human checkpoint;
- latest technically completed tranche;
- next planned tranche;
- important limitations.

The default view must not lead with `ViewSpec`, `SurfaceSpec`, schema names, or module names.

### 2. Roadmap

Show the actual project progression as inspectable milestones, grouped into phases rather than one giant undifferentiated list.

Suggested phases:

1. **Representation foundation** — router, catalogs, ViewSpec/recommendation path.
2. **Working surfaces** — SurfaceSpec + review workbench.
3. **Human comprehension** — architecture lenses, direct graph interaction, task-first language.
4. **Author + implement** — Saved Layouts, Feature Studio, Implementation Loop/Runner, multi-feature adapters.
5. **Task-first E2E workflow** — Engineering Home + generic Build/Fix.
6. **Release + operate** — CI staging deployment/observation/rollback.
7. **Project self-map** — technically complete project representation.
8. **Consolidation v0** — current landing-review checkpoint: contract/runtime hardening, core/proving boundary clarification, provider-neutral architecture seam/provider falsification, and abstention/complement analysis.
9. **External product connection** — next; still not started and blocked on a real authorized target.
10. **General incident/operations** — later.

Every milestone should expose:

- status (`complete`, `current-review`, `next`, `later`);
- why it existed;
- what it proved;
- plan/source references;
- major lesson/nonclaim.

### 3. How RR works

Interactive architecture graph grounded in real repository modules.

The graph should distinguish:

- external/domain truth;
- representation-routing core;
- working-surface composition;
- authoring/implementation routing;
- task orchestration/product surfaces;
- evidence/release loop.

Primary components should reference real files such as:

- `src/router.mjs`
- `src/agent-recommendation.mjs`
- `src/surface-spec.mjs`
- `src/implementation-authoring.mjs`
- `src/implementation-runner.mjs`
- `src/diagnostic-router.mjs`
- `src/engineering-task-router.mjs`
- `src/release-operate.mjs`
- `.github/workflows/ci.yml`

Relationships must be source-grounded or clearly described as architectural composition, not invented call edges.

The graph should support:

- drag for local layout;
- node and edge selection;
- one-hop connection focus;
- pan/zoom/show whole diagram/reset positions;
- inspector with purpose, source, evidence, and what the relation does **not** mean.

Dragging remains presentation-only.

### 4. Capability map

Show current maturity by engineering job/lifecycle stage.

Current truth should distinguish at least:

- understand;
- review;
- build;
- fix;
- implement;
- verify;
- release;
- operate;
- production/external environment integration.

Use `ready`, `partial`, `unavailable`, or equivalent plain-language states. No global completion percentage.

### 5. Evidence / proof

Show the distinction:

```text
project claim
  ↓
implementation/source
  ↓
test/check definition
  ↓
executed CI evidence
  ↓
retained artifact
  ↓
human review
```

Include representative proof for:

- SurfaceSpec merge/CI;
- interactive workbench;
- implementation runner;
- multi-feature routing;
- Build/Fix convergence;
- Release + Operate staging/rollback;
- Self Map build itself once CI executes.

Do not represent a test file as proof it ran.

### 6. Plans / current work

Expose:

- current checkpoint: **Consolidation v0 / PR #23 landing review**;
- previous technically complete checkpoint: **Representation Router Self Map v0**;
- next: **External Product/Environment Connector**, still blocked on a real authorized target;
- later: general incident/operate workflows.

The refreshed artifact must also expose the consolidation evidence that changed the project boundary:

- runtime public-contract validation;
- required-versus-observed evidence remaining adapter-owned;
- the source-neutral `ArchitectureViewCandidate` → RR → Structurizr provider boundary;
- real Structurizr parser/export/browser-render evidence without provider promotion;
- abstention/complement analysis that rejects arbitrary confidence thresholds and defers coordinated-set machinery until alternate projection semantics are earned; and
- the measured decision not to mass-move core/reference directories.

The next checkpoint must say why it cannot be truthfully implemented as another local demo: it requires a real product-owned deployment/observability target and explicit authority.

## Shared semantic focus

The same conceptual item should keep its identity across tabs where practical.

Examples:

- selecting `Implementation Runner` in architecture can highlight the corresponding author/implement roadmap milestone and evidence entries;
- selecting Release + Operate in roadmap can surface its capability and proof records;
- selecting a capability can show the milestone(s) that established it.

If a selected item is not represented in a view, say so rather than silently changing subjects.

## Self-map data model

Create a curated repository-owned model for the artifact. It should contain:

- mission/product thesis;
- phases/milestones;
- architecture nodes/edges;
- capabilities;
- evidence records;
- source references;
- current/next checkpoint;
- nonclaims/authority boundaries.

A CI build may inject the exact checkout SHA and build metadata into a generated snapshot object, but it must not fetch mutable external state at runtime.

## Artifact

Create a self-contained browser artifact:

`artifacts/representation-router-self-map-v0/index.html`

Implementation:

- React + existing `@xyflow/react` for the architecture graph;
- Vite + `vite-plugin-singlefile`;
- no runtime network dependency;
- responsive desktop/mobile behavior.

## Validation

Tests cover:

1. all model IDs are unique;
2. all internal references resolve;
3. all referenced repository paths exist;
4. current/next checkpoint are explicit;
5. current checkpoint is Consolidation v0 / PR #23 landing review, previous checkpoint is Self Map v0, next is External Product/Environment Connector;
6. architecture distinguishes core vs product/proving surfaces;
7. graph relationship metadata includes meaning + nonclaim + source refs;
8. capabilities expose explicit maturity and limitations;
9. evidence distinguishes definitions from executed proof;
10. primary UI copy is task/project language, with technical terms progressively disclosed;
11. architecture uses semantic IDs for selection and direct manipulation is surface-local only;
12. generated artifact is a single-file HTML with no external script source;
13. no runtime `fetch`/XHR/Git write/deployment write path exists in the Self Map;
14. CI builds and retains the artifact;
15. human acceptance remains pending after automation passes.

## Exact verified checkpoint

Exact implementation head:

`73514ae4d8c94b481c06df2bb5dcf8575b433483`

GitHub Actions run:

`35131966389`

Completed successfully:

- `npm ci`;
- full repository test suite, including Self Map model/reference/interaction tests;
- all prior Review Workbench, Studio, Implementation Runner, Fix, Engineering Home, and Release/Operate builds;
- `npm run build:representation-router-self-map:v0`;
- all configured artifact uploads.

Retained Self Map artifact:

- artifact id `10461917379`;
- artifact name `representation-router-self-map-v0`;
- GitHub artifact digest `sha256:6baf5195f92787938c88be041ab7801715797c138060c05431fdfa156eee3918`;
- `index.html`: 471,975 bytes;
- `index.html` SHA-256 `cfe00bfe95904e6373cac7e339a146f2001a5edbddbec77aa84e226d20ef4854`;
- no external `<script src>` dependency;
- build manifest pins source revision `73514ae4d8c94b481c06df2bb5dcf8575b433483`, PR #23, and CI run `35131966389`;
- human review remains `pending`.

The artifact's primary views are:

- **Start here** — mission, thesis, core-vs-product distinction, current/previous/next checkpoint;
- **Roadmap** — phase-based milestone progression with why/proof/lesson/source drill-down;
- **How RR works** — draggable/clickable architecture graph with relationship nonclaims;
- **Capability map** — ready/partial/unavailable engineering capability truth;
- **Evidence** — claims vs source/check/execution/artifact/human-review distinctions;
- **Plans / next** — current checkpoint, next external-connector boundary, later operations work, and exact build snapshot.

## Non-goals

- No new implementation adapter.
- No new deployment target.
- No production connection.
- No merge of PR #23.
- No attempt to make the Self Map a planning database.
- No automatic inference that every source-file import is a domain relationship.

## Consolidation refresh

After PR #24 merged into the PR #23 branch, the previously retained Self Map became semantically stale even though its build snapshot correctly pointed at the new repository revision. The static model still described Self Map as the current checkpoint and External Product / Environment Connector as immediately next.

That mismatch is itself important evidence:

> **exact revision binding does not make a stale project projection current.**

The Self Map model is therefore refreshed to include:

- Consolidation v0 as the current landing-review checkpoint;
- the source-neutral architecture candidate boundary;
- the RR-owned Structurizr provider adapter;
- T3B parser/render/provenance evidence;
- #28 abstention/complement findings; and
- the decision not to promote a public projection/provider abstraction or perform a mass directory move.

The external connector remains next-but-blocked. Consolidation does not authorize another local proving sandbox.

## Stop condition

**Reached technically for the refreshed model once exact-head CI rebuilds and retains the artifact.** Human comprehension/usefulness review of that refreshed artifact remains pending.

Do not merge PR #23 to `main` or resume external-product capability expansion until the refreshed artifact has been reviewed and the project-level mental model is useful.