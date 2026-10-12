---
description: System model of the Representation Router - its boundary, parts, main flows with their writers, shared records and observable quality patterns
---

# Representation Router system model

Sections follow arc42 (1, 3, 5, 6, 8, 10) with C4 diagrams in Mermaid. The checked twin is
[trace.yaml](trace.yaml): every rule below has one owner file, its tests and its decision
record. Covered scope: the reusable core (`src/` recommendation, disposition, contracts),
`graph-viewer/` and `scripts/writing_record.py`. Not modelled: the proving applications
(`review-workbench*`, `feature-studio-v0`, `engineering-studio-v1`, `implementation-*`,
`weekly-review`, the Self Map) and the public export script; they consume the core and are
listed only as containers.

## 1. Goals

What the router is for, its quality goals and stakeholders: [GOAL.md](../architecture/GOAL.md).
Questions this model should answer: which code turns a use case into a recommendation, which
code refuses an incomplete disposition and what it writes, where a write-authority boundary
is enforced, and which tests prove each rule can fail.

## 3. Context and Scope

The router reads a use case (the person's question plus the facts about the source model)
and its own reviewed catalogs; it prints recommendations and writes disposition records.
The facts, planning state and any authoritative write stay with the consuming product.

```mermaid
C4Context
  title System context: Representation Router
  Person(agent, "Coding agent", "Claude Code or Codex building a page; loads SKILL.md")
  Person(brian, "Brian", "Reads the built page; approves sketches")
  System(rr, "Representation Router", "Recommends views, page plans and checks; refuses silent gaps")
  System_Ext(source, "Owning source model", "Company Planning, weekly-plans, DoDAF data: owns the facts")
  System_Ext(product, "Consuming product", "Renders the page and performs any authoritative write")
  System_Ext(logs, "Situation-checklist log", "~/projects/data/logs/situation-checklists/<date>.jsonl")
  Rel(agent, rr, "use-case.json, disposition.json")
  Rel(source, agent, "facts and semantic availability")
  Rel(rr, agent, "AgentRecommendation JSON, refusal list")
  Rel(agent, product, "builds the page from the ViewSpec / SurfaceSpec")
  Rel(rr, logs, "one observation line per disposition run")
  Rel(brian, product, "reads, approves")
```

## 5. Building Blocks

```mermaid
C4Container
  title Containers: Representation Router
  Container(core, "Recommendation core", "Node ESM, src/", "router.mjs, agent-recommendation.mjs, composition-plan.mjs, render-plan.mjs, recommend-cli.mjs")
  Container(contracts, "Contracts", "JSON Schema, schemas/ + src/schema-validation.mjs", "use-case, view-spec, collection-spec, surface-spec, agent-recommendation, typed-graph")
  ContainerDb(catalog, "Catalogs and heuristics", "JSON, catalog/ + heuristics/", "representations, relations, interactions, implementations, playbooks, quality methods, composition heuristics, writing forms")
  Container(dispo, "Disposition gate", "Node ESM", "src/disposition.mjs, src/disposition-cli.mjs, src/observation.mjs")
  ContainerDb(dlogs, "Disposition logs", "JSON files, disposition-logs/", "one record per completed disposition")
  Container(surface, "Working-surface layer", "Node ESM", "src/surface-spec.mjs, src/collection-spec.mjs")
  Container(graph, "Shared graph viewer", "React Flow + ELK, graph-viewer/", "typed-graph/v1 in, laid-out interactive graph out")
  Container(writing, "Writing router", "Python stdlib, scripts/writing_record.py", "routes prose to a form and checklist; <draft>.writing.json records")
  Container(proving, "Proving applications", "review-workbench*, feature-studio-v0, engineering-studio-v1, implementation-*, weekly-review, public/", "consume the core; not part of it")
  Rel(core, catalog, "reads")
  Rel(core, contracts, "validates input and output")
  Rel(dispo, dlogs, "writes")
  Rel(dispo, core, "reads the recommendation's checklist")
  Rel(surface, contracts, "SurfaceSpec vocabulary")
  Rel(writing, catalog, "reads writing-forms.json")
  Rel(proving, core, "uses")
  Rel(proving, graph, "vendors")
```

Stored state that matters: the catalogs and heuristics (reviewed knowledge, edited by hand
and pinned by `test/catalogs.test.mjs`), the disposition logs under `disposition-logs/`, the
writing records beside each draft, and the daily observation log outside the repository.
The recommendation itself is printed, not stored.

## 6. Runtime View

**PROC-RECOMMEND** (`npm run recommend`), enforces RULE-CONTRACT-VALIDATED and
RULE-SEMANTIC-UNAVAILABLE-REJECTS:

1. `src/recommend-cli.mjs:23` validates the use case (`assertContract("use-case", ...)`,
   defined at `src/schema-validation.mjs:293`); a malformed file exits 1 before routing.
2. `src/recommend-cli.mjs:48` calls `buildAgentRecommendation`; it routes at
   `src/agent-recommendation.mjs:160` through `route` (`src/router.mjs:145`), where
   `scoreCandidate` rejects every candidate when semantics are unavailable
   (`src/router.mjs:53`), builds the ViewSpec (`src/agent-recommendation.mjs:183`) and the
   page plan (`src/agent-recommendation.mjs:189`).
3. `src/recommend-cli.mjs:62` validates the output against the agent-recommendation schema
   and `:63` prints it. Nothing is stored.

**PROC-DISPOSITION** (`npm run disposition`), enforces RULE-DISPOSITION-NO-SILENT-GAP,
RULE-CHOICE-JUSTIFIED, RULE-ACCEPTANCE-EVIDENCE and RULE-OBSERVATION-DAILY-APPEND:

1. With `--acceptance`, `src/disposition-cli.mjs` checks each approved reference's sha256
   against the bytes on disk and exits 1 on a mismatch.
2. `src/disposition-cli.mjs:67` collects the checklist (`collectChecklist`,
   `src/disposition.mjs:44`) and `:68` validates it (`validateDisposition`,
   `src/disposition.mjs:75`).
3. Refused: `src/disposition-cli.mjs:82` appends a not-ok observation and exits 1.
   Accepted: `src/disposition-cli.mjs:108` writes the record
   `disposition-logs/<id>--<timestamp>.json` and `:110` appends an ok observation; the
   append itself is `src/observation.mjs:23`.

**PROC-SURFACE** (`buildSurfaceSpec`, `src/surface-spec.mjs:144`), enforces
RULE-SURFACE-WRITE-AUTHORITY: an `authoritative-write` action is refused at
`src/surface-spec.mjs:112` unless it carries destination, subject revision, authority, a
stale-submission policy and evidence retention. Returns a SurfaceSpec; writes nothing.

**PROC-GRAPH** (graph viewer render), enforces RULE-TYPED-GRAPH-VALID: `graph-viewer/src/index.jsx:241`
refuses an invalid typed graph using `validateTypedGraph` (`graph-viewer/src/model.mjs:10`)
before ELK layout. Writes nothing.

**PROC-WRITING-RECORD** (`scripts/writing_record.py declare|observe|check`), enforces
RULE-WRITING-PASS-NEEDS-QUOTE: `cmd_observe` (`scripts/writing_record.py:136`) refuses a
pass whose quote is not in the draft (`:143`); `save` (`:62`) writes `<draft>.writing.json`;
`cmd_check` exits 1 while any item is open. When the facts give no route, `check` also exits 1
unless `declare --no-fit-governed-by PATH_OR_URL` recorded a `no_fit` disposition naming the
contract or authority that governs the writing; then only the medium's items apply and the log
row's form is `no_fit`.

## 8. Cross-cutting Concepts

- **Records.** UseCase (input, `schemas/use-case.schema.json`); ViewSpec, CollectionSpec,
  SurfaceSpec (contracts in `schemas/`); AgentRecommendation (printed);
  DispositionRecord v0.2 (`buildDispositionRecord`, `src/disposition.mjs:105`); observation
  row (`observationRow`, `src/observation.mjs:8`); writing record (`<draft>.writing.json`);
  typed graph (`typed-graph/v1`).
- **Truth stays with the owner.** Stable semantic IDs and source bindings come from the
  owning model; the router never remaps by display label and never writes to the source
  ([Decision 0002](../decisions/0002-truth-and-writes-stay-with-the-owner.md)).
- **Advisory score.** Scores and heuristic weights rank candidates but do not decide; when
  alternatives exist the disposition must justify the choice
  ([docs/composition.md](../composition.md)).
- **Views.** The recommend CLI output (shows the primary, alternatives, avoid list, page
  plan and checks); the disposition CLI output (shows missing and invalid items, or the log
  path); the graph viewer (shows a typed graph's nodes, edges and hyperedges); the public
  page in `public/` (runs the router for visitors).

## 10. Quality Requirements

Observable patterns if the system works:

- A use case marked `unavailable` yields no primary representation; the rejected list names
  the missing semantics (observable in `npm run recommend` output; `test/router.test.mjs`).
- A disposition that omits one named item exits 1 and writes no file under
  `disposition-logs/`; the count of files there equals the number of accepted runs
  (observable in the directory; `test/disposition.test.mjs`).
- Observation lines for one day land in one file, never one file per run
  (`test/observation.test.mjs`).
- A SurfaceSpec with an authoritative write and no subject revision throws, so no surface
  carries an ungrounded Approve action (`test/surface-spec.test.mjs`).
- Every node of a valid typed graph has a position and every edge a route after layout
  (`test/graph-viewer.test.mjs`).
