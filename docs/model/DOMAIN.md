---
description: Domain glossary for the Representation Router - every concept in docs/planning/domain.graph.json with its definition, where it is defined, and whether code implements it
---

# Representation Router: domain glossary

The subject of this repository is how a question about some owned facts becomes a recommended view, a page plan and a checklist, and how a built page proves it answered every item. The graph is [`docs/planning/domain.graph.json`](../planning/domain.graph.json) (typed-graph/v1); the project layer of the semantic spectrum is [`docs/planning/semantic-spectrum.json`](../planning/semantic-spectrum.json). The system model in [ARCHITECTURE.md](ARCHITECTURE.md) is the process view of the same things. Read on 2026-11-06 at `2765a08`. "In code" names the file and line that implements the concept.

## Request (in code)

What an agent hands the router: the person's question and the facts about the source model.

| Concept (graph id) | Definition | Defined in | Status |
| --- | --- | --- | --- |
| Use case (`use-case`) | The request: the person's question, information structure, intent, task, dynamics and the parts they asked to see. Validated against schemas/use-case.schema.json before routing. | `schemas/use-case.schema.json:4` | In code: `src/recommend-cli.mjs:25` |
| Semantic availability (`semantic-availability`) | Whether the owning model can supply the semantic view a representation needs (available, partial, unavailable). Unavailable rejects every candidate. | `schemas/use-case.schema.json:482` | In code: `src/router.mjs:54` |
| Approved reference (`approved-reference`) | A mockup or sketch Brian approved, pinned by sha256; it becomes a required checklist item needing evidence. | `src/disposition-cli.mjs:23` | In code: `src/disposition.mjs:65` |

## Contract (in code)

A JSON Schema record the router reads, prints or hands to a product.

| Concept (graph id) | Definition | Defined in | Status |
| --- | --- | --- | --- |
| ViewSpec (`view-spec`) | The chosen representation bound to the use case: what to draw and why. Product-neutral. | `schemas/view-spec.schema.json:4` | In code: `src/router.mjs:274` |
| CollectionSpec (`collection-spec`) | Several ViewSpecs grouped for one page. | `schemas/collection-spec.schema.json:1` | In code: `src/collection-spec.mjs:3` |
| SurfaceSpec (`surface-spec`) | A working surface over ViewSpecs: shared focus, source and revision binding, and actions; an authoritative write needs an authority contract. | `schemas/surface-spec.schema.json:4` | In code: `src/surface-spec.mjs:144` |
| Agent recommendation (`agent-recommendation`) | What `npm run recommend` prints: primary, alternatives, avoid list, ViewSpec, page plan, implementation hints and checklist. | `schemas/agent-recommendation.schema.json:4` | In code: `src/agent-recommendation.mjs:314` |
| Typed graph (`typed-graph`) | typed-graph/v1: kinds, nodes, edges and hyperedges; the graph viewer's published input. | `schemas/typed-graph.schema.json:4` | In code: `graph-viewer/src/model.mjs:12` |
| Relation hub (hyperedge) (`relation-hub`) | A fact joining several things in named roles, drawn as one hub with role-labelled spokes. | `schemas/typed-graph.schema.json:235` | In code: `graph-viewer/src/model.mjs:76` |

## Reviewed knowledge (in code)

Hand-edited catalogs and heuristics the router reads; pinned by tests.

| Concept (graph id) | Definition | Defined in | Status |
| --- | --- | --- | --- |
| Representation (`representation`) | One way to show information (graph, matrix, table, timeline, relation-hub graph, ...), with the structures and tasks it suits. 36+ entries. | `catalog/representations.json:1` | In code: `catalog/representations.json:1` |
| Heuristic weights (`heuristic-weights`) | Hand-set weights the router scores candidates with; hypotheses, not laws. Advisory only. | `heuristics/core.json:3` | In code: `heuristics/core.json:1` |
| Composition heuristic (`composition-heuristic`) | A sourced whole-page design principle (25 of them) applied at plan, sketch and review. | `docs/composition.md:1` | In code: `catalog/composition-heuristics.json:1` |
| Implementation (`implementation`) | A concrete renderer or library that can draw a representation, with its playbook and quality method. | `catalog/implementations.json:1` | In code: `src/playbook-plan.mjs:12` |
| Writing form (`writing-form`) | A written form (report, explainer, reference note, ...) the writing router routes prose to, with its checklist. | `catalog/writing-forms.json:1` | In code: `scripts/writing_record.py:35` |

## Router step (in code)

A step that turns a request into a recommendation or refuses one.

