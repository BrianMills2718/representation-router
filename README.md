# Representation Router

Representation Router is an **agent-facing representation design and policy layer**. It turns an authoritative semantic or workflow model plus a concrete human question into an effective visual or interactive working representation.

> **The model is the truth. The representation is a task-specific projection over truth owned elsewhere.**

Representation Router does not own domain semantics, planning state, implementation truth, evidence custody, workflow authority, persistence, authorization, deployment state, or external effects. It recommends and composes representations that make those truths easier to understand and work with.

## The core flow

```text
authoritative semantic / workflow truth
        +
human question / concern
        +
task, audience, scale, interaction, risk, provenance
        ↓
concern-specific semantic projection
        ↓
representation routing
        ↓
ViewSpec(s)
        ↓
optional CollectionSpec / SurfaceSpec
        ↓
product-owned renderer / application / workflow
        ↓
render → inspect → measure → repair → validate
```

Keep five levels distinct:

1. **Truth** — what exists, what it means, and which system owns it.
2. **Semantic view / projection** — the concern-specific slice needed to answer the current question.
3. **Representation** — graph, matrix, table, sequence, architecture view, timeline, explorable explanation, composite view, and so on.
4. **Working surface** — one or more coordinated views with shared focus, source/revision bindings, interface patterns, and explicit action boundaries.
5. **Implementation** — renderer, application framework, persistence, authorization, and external effects owned by the consuming product.

Representation selection comes before library selection.

## How Representation Router supports planning and review

Planning and review are a primary proving use of the architecture, but Representation Router **does not become the planning system**. It consumes authoritative planning, architecture, implementation, and evidence sources and produces only the projections needed for the current job.

```text
plan / goals / work truth
        +
architecture / design truth
        +
implementation revision
        +
tests / runtime / evidence
        ↓
validated semantic projections
        ↓
coordinated working surface
 Work | Architecture | Assurance | Review
        ↓
human can determine:
- what is supposed to happen
- what depends on what
- what was actually built
- what evidence exists
- what is blocked, missing, or divergent
- what still requires human judgment
        ↓
optional explicit decision
        ↓
owning workflow performs any authoritative write
```

There are two related modes:

- **Prospective planning** — understand outcomes, work units, dependencies, architecture implications, risks, assurance gaps, and next actions before or during execution.
- **Checkpoint / completed-work review** — compare intended work with implementation and evidence, expose drift and unsupported claims, and focus human attention on decisions that genuinely require judgment or authority.

Across both modes, stable semantic identity and provenance should let a person move between Work, Architecture, Assurance, and Review without silently changing subjects.

A review surface does not make a decision merely because it renders an Approve or Request changes control. Tests, screenshots, and CI evidence establish only the behavior they actually exercise. Human acceptance and authoritative workflow state remain separate.

See [`references/planning-review.md`](references/planning-review.md) for reusable guidance and [`docs/company-review-loop.md`](docs/company-review-loop.md) for a bounded, revision-pinned integration record.

## Core versus proving applications

The repository contains both reusable Representation Router policy and applications built to exercise it.

### Reusable core

The reusable layer includes:

- use-case / concern normalization;
- semantic availability and explicit gaps;
- representation routing and explainable scoring;
- substitute/complement representation knowledge;
- `ViewSpec`, `CollectionSpec`, and `SurfaceSpec` contracts;
- interaction, interface, primitive, implementation, playbook, and quality policy;
- renderer-independent recommendation and render-plan helpers; and
- authority-boundary checks for working surfaces.

**Drawing a node-and-link graph? Use the shared graph viewer, do not write a new
one.** [`graph-viewer/`](graph-viewer/README.md) takes a `typed-graph/v1`
document ([`schemas/typed-graph.schema.json`](schemas/typed-graph.schema.json))
and handles ELK layout, sharp page-text labels, label spacing, fit-then-zoom
and selection. Build it with `npm run build:graph-viewer` and vendor
`graph-viewer/dist/graph-viewer.js`. First consumer: the DoDAF demo at
<https://brianmills.dev/dodaf-mock/>.

### Proving/reference applications

The repository also contains planning/review workbenches, authoring studios, implementation runners, diagnostic/fix flows, Engineering Home, Release + Operate staging proofs, and the Representation Router Self Map. They test the larger thesis and reveal reusable failures.

**A proving surface does not automatically belong in the minimal core.** Product-specific workflow, execution, deployment, persistence, and domain semantics remain outside the reusable representation-policy layer unless repeated independent evidence justifies a smaller general abstraction.

See [`docs/INTEGRATION_POSITION.md`](docs/INTEGRATION_POSITION.md) and [`docs/core-reference-boundary.md`](docs/core-reference-boundary.md).

## Where to read next

- [`SKILL.md`](SKILL.md) — canonical instructions for coding agents.
- [`docs/README.md`](docs/README.md) — documentation map and authority/freshness rules.
- [`references/planning-review.md`](references/planning-review.md) — planning and completed-work review profile.
- [`docs/design-model.md`](docs/design-model.md) — conceptual model.
- [`docs/composition.md`](docs/composition.md) — the whole-page layer and why the score is advisory.
- [`docs/INTEGRATION_POSITION.md`](docs/INTEGRATION_POSITION.md) — ownership and ecosystem boundary.
- [`docs/policy-ownership.md`](docs/policy-ownership.md) — catalog/config/code policy ownership.
- [`schemas/use-case.schema.json`](schemas/use-case.schema.json), [`schemas/view-spec.schema.json`](schemas/view-spec.schema.json), [`schemas/collection-spec.schema.json`](schemas/collection-spec.schema.json), [`schemas/surface-spec.schema.json`](schemas/surface-spec.schema.json) — machine-readable contracts.
- [`src/router.mjs`](src/router.mjs) and [`src/agent-recommendation.mjs`](src/agent-recommendation.mjs) — deterministic recommendation path.
- [`src/disposition-cli.mjs`](src/disposition-cli.mjs) — refuses a silently-skipped checklist item; does not re-verify any claim. With `--acceptance`, also pins a human-approved sketch/mockup as a required parity line.

