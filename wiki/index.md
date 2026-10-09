---
title: Representation Router — Index
type: Index
authority: derived
updated: 2026-10-08
topics:
  - path: README.md
    about: "overview and how to run"
  - path: SKILL.md
    about: "how agents use the router"
  - path: TAKEOVER.md
    about: "current state and history"
  - path: docs/README.md
    about: "which document owns which topic"
  - path: docs/plans/README.md
    about: "plan history"
  - path: graph-viewer/README.md
    about: "shared graph viewer"
  - path: proposals/hypergraph-views/README.md
    about: "current plan: hypergraph views"
  - path: scripts/public-export/publish.py
    about: "public copy"
entry:
  answers: "What the Representation Router is, where its current work stands, and which file answers each question about it."
  not_when: "Choosing a view for a real page: load SKILL.md and run the router; this page only routes to sources."
  status: active
  as_of: 2026-10-08
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
| What is being worked on now? | [docs/plans/README.md](../docs/plans/README.md) (history) and `proposals/` (current plans) |
| How are graphs drawn for other projects? | [graph-viewer/README.md](../graph-viewer/README.md) (shared viewer, `typed-graph/v1`) |
| Which views, writing forms and page rules exist? | `catalog/` (`representations.json`, `writing-forms.json`, `composition-heuristics.json`) |
| How is prose routed (which written form fits a reader)? | [docs/writing-router.md](../docs/writing-router.md) |
| What is the public web page that runs the router for visitors? | [public/README.md](../public/README.md); its design record: [public/DISPOSITION.md](../public/DISPOSITION.md) |
| How do projects get a planning and review page? | [docs/project-planning-review-template.md](../docs/project-planning-review-template.md); review checkpoints: [review-workbench/README.md](../review-workbench/README.md) |
| How does the public copy get made? | `scripts/public-export/publish.py` (private repository only; the public copy omits it) |

- Source-bound system-model review: [working example](../artifacts/system-model-review/index.html), [reproduction and limits](../docs/company-review-loop.md#source-bound-system-model-review).

## Current work (2026-10-08)

- **Hypergraph views** — draw facts that join several things in named roles as one hub with
  labelled spokes, in the shared graph viewer and the router. Plan and progress:
  [proposals/hypergraph-views/README.md](../proposals/hypergraph-views/README.md).

## Plans and evidence

Current plans, each with its goal document:

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
