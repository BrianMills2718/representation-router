# T3B — Architecture candidate/provider boundary

Status: experimental child tranche of Consolidation v0. No public contract promotion and no renderer replacement decision.

## Goal

Prove the boundary:

```text
source-owned Design semantics
        ↓
ArchitectureViewCandidate
        ↓  opaque cross-repository handoff
Representation Router validation + concern availability
        ↓
provider selection
        ↓
provider adapter (Structurizr first)
```

The consumer must not read Company Planning Markdown, Design sidecars, PlanningReviewSurfaceV1, or Plan #44-specific source files.

## Decisions

1. Company Planning owns Design semantics and generation of the provider-neutral candidate.
2. Representation Router owns validation of the cross-repository candidate, derivation of architecture-view availability, provider selection, and provider-specific adaptation.
3. `ArchitectureViewCandidate.v0` contains semantic facts and provenance only. It does not contain representation/provider eligibility booleans.
4. The experimental v0 element vocabulary is deliberately flat: actor, system, external_system. Component/container/data-store hierarchy is deferred until a real source requires explicit containment semantics.
5. Candidate validation is executable but remains experimental; it is not added to RR's public contract set.
6. Provider failure must not masquerade as semantic unavailability.
7. Structurizr adoption remains gated on private-safe parser/render and human visual/task comparison.

## Work slices

### A — source boundary cleanup (Company Planning)

- remove representation-named eligibility from candidate generation;
- narrow the experimental Design seam to the proved flat element kinds;
- retain Plan #44 byte-for-byte candidate regeneration;
- add a second real bounded-design source: Shared Dashboard Publication Contract;
- include a deployment boundary in that second source so semantic availability can exceed current Structurizr adapter capability;
- retire the active provider-specific Structurizr generator/test from Company Planning, leaving old generated workspace only as historical T3A evidence.

### B — executable consumer boundary (Representation Router)

- add an experimental `architecture-view-candidate.v0` JSON Schema;
- add semantic validation for identity/reference/contract consistency;
- add exact fixtures for Plan #44 and Shared Dashboard candidates;
- reject presentation/provider fields such as `representation_eligibility`.

### C — RR concern availability and provider routing

Derive semantic concern availability from candidate facts:

- system context: system-level elements plus relationships;
- contract view: typed contracts;
- data/artifact flow: matching relationship kinds;
- sequence: ordered behaviors;
- deployment: deployment boundaries;
- component: unavailable in v0 because hierarchy is intentionally absent.

Provider routing remains separate. A concern can be semantically available while no current provider adapter can render it.

### D — Structurizr adapter on the RR side

- generate only supported, selected concerns;
- map contracts to relationship obligations, never fake architecture nodes;
- fail closed on unsupported element/hierarchy semantics;
- preserve source design IDs and lineage properties;
- deterministic byte-for-byte DSL output.

Initial adapter support: system context, contract map, data/artifact flow.
Deployment/sequence/component remain adapter-unavailable even when future/source semantics exist.

### E — evidence and gates

Use two real source candidates:

1. Plan #44 — flat systems/contracts/flows, no behavior/deployment hierarchy.
2. Shared Dashboard Publication Contract — distinct publication/aggregation architecture with an explicit deployment boundary.

Acceptance:

- RR consumes only candidate JSON;
- both candidates validate;
- Plan #44 routes exactly the three proved concerns to Structurizr;
- Shared Dashboard exposes deployment semantics but Structurizr abstains for deployment;
- malformed cross-domain/provider fields fail;
- generated Structurizr DSL is deterministic;
- existing RR tests remain green.

## Stop conditions

Stop without promoting a durable schema when any of these occur:

- the second real design needs semantics the flat v0 seam cannot express cleanly;
- RR needs Company Planning-specific source knowledge to route;
- provider selection requires Plan #44-specific logic;
- candidate semantics drift toward renderer vocabulary;
- provider failure is confused with semantic absence.

## Deferred gate

No replace/complement decision for RR's architecture renderer until a private-safe Structurizr parser/render run and direct human task comparison establish visual/interaction value.
