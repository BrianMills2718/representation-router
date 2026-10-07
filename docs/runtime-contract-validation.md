# Runtime public-contract validation

Representation Router keeps the checked-in JSON Schemas as the structural source of truth for its public recommendation contracts. Runtime entrypoints and builders should not maintain a second hand-written copy of those structural rules.

**Status:** implemented on `chore/consolidation-v0` / PR #24; pending review and merge. Issue #26 remains open so branch implementation is not confused with landed project state.

This document records the validation ownership introduced during Consolidation v0 / issue #26. It adds enforcement to existing boundaries; it does not add a representation, workflow, ontology, or lifecycle capability.

## Public contracts

The current public structural contracts are:

- `schemas/use-case.schema.json`
- `schemas/agent-recommendation.schema.json`
- `schemas/view-spec.schema.json`
- `schemas/collection-spec.schema.json`
- `schemas/surface-spec.schema.json`

`src/schema-validation.mjs` loads those schemas directly and validates runtime values against them.

The schemas therefore remain the source for required fields, structural types, enums, array cardinality/uniqueness, closed-object properties, constants, references, and the conditional structural rules they already declare.

## Validation ownership

| Boundary | Runtime owner/path | Current behavior |
| --- | --- | --- |
| Use-case input | `src/recommend-cli.mjs`, `src/cli.mjs` | Validate before catalog loading/routing; malformed input exits with contract path diagnostics. |
| Agent recommendation output | `src/agent-recommendation.mjs`, reasserted by `src/recommend-cli.mjs` before serialization | Validate both accepted and no-representation recommendation shapes before they leave the recommendation boundary. |
| ViewSpec output | `src/router.mjs`, reasserted by `src/cli.mjs` and transitively by the recommendation schema | Validate every built ViewSpec before returning it. |
| CollectionSpec output | `src/collection-spec.mjs` | Validate the built contract before returning it. |
| SurfaceSpec output | `src/surface-spec.mjs` | Preserve stronger builder-owned authority/cross-field checks, then validate the final emitted object against `surface-spec.schema.json`. |

Tests validate the five public contracts directly and protect the validator/schema compatibility boundary.

## Schema-driven, not contract-specific

`src/schema-validation.mjs` is a small interpreter for the JSON Schema subset used by the five public schemas. It does not contain field-by-field use-case, ViewSpec, CollectionSpec, SurfaceSpec, or recommendation rules.

`test/runtime-contract-validation.test.mjs` scans the public schemas and fails if a schema begins using a validation keyword the runtime interpreter does not support. That means a future schema change cannot silently become documentation-only behavior: either the runtime validator must learn the keyword or the contract must use an already-supported construct.

The supported subset is deliberately bounded to the constructs exercised by current public schemas, including structural types, required/properties, closed objects, enums/constants, arrays, numeric/string bounds, references, conditional composition, and URI format checks.

This is not a general-purpose JSON Schema implementation and should not grow merely for completeness. Add interpreter behavior only when an existing public schema needs it, or replace it with a declared mature validator dependency if that becomes materially simpler and lower-risk.

The repository currently has no declared general-purpose JSON Schema validator dependency. A transitive validation/type dependency is not treated as a public runtime dependency merely because it happens to be present in the lockfile. This keeps the dependency contract explicit and avoids lockfile churn during consolidation. If the supported schema surface grows enough that the bounded interpreter stops being simpler to audit than a mature declared validator, replacement should be evaluated as a dependency/maintenance decision rather than extending the interpreter for its own sake.

## Structural validation versus code-owned invariants

Schema validation does not replace stronger semantic or authority checks that already belong in code.

`src/surface-spec.mjs`, for example, enforces invariants such as:

- authoritative writes require a destination;
- the exact subject revision is required;
- actor/authority basis and scope are required;
- stale submissions must reject or require refresh;
- retained evidence is mandatory for authoritative writes; and
- read-only/surface-local actions cannot smuggle in authoritative destinations or authority.

Those rules are intentionally retained even where the JSON Schema expresses part of the same constraint. They are builder behavior and authority-safety invariants, not a reason to duplicate every structural schema rule in JavaScript.

The ownership rule is:

```text
JSON Schema
  -> structural public contract

schema-validation.mjs
  -> runtime enforcement of that structural contract

builder/domain code
  -> stronger code-owned semantic, cross-reference, and authority invariants
```

## Failure semantics

Validation failures use `ContractValidationError` and include the contract name plus concrete value paths, for example:

```text
Invalid use-case contract:
- $.interaction: missing required property "mode"
- $.scale.items: must be >= 0
```

Malformed use-case input must fail before routing. Invalid generated output must fail before it is serialized or returned as a successful public recommendation/spec.

Runtime validation also exposed one pre-existing contract mismatch during implementation: a directly constructed accepted routing result could contain no score reasons, while `ViewSpec.rationale` has always required at least one item. The builder now emits a minimal truthful fallback rationale in that case rather than weakening the schema, and a dedicated runtime-contract regression test protects that behavior.

Validation failure is a contract error. It must not be converted into semantic unavailability, a weak representation recommendation, or a successful result with a warning.

## Scope boundary

Runtime validation is consolidation work because it makes existing contracts executable and falsifiable.

It does **not** justify:

- new projection semantics;
- an `EvidenceSpec`, `ProjectionSpec`, or `SemanticViewSpec`;
- new confidence/epistemic machinery;
- new renderer families;
- new working surfaces; or
- workflow authority in Representation Router.

Per [`consolidation-dogfood-order.md`](consolidation-dogfood-order.md), issue #26 now acts as the completed branch-level gate for current issue #27 dogfood. #27 must remain consumer-local until repeated evidence earns any reusable change.
