---
title: Representation Router — Index
type: Index
authority: derived
updated: 2026-11-06
topics:
  - path: README.md
    about: "overview and how to run"
  - path: SKILL.md
    about: "how agents use the router"
  - path: TAKEOVER.md
    about: "current state and history"
  - path: docs/README.md
    about: "which document owns which topic"
  - path: docs/architecture/GOAL.md
    about: "goal, thesis and what would disprove it"
  - path: docs/architecture/REQUIREMENTS.md
    about: "requirements with success and disproof"
  - path: docs/model/ARCHITECTURE.md
    about: "system model: context, parts, runtime flows"
  - path: docs/decisions/0001-disposition-refuses-silent-gaps.md
    about: "decision: refuse silent checklist gaps"
  - path: docs/decisions/0002-truth-and-writes-stay-with-the-owner.md
    about: "decision: truth and writes stay with the owner"
  - path: docs/plans/README.md
    about: "plan history"
  - path: graph-viewer/README.md
    about: "shared graph viewer"
  - path: docs/plans/graph-viewer-dense-layout.md
    about: "next plan: a dense graph never freezes the page"
  - path: docs/model/DOMAIN.md
    about: "domain glossary"
  - path: docs/ROADMAP.md
    about: "what comes next, in order"
  - path: proposals/hypergraph-views/README.md
    about: "finished plan: hypergraph views"
  - path: scripts/public-export/publish.py
    about: "public copy"
entry:
  answers: "What the Representation Router is, where its current work stands, and which file answers each question about it."
  not_when: "Choosing a view for a real page: load SKILL.md and run the router; this page only routes to sources."
  status: active
  as_of: 2026-10-25
  authority: README.md
---

# Representation Router — Index

The router picks how information is shown to a person: which view answers their question, how a
whole page reads, and whether an existing page passes the mark-level and whole-page checks. This
page is a map to the files that own each answer. It holds no facts of its own; when it disagrees
with a source below, the source wins.

## Where to look

| Question | Go here |
|---|---|
| What is it and how do I run it? | [README.md](../README.md) |
| How does an agent use it? | [SKILL.md](../SKILL.md) and `references/` |
| What is the current state, and what came before? | [TAKEOVER.md](../TAKEOVER.md) |
| Which document owns which topic? | [docs/README.md](../docs/README.md) |
| What is it for, what is the bet, and what would prove it wrong? | [docs/architecture/GOAL.md](../docs/architecture/GOAL.md); requirements with success and disproof lines: [docs/architecture/REQUIREMENTS.md](../docs/architecture/REQUIREMENTS.md) |
| How is it built and which code enforces each rule? | [docs/model/ARCHITECTURE.md](../docs/model/ARCHITECTURE.md) (context, containers, runtime flows) and its checked twin [docs/model/trace.yaml](../docs/model/trace.yaml) |
| Where are the key decisions? | [0001 disposition refuses silent gaps](../docs/decisions/0001-disposition-refuses-silent-gaps.md), [0002 truth and writes stay with the owner](../docs/decisions/0002-truth-and-writes-stay-with-the-owner.md) |
| What comes next, in order? | [docs/ROADMAP.md](../docs/ROADMAP.md) |
| What is being worked on now? | [docs/plans/graph-viewer-dense-layout.md](../docs/plans/graph-viewer-dense-layout.md) (next plan); its planning package: [review page](../proposals/planning-package/review-page/index.html), [cold review](../docs/planning/cold-review.md); history: [docs/plans/README.md](../docs/plans/README.md) |
| What are the things the router is about, and which does code implement? | [docs/model/DOMAIN.md](../docs/model/DOMAIN.md) (glossary of [docs/planning/domain.graph.json](../docs/planning/domain.graph.json)) |
| How are graphs drawn for other projects? | [graph-viewer/README.md](../graph-viewer/README.md) (shared viewer, `typed-graph/v1`) |
| Which views, writing forms and page rules exist? | `catalog/` (`representations.json`, `writing-forms.json`, `composition-heuristics.json`) |
| How is prose routed (which written form fits a reader)? | [docs/writing-router.md](../docs/writing-router.md) |
| What is the public web page that runs the router for visitors? | [public/README.md](../public/README.md); its design record: [public/DISPOSITION.md](../public/DISPOSITION.md) |
| How do projects get a planning and review page? | [docs/project-planning-review-template.md](../docs/project-planning-review-template.md); review checkpoints: [review-workbench/README.md](../review-workbench/README.md) |
| How does a chat runtime (OpenUI) get the router's answer, and was it checked against real OpenUI? | [examples/openui-check/README.md](../examples/openui-check/README.md); the graph viewer as an OpenUI component: [graph-viewer/README.md](../graph-viewer/README.md) ("In OpenUI") |
| Which alternative views replace the main view and which sit beside it? | `catalog/representation-relations.json` (reviewed and model-drafted pairs); how drafts were made and checked: [docs/evidence/relations-draft-2026-10-25/README.md](../docs/evidence/relations-draft-2026-10-25/README.md) |
| How is the page plan (marks, links, groups, click details, title) built? | [docs/composition.md](../docs/composition.md) ("Marks, links, groups and reveal come from the chosen view") |
| Which agent complaints about the router are open, and what blocks new features? | [docs/friction-ledger.json](../docs/friction-ledger.json); gate: `node scripts/friction-gate.mjs` |
| How does the public copy get made? | `scripts/public-export/publish.py` (private repository only; the public copy omits it) |

