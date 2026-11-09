---
plan_id: graph-viewer-dense-layout
status: proposed
issue: https://github.com/brianmills-spec/representation-router/issues/169
---

# Graph viewer: a dense graph never freezes the page

Planning package: docs/planning/planning-package.json

## Why this is next

Hypergraph views, the plan the documentation called current until 2026-11-06, is finished: every
unit is merged or live (`proposals/hypergraph-views/evidence/PROGRESS.md`). The most consequential
open issue is #169: with no layout given, the shared viewer ran ELK on the page's only thread, and a
77-node, 464-edge graph took about 16 s per layout and re-ran on every update, freezing
world-substrate's World Builder page. Every project that vendors `graph-viewer/dist/graph-viewer.js`
meets graphs of that size. Commit a916ccd (#170) since switched graphs over 60 nodes or 120 edges to
fast ELK settings (`graph-viewer/src/model.mjs:110`), but its own comment records about 2 s per
layout on a 127-box, 246-link graph (`:104-107`), so ELK on the main thread still misses the bar
below (open question Q1, resolved by that argument).

## What counts as a freeze

At most 250 ms of main-thread time per layout, and no new layout on an update whose nodes and edges
did not change (open question Q9, resolved: issue #169 measured the force layout at 0.11-0.23 s on
all its graphs and world-substrate's switch to force ended the freeze; the RAIL model's 100 ms line
needs layout off the main thread and is out of this plan).

## Steps

1. **Baseline.** In headless Chromium, load the current `dist/graph-viewer.js`, render one generated
   graph of 77 nodes and 464 edges with `layout: {}`, and time the layout and one unchanged
   `update`. Save the timing as `docs/plans/graph-viewer-dense-layout.evidence.txt`; the done-when
   compares against it.
2. **Force by size.** When the caller gives no layout, choose the force layout above the size
   threshold (the world-substrate workaround, made general) and keep ELK for smaller graphs; skip the
   layout on an update that changes no node or edge. Add tests in `test/graph-viewer.test.mjs` for
   both, and a 390 px-wide `update()` test with the force layout, since open issue #143 reports NaN
   edge paths there and this change makes force the default for large graphs. Bump the viewer's
   minor version and rebuild `dist/`.
3. Add a `Makefile` whose `check` runs `npm test` (the first code2-format item, open question Q3),
   run it and the browser timing again, and merge with `ship`.
4. Tell world-substrate in its issue #311 that the fix is in the shared viewer and which version to
   re-vendor; its own size switch can then go. The re-vendoring is that repository's change.

## Done when

The saved timing shows #169's graph, against the baseline, laid out within 250 ms of main-thread time and an unchanged
update with no new layout, on the merged viewer; `make check` exits 0; issue #169 is closed with
that evidence and world-substrate#311 names the version to re-vendor.

## Not in this plan

Moving ELK into a web worker (only if force by size proves wrong for some graph), issues #149
(grouped layout) and #167 (cross-document links).

## Domain concepts it relies on

`graph-viewer`, `large-graph-layout`, `force-by-size`, `typed-graph` (docs/model/DOMAIN.md).

## Cost

No AI steps: a local browser timing and a code change.
