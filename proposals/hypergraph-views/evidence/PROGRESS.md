# hypergraph-views progress (evidence index; the adopted README is left unchanged so its receipt stays valid)

| Unit | State | Where | Evidence here |
|---|---|---|---|
| H1 router catalog | merged 2026-10-07 | representation-router #85 (3d6b1bd) | h1-router-npm-test-2026-10-07.txt |
| H2 viewer hubs (typed-graph/v1 `hyperedges`, 0.5.0) | merged 2026-10-07 | representation-router #86 (4790de4) | h2-router-npm-test-2026-10-07.txt, h2-browser-two-facts.png, h2-h4-browser-runs.txt |
| H3 DoDAF whole-model fact hub view | in progress (worker) | dodaf | release record will be in dodaf ui/registry.yaml |
| H4 viewer stress layout (0.6.0) | merged 2026-10-07 | representation-router #87 (210d633), README figure #88 | h4-router-npm-test-2026-10-07.txt, h4-browser-dm2-stress.png, h4-build_dm2_hubs.py |
| H4 DM2 metamodel view in the demo | not started | dodaf | |
| H5 recipe-built views | prior art done | | recommendation below |

## Uncertainties answered
- Date participants and the Sendai piece: measured on the published payload, hubs alone give 3 pieces; adding exact-date and place
  participants as notes gives 3; linking the three "Yokota Air Base" place notes to the Yokota Air Base entity gives 2. Dates do not
  join Sendai; no source yet links it.
- Hub readability at DM2 size: layered layout fits 86 hubs at scale 0.22 (an unreadable column); the stress layout fits at 0.33 with
  separated islands. Readable with zoom; the security-markings cluster (about 20 relations on one type) stays dense.

## H5 recipe format (prior art, 2026-10-07)
Adopt a subset of Graphistry GFQL's JSON wire protocol (Chain, Node filter, Edge type match, hops <= 2; graphistry/pygraphistry,
BSD-3, release 0.59.1 2026-10-03, docs/source/gfql/spec/wire_protocol.md) with facts as nodes and roles as `role:<name>` edges.
Build only: a JSON Schema generated from the model's types, a small JS executor for the subset, and the result-to-viewer mapper
with the custom label and the recipe in words. Wrong if: test recipes run through pygraphistry and our executor return different
fact sets.