| Concept (graph id) | Definition | Defined in | Status |
| --- | --- | --- | --- |
| Route (score and rank) (`route`) | Scores every representation against the use case and ranks them; rejects all when semantics are unavailable. | `src/router.mjs:243` | In code: `src/router.mjs:243` |
| Page plan (`page-plan`) | How the whole page reads: viewport, density budget, applicable composition heuristics and the checks they add. | `src/composition-plan.mjs:160` | In code: `src/composition-plan.mjs:160` |
| Checklist (`checklist`) | The items a built page must answer, collected from the recommendation (and any approved reference). | `src/disposition.mjs:58` | In code: `src/disposition.mjs:58` |
| Disposition (`disposition`) | The builder's answer to every checklist item (satisfied, na, skipped or failed, with a reason); a silent gap is refused. | `docs/decisions/0001-disposition-refuses-silent-gaps.md:1` | In code: `src/disposition.mjs:98` |
| Sketch set (`sketch-set`) | Variants of a view drawn for Brian to pick from before building; the pick becomes an approved reference. | `SKILL.md:1` | In code: `src/sketch-set.mjs:19` |

## Record (in code)

What the router writes and keeps: disposition logs, observations, writing records.

| Concept (graph id) | Definition | Defined in | Status |
| --- | --- | --- | --- |
| Disposition log (`disposition-log`) | The daily file outside any repository, ~/projects/data/logs/disposition/<date>.jsonl, gaining one line per accepted disposition (DISPOSITION_LOG_DIR overrides). The default since 2026-10-23 (commit 04dadd1). | `docs/model/trace.yaml:11` | In code: `src/disposition-cli.mjs:127` |
| Committed disposition record (`committed-disposition`) | One JSON file written only with --out-dir DIR, for evidence committed next to the work it judges; disposition-logs/ keeps such examples. | `README.md:151` | In code: `src/disposition-cli.mjs:123` |
| Observation row (`observation-row`) | One line per disposition run, accepted or refused, appended to one file per day outside the repository. | `docs/model/trace.yaml:11` | In code: `src/observation.mjs:8` |
| Writing record (`writing-record`) | <draft>.writing.json: the writing route chosen and each checklist item's observation; a pass needs a verbatim quote. | `docs/model/trace.yaml:12` | In code: `scripts/writing_record.py:71` |

## Shared viewer (in code)

Rendering code other projects vendor: the graph viewer.

| Concept (graph id) | Definition | Defined in | Status |
| --- | --- | --- | --- |
| Graph viewer (`graph-viewer`) | The shared React Flow + ELK/force viewer projects vendor as dist/graph-viewer.js. | `graph-viewer/README.md:1` | In code: `graph-viewer/src/index.jsx:592` |
| Large-graph layout (`large-graph-layout`) | Over 60 nodes or 120 edges the viewer uses fast ELK settings and falls back to force when a layout throws. | `graph-viewer/src/model.mjs:110` | In code: `graph-viewer/src/model.mjs:110` |

## Outside this repository

People and systems that use the router or own the facts; not part of this codebase.

| Concept (graph id) | Definition | Defined in | Status |
| --- | --- | --- | --- |
| Coding agent (`coding-agent`) | Claude Code or Codex loading SKILL.md and running recommend and disposition while building a page. | `docs/model/ARCHITECTURE.md:30` | Outside this repository; the code meets it at `SKILL.md:1` |
| Owning source model (`source-model`) | The project that owns the facts (Company Planning, weekly plans, DoDAF data); the router never writes to it; a SurfaceSpec binds each source by id, owner and revision. | `docs/decisions/0002-truth-and-writes-stay-with-the-owner.md:1` | Outside this repository; the code meets it at `src/surface-spec.mjs:84` |
| Consuming product (`consuming-product`) | The page or app that renders the recommended views and performs any authoritative write (review pages, workbenches, demos); the Company Planning review is the one built here. | `docs/INTEGRATION_POSITION.md:1` | Outside this repository; the code meets it at `src/company-review.mjs:45` |

## Named in issues, not built

Concepts open issues name that no code here implements yet.

| Concept (graph id) | Definition | Defined in | Status |
| --- | --- | --- | --- |
| Force layout by size (`force-by-size`) | When the caller gives no layout, graphs above the size threshold get the force layout instead of ELK, and an unchanged update does not lay out again (the dense-layout plan; issue #169). | `docs/plans/graph-viewer-dense-layout.md:36` | Issues only |
| Layout off the main thread (`elk-worker`) | Run the layout in a web worker so no layout blocks the page at all; out of the dense-layout plan (issue #169). | `graph-viewer/README.md:1` | Issues only |
| Cross-document claim link (`cross-document-link`) | Links between claims in different documents (retells, agrees, conflicts) for documentsToTypedGraph (issue #167). | `graph-viewer/README.md:1` | Issues only |
| Grouped layout (`grouped-layout`) | Cluster nodes by kind for large domain maps (issue #149). | `graph-viewer/README.md:1` | Issues only |

Two words mean two things here: **plan** (the router's page plan versus a Company Planning plan) and **review page** (a planning package's page versus any consuming product). The spectrum file's `ambiguous` list records both.
