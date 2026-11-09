---
description: What comes next for the Representation Router, in order, with the plan that holds each step
---

# Roadmap

The order of the next work, as of 2026-11-06. Each step links the plan or issue that owns it; the
open questions behind the order are in the planning package
([review page](../proposals/planning-package/review-page/index.html),
[ledger](planning/open-questions.json)).

1. **A dense graph never freezes the page** (issue #169):
   [docs/plans/graph-viewer-dense-layout.md](plans/graph-viewer-dense-layout.md). First because
   every project that vendors the shared graph viewer meets graphs of that size.
2. **Phone fixes in the graph viewer**: a tooltip stays after a tap (#163), NaN edge paths after
   `update()` at 390 px with force layout (#143), styled tooltips for zoom controls (#113).
3. **Bigger maps**: grouped layout by kind (#149), links between claims in different documents
   (#167), onto-canon6's n-ary role format (#96).
4. **Router coverage**: native-web card and narrative views measured on their own (#159); the
   public export failure (#91).

Finished plans and their evidence: [docs/plans/README.md](plans/README.md) and
[proposals/hypergraph-views/](../proposals/hypergraph-views/README.md).