The catalogs under [`catalog/`](catalog/) hold reviewed representation, interaction, implementation, primitive, interface, playbook, quality, and relation knowledge. [`docs/policy-ownership.md`](docs/policy-ownership.md) records where decisive selection semantics still live in code rather than catalog data. The heuristic defaults under [`heuristics/`](heuristics/) are hypotheses to test, not universal design laws.

## Agent usage

For design guidance, identify:

- the question or human job;
- the authoritative source model;
- the semantic view required to answer it;
- whether that view is available, partial, or unavailable;
- the primary operations the person must perform;
- scale, density, interaction, accessibility, provenance, and consequence constraints; and
- an observable success criterion.

### Decision/checklist disposition log

Nothing in this repository automatically verifies that a built artifact satisfies its own recommended quality checks — `npm test` checks the router's routing logic and catalog structure, not a downstream build. `npm run render-qa` exists but is a separate, manually-invoked script.

`npm run disposition -- <recommendation.json> <disposition.json>` closes the cheap part of that gap without a brittle validator: it reads the checklist a recommendation already named (`avoid`, the playbook's `avoid` list, `quality.hardChecks`/`softChecks`/`usabilityChecks`) and refuses to proceed if any item has no explicit `{ "status": "satisfied" | "na" | "skipped", "why": "..." }` entry. It does not check whether a claimed `"satisfied"` is true — only a human or a review pass can do that — it converts a silent omission into a visible, falsifiable line, and records it under `disposition-logs/`. `examples/representation-router-self-explainer.disposition.json` is a worked, honestly-filled example against this repo's own self-explainer artifact, including checklist items it admits were skipped.

For learning surfaces, declare the desired journey in `learning` rather than copying low-level capabilities into `requiredCapabilities`. The router can use `entryMode`, learning `outcomes`, scaffolding level, prediction-before-reveal, and unseen-transfer requirements to prefer representations that actually support acquisition and fluency. Add `successCriteria` when there is a concrete way to tell whether the representation worked. `examples/prebiological-crusoe-learning.json` is the current stress test.

Then route representations. Only after selecting the representation should the agent choose a renderer or implementation approach.

For deterministic routing:

```bash
npm run --silent recommend -- examples/failure-propagation.json
npm run --silent recommend -- examples/architecture-communication.json --text-source
```

When several concern-specific views form one human working experience, compose their `ViewSpec`s into a `SurfaceSpec`. The consuming product still owns persistence, authorization, mutation, source truth, and final interaction behavior.

## Important invariants

- Do not fabricate a plausible visualization when the required semantic view is unavailable.
- Preserve partial semantics and missing information rather than making an artifact look complete.
- Preserve stable semantic IDs across compatible representation pivots.
- A source-revision change must clear semantic focus or use an explicit remap; never remap by matching display labels.
- A visible write control is not an authorization mechanism.
- Prefer mature visual languages and existing project capabilities before inventing notation or adding dependencies.
- Prefer the smallest representation or coordinated set that makes the current task perceptually cheap.
- Treat heuristics and scale thresholds as evidence-sensitive defaults, not universal laws.

## Current project checkpoint

**As of 2026-10-08 the active work is [Hypergraph views](proposals/hypergraph-views/README.md):** facts that join several things in named roles are drawn as one hub with labelled spokes, in the shared [graph viewer](graph-viewer/README.md) (`typed-graph/v1`, now 0.8.0 with draggable boxes) and through the router. Current plans live in `proposals/<plan>/`; [`docs/plans/`](docs/plans/README.md) holds the earlier tranche history.

Earlier checkpoints, kept as history: Consolidation v0 (PR #24, merged 2026-09-16) hardened the existing system before any expansion, and its stop rule still applies: new surfaces need a consumer that asks for them. PR #23's Representation Router Self Map v0 came before it.

For the full map of where each answer lives, see [`wiki/index.md`](wiki/index.md).

## Try it

Requires Node.js 22.22.3+ (the minimum required by the current checked-in visualization/tooling dependencies).

```bash
npm test
npm run demo
npm run --silent recommend -- examples/failure-propagation.json
npm run playground
npm run build:representation-router-self-map:v0
```

For the bounded Company Planning review integration, see [`docs/company-review-loop.md`](docs/company-review-loop.md).

## Status

Representation Router is an active research-backed prototype used to inform real product work. The router, catalogs, ViewSpec/CollectionSpec/SurfaceSpec contracts, render adapters, quality methods, deterministic recommendation path, and multiple proving applications are implemented and exercised by tests and evaluation examples.

The heuristic weights, thresholds, and some application-level abstractions remain hypotheses. Future changes should be driven by observed routing ambiguity, correctness failures, or repeated product evidence—not by catalog completeness or a desire to absorb more of the software-engineering lifecycle into the core.
