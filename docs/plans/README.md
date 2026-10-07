# Plan index

This directory is a **project-history and tranche-planning record**, not the canonical design manual.

For the project overview, start with [`../../README.md`](../../README.md). For documentation authority and navigation, use [`../README.md`](../README.md). Durable boundary guidance lives in [`../INTEGRATION_POSITION.md`](../INTEGRATION_POSITION.md), and agent operating instructions live in [`../../SKILL.md`](../../SKILL.md).

## Active tranche

None as of 2026-09-24. Consolidation v0 and its T3B child both merged to `main`; the stop rule below still applies until a new tranche is opened per "Adding future plans".

### [Consolidation v0](consolidation-v0.md)

**Status:** merged 2026-09-16 (PR #24, `chore/consolidation-v0`); stop condition reached.

Purpose: improve clarity, correctness, contract validation, policy ownership, and core/reference separability **without adding another capability surface**.

Its stop rule supersedes any older plan language that appears to invite immediate expansion into another lifecycle capability or external connector.

### [T3B Architecture Candidate/Provider Boundary](architecture-provider-boundary-t3b.md)

**Status:** merged 2026-09-18 (PR #30, `experiment/architecture-provider-boundary`); was governed by Consolidation v0.

Purpose: prove an opaque source-semantic → RR → provider boundary across two real Company Planning designs without promoting a new public contract or making a Structurizr adoption decision.

## Upstream checkpoint retained for review

### [Representation Router Self Map v0](representation-router-self-map-v0.md)

This was the final project-level checkpoint assembled on PR #23 before Consolidation v0 began. Its technical build/evidence record remains useful, but references to the Self Map as the “current” or “next” checkpoint are historical when read from the consolidation branch.

### [Release + Operate Loop v0](release-operate-loop-v0.md)

Retained proving tranche for repository-owned CI staging deployment, observation, rollback, and re-apply. It does not imply production deployment authority or that release/operate belongs to the minimal Representation Router core.

## Completed/retained proving tranches

The remaining plan files explain how particular proving surfaces or reusable concepts were reached. They are retained for rationale, stop conditions, and evidence context; they are **not an ordered current roadmap**.

- [Working Surface Layer](working-surface-layer.md) — introduced the lifecycle-neutral SurfaceSpec contract.
- [Code Review Proving Case](code-review-proving-case.md) — exercised SurfaceSpec against a real code-review subject.
- [Review Workbench v0](review-workbench-v0.md) — early task/evidence review surface.
- [Architecture Lens Pack v1](architecture-lens-pack-v1.md) — architecture representations inside the review workflow.
- [Interactive Architecture v1.1](interactive-architecture-v1.1.md) — direct architecture exploration and relationship inspection.
- [Task-first Capability Pass v1.2](task-first-capability-pass-v1.2.md) — human-language/progressive-disclosure pass.
- [Build Feature: Saved Layouts v1.3](build-feature-saved-layouts-v1.3.md) — a bounded authoring/implementation proving case.
- [Feature Studio v0](feature-studio-v0.md) — feature authoring surface.
- [Implementation Loop v0](implementation-loop-v0.md) — implementation handoff/evidence loop.
- [Implementation Runner v0](implementation-runner-v0.md) — bounded executable implementation adapters.
- [Multi-feature Adapter Coverage v0](multi-feature-adapter-coverage-v0.md) — exercised more than one implementation family.
- [Task-first Engineering Home v0](task-first-engineering-home-v0.md) — product-shell proving surface around human engineering jobs.
- [Generic Build/Fix Authoring v0](generic-build-fix-authoring-v0.md) — task-first Build/Fix proving convergence.

## How to read an old plan

Treat each plan as a revision-bound historical record:

- **Intent** explains why the tranche existed.
- **Stop condition/status** records what was considered complete at that time.
- **Exact SHAs, CI runs, artifacts, and dates** are evidence for that historical checkpoint.
- **“Next” statements** describe what was next from that checkpoint, not necessarily what is next now.
- **Product/proving language** does not automatically define reusable core scope.

When an older plan conflicts with the active consolidation plan or durable boundary docs, the active/current docs win.

## Adding future plans

Create a new tranche plan only when the work has a bounded outcome and stop condition. Update this index at the same time:

1. mark one plan active;
2. move the prior active plan into the retained section;
3. state whether the tranche changes reusable core policy, a reference application, or both; and
4. avoid leaving multiple documents claiming to be the current checkpoint.
