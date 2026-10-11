---
description: Decision that the router only projects facts owned elsewhere and never grants or performs an authoritative write
---

# 0002 Truth and writes stay with the owning source

Governs: RULE-CONTRACT-VALIDATED, RULE-SEMANTIC-UNAVAILABLE-REJECTS, RULE-SURFACE-WRITE-AUTHORITY, RULE-TYPED-GRAPH-VALID

Status: accepted. Stated in README.md ("The model is the truth") and
docs/INTEGRATION_POSITION.md; enforced in code by the unavailable-semantics rejection in
`src/router.mjs`, the SurfaceSpec authoritative-write contract (`c746125`, 2026-09-15,
PR #22), and runtime contract validation (`d5c653e`, 2026-09-16).

## Context

A representation layer is tempted in two directions: drawing a plausible view when the
source cannot support it, and letting a rendered control (an Approve button) stand in for
real authority. Either makes the page claim something the owning model never said. Facts,
planning state, evidence and writes belong to Company Planning, weekly-plans or whichever
product owns them (AES-CTX-004, "truth lives where it is edited").

## Decision

The router consumes a validated use case and a typed source projection and emits
renderer-independent specs; it does not store or remap the facts. When the needed semantic
view is unavailable, every candidate is rejected rather than drawn. Inputs and outputs are
checked against published JSON Schemas (`src/schema-validation.mjs`, `schemas/`), including
the typed-graph/v1 contract the shared graph viewer accepts. A SurfaceSpec may describe an
authoritative write only with its destination, subject revision, authority basis,
stale-submission policy and evidence retention; the consuming product performs the write.

## Wrong when

A consumer has to copy facts into the router's catalogs or a recommendation to get a usable
page (the boundary is in the wrong place); or a page built from a router SurfaceSpec is
found performing a write the owning source did not authorize; or a recommendation names a
primary representation for a use case marked `unavailable`.
