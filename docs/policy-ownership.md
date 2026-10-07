# Representation policy ownership

Representation Router deliberately uses both machine-readable catalogs and executable policy code. This document identifies which source is authoritative for each existing decision so a catalog is not mistaken for a complete policy engine when decisive behavior lives in code.

This is an inventory of the current system, not a new capability model.

## Ownership rule

Use these terms consistently:

- **catalog data** — facts or reviewed guidance about a representation, interaction, implementation, interface pattern, playbook, quality method, or relationship;
- **heuristic configuration** — tunable weights, penalties, and hard-rule switches;
- **policy interpreter** — generic code that applies catalog/configuration data;
- **code-owned policy** — decision logic whose semantics currently live directly in executable code rather than a catalog rule record.

A policy can legitimately combine catalog data with a generic interpreter. The problem to avoid is implying that a catalog is authoritative for a decision when undocumented special-case code materially changes the outcome.

## Current inventory

| Decision | Catalog / config source | Executable source | Current authority |
| --- | --- | --- | --- |
| Representation eligibility and ranking | `catalog/representations.json`, `heuristics/core.json` | `src/router.mjs` | **Shared, explicit**: catalog declares candidate properties; heuristic config declares weights/switches; router owns generic scoring/constraint semantics. |
| Semantic availability rejection | use-case input | `src/router.mjs` | **Code-owned invariant** driven by input status. |
| Scale limit and aggregation eligibility | `catalog/representations.json` (`maxItemsWithoutAggregation`, capabilities), `heuristics/core.json` | `src/router.mjs` | **Shared, explicit** after Consolidation v0 fix: candidate metadata declares support; router enforces it. |
| ViewSpec projection operations | selected candidate capabilities + use case | `src/router.mjs` | **Code-owned construction rule** constrained by candidate metadata. |
| Learning-outcome capability inference | representation capabilities | `src/router.mjs` (`learningCapabilityMap`) | **Code-owned policy**. The catalog advertises representation capabilities; the outcome→capability mapping is not catalog-owned. |
| Basic ViewSpec interaction descriptions | none beyond tasks | `src/router.mjs` (`taskToInteraction`) | **Code-owned policy**. |
| Agent interaction-pattern selection | `catalog/interaction-patterns.json` | `src/agent-recommendation.mjs` (`taskInteractions` plus special cases) | **Code-owned selection policy over catalog definitions**. The interaction catalog is not the full selector. |
| Interface-pattern selection | `catalog/interface-patterns.json` | `src/interface-pattern-plan.mjs` | **Catalog-driven through a generic scorer**. |
| Implementation / renderer selection | `catalog/implementations.json` | `src/agent-recommendation.mjs` (`scoreImplementation`, `applySpecializedScores`) | **Code-owned scoring policy over catalog capability metadata**. The catalog describes implementations; it does not fully determine preference. |
| Layout-engine selection | `catalog/implementations.json` | `src/agent-recommendation.mjs` (`chooseLayoutEngine`) | **Code-owned policy** using catalog entries as available engines. |
| Representation alternatives as substitute/complement | `catalog/representation-relations.json` | `src/agent-recommendation.mjs` | **Catalog-owned relationship classification**; code performs lookup after primary routing. |
| Implementation playbook selection | `catalog/implementation-playbooks.json` | `src/playbook-plan.mjs` | **Selection code over catalog playbooks**; inspect `playbook-plan.mjs` for exact matching semantics. |
| Render quality-method selection | `catalog/quality-methods.json` | `src/quality-plan.mjs` | **Selection code over catalog quality methods**; inspect `quality-plan.mjs` for exact matching semantics. |
| Surface action authority validation | `schemas/surface-spec.schema.json` | `src/surface-spec.mjs` | **Dual contract**: schema and builder must express the same authority boundary; tests protect parity. |
| Collection composition | `schemas/collection-spec.schema.json` | `src/collection-spec.mjs` | **Dual contract**: schema defines output shape; builder owns deterministic construction semantics. |

## What the catalogs mean

### `catalog/representations.json`

Authoritative for the declared properties of a representation pattern in the current catalog: structures, tasks, interaction modes, dynamics, density, capabilities, scale default, accessibility/mobile metadata, representation roles, abstraction levels, and default layout.

It is **not** by itself the ranking algorithm. `src/router.mjs` defines how those properties interact with use-case inputs and heuristic weights.

### `catalog/implementations.json`

Authoritative for the repository's current descriptive metadata about available implementation approaches: supported families, capabilities, frameworks, best-for/avoid guidance, and source references.

It is **not** currently authoritative for renderer preference. Renderer-specific preference and penalty rules live in `src/agent-recommendation.mjs`.

### `catalog/interaction-patterns.json`

Authoritative for available interaction-pattern definitions and metadata.

It is **not** currently authoritative for task/learning/capability→interaction selection. Those mappings live in `src/agent-recommendation.mjs`.

### `catalog/interface-patterns.json`

This catalog is closer to data-owned selection. `src/interface-pattern-plan.mjs` applies a generic overlap scorer to catalog-declared task, intent, information-structure, and surface-context metadata.

## Current intentional code-owned policy

For Consolidation v0, the following should be treated as explicitly code-owned rather than silently pretending the catalogs fully determine them:

1. learning outcome → representation capability inference;
2. task → low-level ViewSpec interaction description;
3. task/learning/context → interaction-pattern selection;
4. renderer-specific implementation scoring;
5. layout-engine selection; and
6. quality/playbook matching semantics where their selector modules contain logic not represented in catalog data.

This does **not** mean they should remain code-owned forever. It means callers and maintainers now know which source to inspect.

## Criteria for moving policy into data

Move a code-owned rule into catalog/rule data only when doing so materially improves at least one of:

- inspectability for agents or reviewers;
- reuse across independent products;
- provenance/evidence attached to the rule;
- calibration without code changes; or
- avoidance of duplicated special cases.

Do not convert ordinary control flow into a generic rule engine merely for conceptual purity.

## Criteria for keeping policy in code

Keep policy code-owned when:

- the rule is tightly coupled to implementation mechanics;
- a data encoding would be less legible than the code;
- the rule has not demonstrated reuse across independent cases; or
- moving it would create a second mini-language without reducing ambiguity.

## Follow-up tests

When policy ownership changes, regression tests should answer:

- Did the authoritative source of the rule become clearer?
- Can a reviewer explain why the recommendation changed from inspectable evidence?
- Did valid existing recommendations remain stable unless an observed failure justified the change?
- Is the same rule now expressed in one place rather than duplicated across catalog and code?

This document satisfies the first Consolidation v0 requirement for an explicit policy-ownership inventory. It does not, by itself, justify migrating any particular code-owned policy into data.

## Score versus justification (2026-09-25)

The ranking score remains code-owned arithmetic over catalog-declared
properties and `heuristics/core.json` weights, and those weights remain
hypotheses. Policy decision recorded here: **the score is advisory.** The
record of a representation choice is the builder's own justification, which
the disposition checklist requires (`choice-justified:<representation>`)
whenever alternatives were offered. Do not add confidence thresholds or turn
score margins into abstention; see `docs/composition.md`.

