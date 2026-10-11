---
description: The Representation Router's requirements, each with how success is seen and what would disprove it
---

# Representation Router requirements

Each requirement is drawn from behavior the code and tests already have; the rule that
enforces it, its owner and its checks are in [trace.yaml](../model/trace.yaml).

## REQ-RR-001 Deterministic, explainable recommendation from a validated use case

`npm run recommend -- <use-case.json>` validates the use case against
`schemas/use-case.schema.json`, routes it over the reviewed catalogs, and prints one
agent recommendation that itself validates against `schemas/agent-recommendation.schema.json`,
with the score reasons for the chosen and rejected representations.

Success: the same use case and catalogs give the same primary representation every run;
`test/router.test.mjs` and `test/agent-recommendation.test.mjs` pin expected routes (for
example requirements verification routes to a traceability matrix), and
`test/runtime-contract-validation.test.mjs` shows a malformed use case is refused before
routing.

Disproof: a malformed use case reaches routing, a printed recommendation fails its own
schema, or the primary representation changes between runs with unchanged inputs.

## REQ-RR-002 No view is drawn when its semantics are unavailable

A use case whose `semanticAvailability.status` is `unavailable` rejects every candidate
representation, naming what is missing; `partial` availability is kept in the ViewSpec.

Success: `test/router.test.mjs` "unavailable semantic views are rejected before
representation ranking" and "partial semantic availability is preserved in the ViewSpec"
pass.

Disproof: a recommendation names a primary representation for a use case marked
`unavailable`, or a partial ViewSpec drops its `missing` list.

## REQ-RR-003 A checklist item is never skipped silently

`npm run disposition -- <recommendation.json> <disposition.json>` refuses unless every
checklist item the recommendation named (avoid list, playbook avoid list, hard, soft and
usability checks, the choice justification, and each approved reference) has a status of
satisfied, na or skipped with a non-empty reason; a satisfied approved reference also needs
evidence, and the approved file's sha256 must match.

Success: `test/disposition.test.mjs` and `test/composition-layer.test.mjs` pass; a complete
disposition writes one JSON log under `disposition-logs/` and one observation line.

Disproof: the command exits 0 while a named item has no line, or accepts a line with no
reason, or accepts a satisfied approved reference with no evidence.

## REQ-RR-004 A working surface cannot grant write authority by rendering a control

`buildSurfaceSpec` composes ViewSpecs into a SurfaceSpec and refuses an
`authoritative-write` action that lacks a target revision and an authority contract.

Success: `test/surface-spec.test.mjs` "rejects authoritative writes without revision and
authority contract" and "surface-local actions cannot smuggle external write authority"
pass.

Disproof: a SurfaceSpec with an authoritative write and no revision or authority basis is
built without error.

## REQ-RR-005 One shared graph viewer with a published input contract

Node-and-link graphs for any project are drawn by `graph-viewer/` from a `typed-graph/v1`
document whose schema is published at `schemas/typed-graph.schema.json`; invalid graphs are
reported with what is wrong.

Success: `test/graph-viewer.test.mjs` passes ("a valid typed graph has no problems; broken
ones say exactly what is wrong"; ELK returns a position for every node and a route for every
edge).

Disproof: a broken typed graph validates clean, or a laid-out graph is missing a node
position or an edge route.

## REQ-RR-006 A writing record's pass is backed by the draft itself

`scripts/writing_record.py` records a piece of writing's route and checklist; a `pass`
observation is accepted only with a quote that appears verbatim in the draft, and `check`
exits non-zero while the record is incomplete.

Success: `test/writing-record.test.mjs` passes.

Disproof: `observe ... pass` is accepted with a quote absent from the draft, or `check`
exits 0 on an incomplete record.
