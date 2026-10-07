# Core / reference-application dependency boundary

This document records the source dependency boundary reviewed during **Consolidation v0 / PR #24** before any physical repository reorganization. Its purpose is to decide whether moving files would reduce real coupling or merely rename directories.

It is an architectural inventory, not a proposal to split packages immediately.

## Minimal recommendation path

The current deterministic recommendation entrypoint is:

```text
src/recommend-cli.mjs
  ↓
src/agent-recommendation.mjs
  ├─ src/router.mjs
  ├─ src/interface-pattern-plan.mjs
  ├─ src/playbook-plan.mjs
  └─ src/quality-plan.mjs
```

Those modules consume repository-owned data from:

```text
schemas/use-case.schema.json          (declared input contract)
heuristics/core.json
catalog/representations.json
catalog/representation-relations.json
catalog/interaction-patterns.json
catalog/interface-patterns.json
catalog/implementations.json
catalog/implementation-playbooks.json
catalog/quality-methods.json
```

`src/router.mjs` itself is dependency-free application code: it receives use-case, catalog, and heuristic data and returns ranked results / ViewSpecs.

The recommendation path does **not** require a Review Workbench, Engineering Studio, Implementation Runner, Engineering Home, release/operate surface, Company Planning adapter, or Self Map to perform representation routing.

That is the most important current separability result: **the minimal representation-routing path remains independently intelligible and executable even though the repository contains many proving applications.**

## Contract/composition modules

The following modules are also reusable core candidates because their semantics are lifecycle/domain neutral and they do not need a proving application to define their purpose:

- `src/collection-spec.mjs` + `schemas/collection-spec.schema.json`
- `src/surface-spec.mjs` + `schemas/surface-spec.schema.json`
- `src/render-plan.mjs` + renderer-independent ViewSpec inputs

`SurfaceSpec` includes application-facing source/revision and action-boundary concepts, but the consuming application remains responsible for persistence, authorization, and external effects.

## Proving/reference application families

The **PR #23 base state** adds or retains several application families that exercise the core:

### Planning and review

- weekly/company planning review builders and adapters;
- linked Work / Architecture / Assurance / Review artifacts;
- Review Workbench generations.

### Authoring and implementation

- Feature Studio;
- Engineering Studio;
- feature/problem/implementation briefs;
- Implementation Loop;
- Implementation Runner;
- registered implementation adapters.

### Diagnostic and task orchestration

- diagnostic router/adapters;
- Fix proving flow;
- engineering task router;
- Engineering Home.

### Release / operate proof

- repository-owned CI staging release/observation/rollback flow;
- release/operate working surface.

### Project self-representation

- Representation Router Self Map.

These are important regression consumers and design probes. Their presence in the repository does not make their workflow semantics part of the minimal router.

## Direction of desired dependency

The desired direction is:

```text
external/domain truth
        ↓
reference/proving application adapter
        ↓
core use-case / semantic-view inputs
        ↓
representation core + contracts
        ↓
ViewSpec / SurfaceSpec / recommendation
        ↓
reference/proving application renderer/workflow
```

The core should not need to import a proving application in order to explain or execute its own representation policy.

A proving application may depend on core contracts and helpers. That dependency is expected.

## Boundary checks

Before classifying a module as core, ask:

1. Can its purpose be explained without naming one product workflow or proving artifact?
2. Does it operate on lifecycle/domain-neutral contracts?
3. Would at least two independent consumers plausibly use the same behavior?
4. Does moving it to core reduce duplicated reasoning rather than merely centralize code?
5. Can the minimal router/recommendation path remain useful if this module is removed?

Before classifying behavior as application-owned, ask:

1. Does it execute a product workflow rather than recommend a representation?
2. Does it persist product/review state?
3. Does it own deployment, runtime observation, or rollback mechanics?
4. Does it encode one feature family, diagnostic family, or company workflow?
5. Does its meaning depend on a product-specific authority model?

If yes, it should normally remain outside the minimal representation core.

## Why no mass directory move yet

A physical split such as:

```text
core/
contracts/
reference-apps/
```

might eventually improve navigation and package boundaries. It would also touch a large number of imports, scripts, tests, build configs, documentation links, and retained proving artifacts.

The current evidence does not require that churn yet because the minimal recommendation path is already source-separable: core recommendation modules do not depend on the proving applications to run.

The more valuable immediate work is therefore:

- make ownership explicit;
- prevent new core → proving-app dependencies;
- validate public contracts at runtime;
- reduce duplicated policy sources; and
- use dependency failures, not aesthetic preference, to justify physical movement.

## Guardrail

During Consolidation v0:

- new reusable core modules must not import proving/reference application modules;
- proving applications may consume documented core modules/contracts;
- product/domain adapters should translate into core inputs rather than teach the core their ontology;
- external effects remain application-owned;
- a physical directory/package split should be proposed only if a measured dependency problem cannot be solved by clearer module ownership.

## Current conclusion

**Do not perform a mass core/contracts/reference-apps move yet.**

The conceptual boundary needed clarification, but the minimal recommendation path is already technically separable from the growing proving-product surface area. Preserve that direction and measure future coupling. Reorganize physically only if dependency evidence shows that the current tree is causing real boundary violations or maintenance cost.

This inventory should be revisited whenever a core module begins importing task orchestration, implementation execution, release/operate, or other proving-application behavior.
