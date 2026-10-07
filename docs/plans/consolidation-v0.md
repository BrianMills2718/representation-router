# Representation Router Consolidation v0

**Planning path:** bounded repository consolidation  
**Status:** merged to `main` on 2026-09-16 (PR #24); stop condition reached. Child tranche T3B merged 2026-09-18 (PR #30). No tranche is currently active.  
**Base:** PR #23 project state  
**Intent:** improve clarity, correctness, and architectural separability without adding another capability surface

## Why this tranche exists

Representation Router now contains a useful reusable representation-policy core plus a substantial set of proving applications: planning/review workbenches, architecture views, authoring studios, implementation runners, task-first engineering surfaces, release/operate proofs, and the project Self Map.

Those proving applications have produced valuable reusable lessons. They have also made it harder to tell which behavior belongs to Representation Router itself and which behavior belongs to a reference application or product workflow.

The next step is therefore **consolidation, not capability expansion**.

This tranche should make the existing system easier to understand, test, falsify, and reuse before any new lifecycle surface or external connector is added.

## Stop rule

During Consolidation v0, do **not** add a new product surface, engineering lifecycle stage, renderer family, deployment target, domain ontology, or workflow authority.

A change belongs in this tranche only if it does at least one of the following:

- clarifies an existing contract or ownership boundary;
- removes duplicated or contradictory policy;
- fixes an existing routing/contract correctness bug;
- makes an existing assumption explicit and testable;
- reduces coupling between reusable core and proving applications;
- improves validation of existing inputs/outputs;
- makes evidence for an existing claim easier to inspect; or
- deletes or demotes an abstraction that has not earned reusable status.

If a proposed change primarily demonstrates a new capability, defer it.

## Current progress

Completed in PR #24 so far:

- [x] rewrite the repository front door around the durable core model and planning/review role;
- [x] add a documentation authority map (`docs/README.md`) and active/historical plan index (`docs/plans/README.md`);
- [x] align README, SKILL, TAKEOVER, design model, and task-first language around the same core/proving boundary;
- [x] separate the current bounded Company Planning integration guide from dated integration/evidence history;
- [x] fix scale/aggregation routing so aggregation permission does not grant unsupported representation capability;
- [x] stop routing failure from masquerading as semantic unavailability;
- [x] add regression tests for those correctness fixes;
- [x] inventory catalog/config-owned versus code-owned policy in `docs/policy-ownership.md`;
- [x] assess the core/reference dependency boundary and record that a mass directory move is not currently justified;
- [x] implement schema-driven runtime validation for use-case input, agent recommendation output, ViewSpec, CollectionSpec, and SurfaceSpec without adding a new product capability or contract. Issue #26 remains open pending PR review/merge.

Completed bounded follow-up work:

- [x] issue #27 — two-consumer semantic-projection/epistemic dogfood completed; repeated invariant promoted only as documentation, with item-level evidence state remaining adapter-owned;
- [x] T3B — source-owned architecture semantics now cross an opaque RR boundary into an RR-owned Structurizr adapter, with two real source designs, real Structurizr parser/export/browser-render evidence, and no public schema/provider promotion;
- [x] issue #28 — abstention/complement analysis completed from existing failures; no confidence/score threshold added, and complement-set machinery deferred because the captured matrix/graph case requires an alternate projection rather than bypassing hard constraints;
- [x] contributor review gate — the contributor repeatedly directed the bounded work to proceed after review of the architecture/provider findings and consolidation disposition;
- [x] issue #25 completion evidence is present in `docs/policy-ownership.md`;
- [x] issue #29 completion evidence is present in `docs/core-reference-boundary.md`.

Current disposition: **Consolidation v0 has reached its stop condition.** The remaining action is to land this branch into its parent project branch and re-run the parent artifact/review gates; no new core abstraction is required to complete consolidation.

## Architectural boundary to preserve

### Core representation policy

The minimal reusable core should be understandable without loading any proving application.

It includes:

- use-case / concern normalization;
- semantic availability and explicit gaps;
- candidate representation constraints and ranking;
- substitute/complement representation knowledge;
- `ViewSpec`, `CollectionSpec`, and `SurfaceSpec` contracts;
- interaction/interface/primitive/implementation/playbook/quality policy;
- renderer-independent recommendation and render planning; and
- authority-boundary validation for working surfaces.

The core **recommends, composes, explains, and validates representation policy**. It does not execute product workflows.

### Reference / proving applications

The following are consumers and proving grounds unless repeated independent evidence promotes a smaller abstraction into core:

- planning/review workbenches;
- Review Workbench generations;
- Feature Studio / Engineering Studio;
- Implementation Loop / Implementation Runner;
- diagnostic/fix proving flows;
- Engineering Home;
- Release + Operate staging proof; and
- Representation Router Self Map.

These applications may exercise the core aggressively. Their workflow semantics, state, persistence, execution adapters, deployment behavior, and product-specific copy do not become universal router policy by proximity.

### External/domain authority

Company Planning, architecture/domain models, Git repositories, test/CI systems, deployment systems, telemetry systems, and product applications continue to own their respective truth and authority.

Representation Router may project those sources into a working surface without duplicating their authority.

## Consolidation work order

### 1. Documentation and mental model

Make the following understandable from the repository front door:

- what Representation Router is;
- what it explicitly does not own;
- how semantic truth, semantic projection, representation, working surface, and implementation differ;
- how planning and review use the system;
- prospective planning versus checkpoint/completed-work review;
- core versus proving/reference applications; and
- why passing automation is not the same as human comprehension or acceptance.

Success condition: a new technical reviewer should not need to reconstruct the product boundary from historical plans or ~200 commits.

### 2. Existing router correctness

Repair correctness defects before adding routing intelligence.

Known checks include:

- scale reduction must not be assumed merely because `allowAggregation` is true; a selected candidate must actually support the required reduction strategy;
- a representation-routing failure must not be mislabeled as semantic unavailability;
- generated projection operations must be supported by the selected representation strategy; and
- no recommendation should manufacture semantics that were not present in the supplied semantic view.

Add regression tests for each corrected behavior.

### 3. Policy ownership

Inventory decision policy currently split between catalogs and JavaScript conditionals.

For each policy family, explicitly choose one of:

- **data-owned policy** — inspectable catalog/rule records interpreted by generic code; or
- **code-owned policy** — implementation logic whose ownership is explicit and tested.

Do not preserve a misleading halfway state where a catalog appears authoritative while decisive special cases live elsewhere.

Initial targets:

- implementation selection;
- interaction inference;
- scale strategies; and
- representation hard constraints versus soft preferences.

### 4. Contract validation

Ensure executable entrypoints validate the contracts they claim to consume rather than relying only on tests that schemas exist.

Prioritize existing public boundaries:

- use-case input;
- agent recommendation output;
- ViewSpec;
- CollectionSpec; and
- SurfaceSpec.

Prefer validation that reports actionable contract failures without changing valid recommendation behavior.

Implemented in PR #24:

- `src/schema-validation.mjs` loads the five checked-in JSON Schemas directly and interprets only the schema constructs those contracts currently use;
- CLI use-case inputs fail before routing with concrete contract paths;
- ViewSpec, agent recommendation, CollectionSpec, and SurfaceSpec builders validate emitted public contracts before returning them;
- the recommendation and router CLIs reassert serialized outputs at their public boundary;
- tests fail if a public schema starts using an unsupported validation keyword, preventing runtime/schema drift from becoming silent; and
- runtime validation exposed one pre-existing mismatch—an accepted direct routing result could have zero score reasons while `ViewSpec.rationale` requires at least one item—so the builder now supplies a minimal truthful fallback rather than weakening the contract, with a dedicated regression test.

Detailed ownership and failure semantics live in [`../runtime-contract-validation.md`](../runtime-contract-validation.md).

### 5. Semantic projection boundary

Do not add a large new semantic framework during this tranche.

Instead, document and inventory what existing `projection` fields cannot currently express, especially:

- source eligibility rules;
- derivation meaning;
- aggregation meaning;
- omission/gap reasons;
- evidence/source lineage for derived claims; and
- authority status of inferred versus source-owned semantics.

Only after at least two independent consumers demonstrate the same missing contract should a new `ProjectionSpec` / `SemanticViewSpec` be proposed.

### 6. Recommendation abstention and coordinated sets

Completed as bounded analysis in `../evidence/abstention-complement-analysis-v0.md`.

Findings:

- existing hard constraints cover the currently demonstrated abstention cases;
- heuristic scores/margins are not calibrated confidence and must not be turned into arbitrary abstention thresholds;
- `portfolio-qualitative-analysis` demonstrates that a zero score margin can be legitimate ambiguity between two plausible survivors;
- `requirements-verification` demonstrates a real complement failure: a global traceability matrix is valid while its reviewed node-link complement is only valid under a smaller neighborhood projection.

Disposition: **no new confidence or coordinated-set contract during Consolidation v0.** Complement-aware composition should wait for an earned way to express the alternate projection rather than silently overriding scale constraints.

### 7. Repository separability

Make the conceptual core/reference-app split visible in code organization before undertaking a disruptive directory move.

First establish dependency boundaries and inventories. Then decide whether physical moves such as `core/`, `contracts/`, and `reference-apps/` reduce coupling enough to justify churn.

Do not perform mass moves merely to make the tree look cleaner.

## Evidence rules

Consolidation claims require evidence appropriate to the claim:

- unit/contract tests for behavior;
- schema/runtime validation for contract claims;
- source/dependency inspection for architectural-boundary claims;
- existing proving applications as regression consumers; and
- human review for comprehension/usefulness claims.

A green CI run establishes only that configured automation passed for the tested revision.

## Explicitly deferred

Until this tranche is reviewed, defer:

- External Product / Environment Connector;
- another Engineering Home lifecycle capability;
- new diagnostic families;
- production deployment or observability integration;
- new visualization/renderer catalog expansion without an observed routing failure;
- a universal software-engineering ontology; and
- a new durable semantic projection abstraction without independent repeated evidence.

## Completion criteria

**Current assessment: reached on the consolidation branch, pending landing into the parent project branch.**

Consolidation v0 is complete when:

1. README and planning/review documentation explain the core model and planning/review role without relying on historical context.
2. Core versus proving/reference application ownership is explicit.
3. Known aggregation/scale and semantic-availability routing correctness defects are fixed with regression tests.
4. Existing public CLI/recommendation contract validation has a documented owner and execution path.
5. Catalog-owned versus code-owned policy is inventoried with no knowingly misleading source of authority.
6. Open semantic-projection, abstention, complement-set, and physical-reorganization questions are recorded as falsifiable follow-up work rather than silently implemented during this tranche.
7. Existing proving applications continue to pass as regression consumers.
8. Human review confirms that the project boundary and planning/review mental model are materially easier to understand.

No new capability surface is required to satisfy this stop condition.


### Company Planning semantic-domain experiment

The bounded Company Planning integration has opened a consumer-local experiment
around separating planning semantics into Intent, Work, Architecture, Evidence,
and Review domains before representation routing.

During Consolidation v0 this remains **consumer-local evidence**, not a new RR
core ontology or `ProjectionSpec` commitment.

The RR side should:

- continue to consume concern-specific semantic views rather than Company
  Planning's source ontology directly;
- test whether existing `ViewSpec` + implementation selection can route an
  Architecture semantic view to Structurizr/IcePanel or another mature
  implementation;
- avoid adding provider-specific source semantics to the RR core;
- preserve the existing rule that product/domain adapters translate into
  lifecycle-neutral RR inputs; and
- promote a new reusable semantic-projection contract only after at least two
  independent consumers expose the same missing core boundary.

This experiment is consistent with Consolidation v0's stop rule because it is
intended to **reduce custom proving-application rendering and clarify ownership**,
not add another RR lifecycle surface.