- Source-bound system-model review: [working example](../artifacts/system-model-review/index.html), [reproduction and limits](../docs/company-review-loop.md#source-bound-system-model-review).

## Recently landed (2026-10-23 to 2026-10-25)

- Self-playing clips for pages nobody can click (`playback` dynamics, `animated-explainer-clip`): PRs #121, #122.
- OpenUI connection, checked against real OpenUI with the real graph viewer: PRs #123 to #125.
- Avoid list ranked for each question: PR #126. Alternatives labelled replace/beside: PR #127.
- Page plan designed from the chosen view, link direction and short titles stated by the caller (`relationshipEnds`, `title`): PRs #128 to #131.
- Playground explainer preview: moving token, labels fit: PR #132.
- Page rule for multi-page sites (`one-page-anatomy-per-site`).

## Current work (as of 2026-11-06)

- **Dense graph layout** (proposed) — measure whether a 77-node, 464-edge graph still freezes the
  shared viewer (issue #169) and, if it does, choose the force layout by size:
  [docs/plans/graph-viewer-dense-layout.md](../docs/plans/graph-viewer-dense-layout.md).
- **Hypergraph views** finished on 2026-10-08 (every unit merged or live):
  [progress](../proposals/hypergraph-views/evidence/PROGRESS.md).

## Plans and evidence

Finished plans, each with its goal document:

- Hypergraph views: [plan](../proposals/hypergraph-views/README.md), [goal](../proposals/hypergraph-views/hypergraph-views.goal.md), [progress](../proposals/hypergraph-views/evidence/PROGRESS.md)
- Docs aligned with the wiki policy (2026-10-08): [plan](../proposals/rr-docs-wiki-entry/rr-docs-wiki-entry.md), [goal](../proposals/rr-docs-wiki-entry/rr-docs-wiki-entry.goal.md)

Dated evidence behind earlier decisions (history; each records what was tried and what it showed):

- [Sketch experiment, 2026-09-25](../docs/evidence/sketch-experiment-20260925/README.md): the first owner-approved sketch → build → acceptance loop
- [Portfolio review, 2026-09-25](../docs/evidence/portfolio-review-20260925/REPORT.md)
- [Accepted live join, 2026-09-14](../docs/evidence/g7a-accepted-live-join-20260914/README.md)
- [Approved company work graph reference, 2026-09-10](../examples/approved-references/company-work-graph-20260910/README.md)
- [Architecture provider boundary (T3B) evaluation](../docs/evidence/architecture-provider-t3b-evaluation.md)
- [Abstention complement analysis](../docs/evidence/abstention-complement-analysis-v0.md)
- [Projection and epistemic dogfood](../docs/evidence/projection-epistemic-dogfood-v0.md)
- [Company review integration history](../docs/evidence/company-review-integration-history.md)
