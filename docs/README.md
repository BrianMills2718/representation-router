# Documentation map

This directory contains durable design guidance, implementation references, integration records, tranche plans, and retained evidence. They do not all have the same authority or freshness.

Use this page to decide **what to read and what to treat as current**.

## Start here

For most work, read only the smallest path that answers the question:

1. [`../README.md`](../README.md) — project overview, current boundary, planning/review role, and current project checkpoint.
2. [`../SKILL.md`](../SKILL.md) — canonical agent instructions for selecting and building representations.
3. [`design-model.md`](design-model.md) — durable conceptual model from semantic truth through ViewSpec/SurfaceSpec to product-owned implementation.
4. [`INTEGRATION_POSITION.md`](INTEGRATION_POSITION.md) — what belongs to Representation Router versus consuming products and proving applications.

For planning or completed-work review, add [`../references/planning-review.md`](../references/planning-review.md).
For current consolidation implementation sequencing, use [`consolidation-dogfood-order.md`](consolidation-dogfood-order.md). Runtime contract validation is implemented on the branch; the current implementation focus is two-consumer semantic-projection/epistemic dogfood under issue #27.

## Documentation authority

When documents overlap, use this precedence:

1. **Executable schemas/tests/source** define implemented behavior.
2. **`SKILL.md`** defines current agent operating instructions.
3. **Durable design/boundary docs** in this directory explain why the contracts are shaped as they are.
4. **Task-specific references** under `../references/` give deeper guidance for a selected profile.
5. **Current tranche plan** under `plans/` records temporary project work and stop conditions.
6. **Completed tranche plans, integration records, and evidence** preserve history and reproducibility; they do not override current guidance.

A dated commit SHA, CI run, deployment observation, or review receipt in a case study is evidence for that recorded event, not a claim that the revision is still current.

## Durable design and ownership

| Document | Use it for |
| --- | --- |
| [`design-model.md`](design-model.md) | Semantic model/view, projection, representation, working surface, interaction, provenance, and router stages. |
| [`INTEGRATION_POSITION.md`](INTEGRATION_POSITION.md) | Core/product/domain ownership boundaries and the planning/review integration position. |
| [`surface-spec.md`](surface-spec.md) | Detailed SurfaceSpec semantics, source/revision binding, shared focus, and action boundaries. |
| [`policy-ownership.md`](policy-ownership.md) | Which recommendation policies are catalog/config-owned versus code-owned today. |
| [`runtime-contract-validation.md`](runtime-contract-validation.md) | Runtime ownership and failure semantics for the existing public JSON Schema contracts. |
| [`core-reference-boundary.md`](core-reference-boundary.md) | Dependency boundary between the minimal reusable path and proving/reference applications. |

These documents should stay lifecycle/domain neutral unless they explicitly describe an integration example.

## Representation implementation and quality

| Document | Use it for |
| --- | --- |
| [`renderer-contract.md`](renderer-contract.md) | Renderer-adapter boundary and schematic versus authentic data behavior. |
| [`implementation-playbooks.md`](implementation-playbooks.md) | How implementation playbooks complement renderer selection. |
| [`composition.md`](composition.md) | The whole-page layer: one-page design principles as checks on every surface; the score is advisory, the justification is the record. | Catalog: `catalog/composition-heuristics.json` (25 sourced principles applied at plan, sketch, and review).
| [`render-quality.md`](render-quality.md) | Geometry, responsive, interaction-state, and visual QA expectations. |
| [`task-first-engineering-language.md`](task-first-engineering-language.md) | Human-facing language/progressive-disclosure guidance for working surfaces and reference applications. |

The implementation catalog and selector code remain the source for actual supported renderer metadata and recommendation behavior.

## Research and reusable lessons

| Document | Use it for |
| --- | --- |
| [`research-map.md`](research-map.md) | Prior-art bibliography and research questions. |
| [`prior-art-routing.md`](prior-art-routing.md) | How mature visual/interaction conventions inform routing rules. |
| [`portfolio-stress-test.md`](portfolio-stress-test.md) | Compact lessons from a repeated explanatory-surface stress test. |

These are supporting design knowledge, not executable policy unless a rule has been promoted into a catalog/config/code path and protected by tests.

## Planning and review

Current reusable guidance lives in [`../references/planning-review.md`](../references/planning-review.md).

[`company-review-loop.md`](company-review-loop.md) is a **bounded integration/case-study record** with exact historical source pins and evidence. Use it to understand how the ownership and evidence boundaries were exercised; do not use its dated revisions as the current project state.

The reusable mental model is:

```text
owning plan / architecture / implementation / evidence sources
        ↓
validated concern-specific projections
        ↓
Work | Architecture | Assurance | Review
        ↓
human planning or review judgment
        ↓
owning workflow performs any authoritative write
```

## Plans and project history

See [`plans/README.md`](plans/README.md).

Only the plan marked **active** there should be treated as the current tranche. Earlier plans are retained because they explain why a proving surface or abstraction exists and preserve its stop condition/evidence context.

Do not infer the current roadmap by sorting plan filenames or reading the newest-looking version number.

During Consolidation v0, [`consolidation-dogfood-order.md`](consolidation-dogfood-order.md) is the active implementation-sequencing companion to the tranche plan. It constrains the order in which existing contracts are validated, current consumers are dogfooded, and any reusable abstraction may be promoted.

## Evidence

`evidence/` contains retained receipts and observations tied to specific revisions/runs. Evidence establishes only the claim its record supports.

Examples:

- a test definition is not evidence that the test ran;
- a successful CI run is not human acceptance;
- a generated review surface is not workflow authority;
- a historical production/staging observation is not current runtime state.

## Maintenance rules

Keep the documentation compendious by following these rules:

- Put the **project summary/current state** in `README.md`; do not repeat the full design model there.
- Put **agent operating instructions** in `SKILL.md`; do not turn it into a project-history document.
- Put **durable concepts and ownership boundaries** in the design docs above.
- Put **profile-specific depth** in `references/` and load it only when relevant.
- Put **temporary project intent, stop conditions, and implementation history** in `plans/`.
- Put **exact run/revision evidence** in integration/evidence records, clearly labeled as dated.
- When a durable rule changes, update the smallest authoritative document and link to it instead of copying the rule into every doc.
- Prefer a link plus one-sentence summary over duplicated multi-paragraph explanations.
