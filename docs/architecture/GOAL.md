---
description: What the Representation Router is for, the bet behind it, what would disprove it, and where it came from
---

# Representation Router: goal and thesis

## Introduction and Goals

The router helps an agent pick how information is shown to a person: given the
authoritative model that owns the facts and the concrete question the person must answer,
it recommends which view answers that question (graph, matrix, table, sequence, timeline,
explainer, composite surface), how the whole page should read, which implementation fits,
and which checks the built page must pass. It never owns the facts it presents
([README.md](../../README.md), "The model is the truth").

### Requirements Overview

The requirements, each with a success criterion and a disproof condition, are in
[REQUIREMENTS.md](REQUIREMENTS.md): deterministic, explainable recommendations from a
validated use case (REQ-RR-001), refusing a view whose semantics are unavailable
(REQ-RR-002), refusing silently skipped checklist items (REQ-RR-003), working surfaces that
cannot grant write authority by rendering a control (REQ-RR-004), one shared graph viewer
with a published input contract (REQ-RR-005), and writing records whose passes are backed
by quotes from the draft (REQ-RR-006). The rules that enforce them, with owners and tests,
are in the system model ([ARCHITECTURE.md](../model/ARCHITECTURE.md),
[trace.yaml](../model/trace.yaml)).

### Quality Goals

- No fabricated view: when the needed semantic view is unavailable, every candidate
  representation is rejected rather than drawn plausibly (README "Important invariants";
  `src/router.mjs`).
- A gap is visible, never silent: every checklist item a recommendation names needs an
  explicit satisfied, not-applicable or skipped line with a reason
  ([Decision 0001](../decisions/0001-disposition-refuses-silent-gaps.md)).
- Representation never becomes authority: a rendered Approve button grants nothing; an
  authoritative write needs a revision-bound authority contract from the consuming product
  ([Decision 0002](../decisions/0002-truth-and-writes-stay-with-the-owner.md)).
- Heuristics are hypotheses: scores and weights are advisory, and the builder must justify
  the chosen representation in their own words when alternatives existed
  ([docs/composition.md](../composition.md)).

### Stakeholders

- Brian, who reads the pages built through the router and approves sketches before a build
  ([TAKEOVER.md](../../TAKEOVER.md), sketch → approval → build → parity disposition).
- Coding agents (Claude Code and Codex) that load [SKILL.md](../../SKILL.md), run
  `npm run recommend` and `npm run disposition` while building a page.
- Consuming projects that render the recommended views: Company Planning review pages
  ([docs/company-review-loop.md](../company-review-loop.md)), the weekly-review workbench,
  projects that vendor the shared graph viewer (first consumer: the DoDAF demo on
  brianmills.dev), and the public page in `public/`.

## North star (AES extension)

A person looking at any page an agent built for them can answer the question the page
exists for (what is supposed to happen, what depends on what, what was built, what evidence
exists, what still needs their judgment) from the page alone, because the view was chosen
for that question from the owning source rather than laid out by habit (README, "How
Representation Router supports planning and review").

## Thesis (AES extension)

Pages stay useful and honest when the choice of representation is made explicitly, before
any library is chosen, from the question and the owning source, and when every view is a
projection over truth that lives where it is edited (AES-CTX-004, "truth lives where it is
edited"): the router reads the source model and the use case, recommends, and names its
checks, but never copies or owns the facts, the planning state or the write. Making the
checklist explicit and refusing silent omissions turns "looks finished" into lines a
reviewer can falsify.

## Thesis disproof (AES extension)

Pages built through the router and dispositioned against its checklist draw the same
owner rejections or reviewer findings as pages built without it (for example the faults a
recommendation named reappear in a page whose disposition marked them satisfied); or
consuming projects keep hand-rolling the views the router covers (graph pages written
instead of vendoring `graph-viewer/`) because the recommendations do not fit their real
questions; or a page built through the router shows a view the owning source could not
support.

## Non-goals

- Owning domain semantics, planning state, implementation truth, evidence custody,
  workflow authority, persistence, authorization, deployment state or external effects
  (README, first section; [docs/INTEGRATION_POSITION.md](../INTEGRATION_POSITION.md)).
- Becoming the planning system: it consumes planning sources and produces projections only.
- Absorbing proving applications into the reusable core without repeated independent
  evidence ([docs/core-reference-boundary.md](../core-reference-boundary.md)); new surfaces
  need a consumer that asks for them (Consolidation v0 stop rule, TAKEOVER.md).
- Verifying that a claimed "satisfied" check is true; that stays a human or review-pass job
  ([Decision 0001](../decisions/0001-disposition-refuses-silent-gaps.md)).

## Lineage (AES extension)

Lineage (AES extension): none -- original. The repository began 2026-09-07 (root commit `b9968b6`,
"Initial commit") and neither README.md, TAKEOVER.md nor docs/README.md names a predecessor
it replaces. Drawn from: README.md, TAKEOVER.md, SKILL.md, docs/INTEGRATION_POSITION.md,
docs/core-reference-boundary.md, docs/composition.md and the source under `src/`.
