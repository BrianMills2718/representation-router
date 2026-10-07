# Representation Router — zero-context takeover

If you are a new coding agent, start here, then read [`SKILL.md`](SKILL.md). Representation Router decides **what representation or working surface should be used and why** before choosing a visualization library or implementation.

The semantic/workflow source remains authoritative. Representation Router is a representation-policy layer, not a planning database, workflow engine, deployment system, or product authority.

## First 10 minutes

1. Run `npm test`; do not start from a failing baseline.
2. Read [`SKILL.md`](SKILL.md) end to end.
3. Read [`docs/README.md`](docs/README.md) so you know which documents are current guidance versus historical tranche/evidence records.
4. Read [`docs/design-model.md`](docs/design-model.md) and [`docs/INTEGRATION_POSITION.md`](docs/INTEGRATION_POSITION.md).
5. Inspect the relevant schemas and catalogs for the task rather than loading everything by default.
6. Read the closest example or task-specific reference only after the core question is clear.

For planning/completed-work review, load [`references/planning-review.md`](references/planning-review.md). For general visualization/modeling or explainer work, use [`references/advanced-routing.md`](references/advanced-routing.md).

## Current project state

As of 2026-09-25 the router has its first **authentic external consumer**: the
weekly-review workbench built from Brian's real weekly plan
(`weekly-plans/personal/planning-model/`, refreshed by
`scripts/refresh-weekly-review.sh`, served by `deploy/wsl/weekly-review.service`).
Brian approved a ChatGPT-drawn four-view sketch set, the build was dispositioned
against it (`docs/evidence/sketch-experiment-20260925/`), and he accepted the
result. The loop that the 2026-09-10 mockup session lacked now exists end to
end: sketch set → owner approval → build → parity disposition → acceptance.

Consolidation v0 (PR #24) and T3B (PR #30) are merged; the consolidation stop
rule still governs: do not add a new product surface, lifecycle capability,
renderer family, deployment target, domain ontology, or workflow authority
without a consumer that needs it. The two commands that carry the planning
loop are `npm run sketch-set` and `npm run disposition -- … --acceptance`.

Refreshing the weekly projection when the plan changes is
`scripts/refresh-weekly-review.sh --project` (LLM-backed projector in
weekly-plans with strict citation validation). Nothing on the router's own
finish line is open as of 2026-09-25; new work needs a consumer that asks for it.

## Core mental model

```text
semantic / workflow truth
        ↓
concern-specific semantic projection
        ↓
representation policy
        ↓
ViewSpec(s)
        ↓
optional CollectionSpec / SurfaceSpec
        ↓
product-owned renderer / application / workflow
```

Keep these distinct:

- **semantic truth** — owned by the source/domain system;
- **semantic projection/view** — the concern-specific slice allowed to answer the question;
- **representation** — graph, matrix, table, sequence, timeline, architecture view, explainer, composite, etc.;
- **working surface** — coordinated representations plus shared focus, source/revision bindings, interface patterns, and action boundaries;
- **implementation/workflow** — renderer, persistence, authorization, external effects, and domain execution owned by the consuming product.

## Hard invariants

- Do not begin with a visualization library.
- Do not let a representation family, renderer, or interface pattern decide semantic eligibility.
- If the required semantic view is unavailable, return an explicit unavailable state; do not fabricate a plausible diagram.
- Preserve partial/missing semantics and provenance.
- Hard constraints come before soft ranking.
- Do not assume scale reduction merely because aggregation is allowed; the selected representation must support the required strategy.
- Preserve stable semantic identity across compatible representation pivots.
- A source-revision change clears focus or requires explicit remapping; never remap by display-label coincidence.
- A visible control does not create workflow authority.
- An authoritative write must identify destination/target revision, exact subject revision, actor/authority basis and scope, stale-submission behavior, and retained evidence.
- Passing tests establish only the behavior exercised; they do not establish comprehension, usefulness, semantic truth, or human acceptance.

## Policy ownership

Do not assume every catalog is a complete policy engine.

Read [`docs/policy-ownership.md`](docs/policy-ownership.md) before moving recommendation logic between JSON and JavaScript. In the current system:

- representation metadata and heuristic weights are interpreted by generic router code;
- some interaction inference and renderer/layout preferences remain explicitly code-owned;
- representation substitute/complement relationships are catalog-owned; and
- schema/builder pairs such as SurfaceSpec are dual contracts protected by tests.

When changing policy, make the authoritative source clearer rather than duplicating the rule in a second place.

## Core versus proving applications

The minimal recommendation path is documented in [`docs/core-reference-boundary.md`](docs/core-reference-boundary.md). It does not require the Review Workbench, Engineering Studio, Implementation Runner, Engineering Home, Release + Operate proof, Company Planning adapter, or Self Map.

Those surfaces are valuable regression consumers and proving grounds. Their product workflow, persistence, execution, deployment behavior, and domain semantics do not become core merely because they live in this repository.

Do not mass-move files into `core/` / `reference-apps/` for aesthetics; justify structural churn with measured dependency problems.

## Extending representation policy

Before adding or changing a rule:

1. identify an observed routing/representation failure;
2. decide whether the rule is catalog/config-owned or code-owned;
3. prefer a general constraint or metadata improvement over a named-pattern exception;
4. add a realistic positive regression;
5. add an adversarial pair when possible; and
6. preserve valid existing recommendations unless evidence justifies change.

Heuristic weights and thresholds are hypotheses, not universal design laws.

## Required verification

For routing/contract changes:

1. run `npm test`;
2. validate the affected realistic example/proving case;
3. if rendering changes, run the selected quality method from `catalog/quality-methods.json` / [`docs/render-quality.md`](docs/render-quality.md);
4. distinguish test definitions from executed evidence; and
5. state what the evidence does **not** establish.

For project-level documentation/current-state claims, update [`docs/README.md`](docs/README.md) or [`docs/plans/README.md`](docs/plans/README.md) rather than copying a new “current checkpoint” paragraph into several files.

## Definition of done

A change is not done because the router returns a plausible pattern or a schema validates. It is done when the relevant contract is correct, the rationale matches the human concern, source/authority boundaries remain honest, existing consumers still regress cleanly, and the appropriate quality/evidence method has been executed.
