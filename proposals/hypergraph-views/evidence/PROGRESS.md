# hypergraph-views progress (evidence index; the adopted README is left unchanged so its receipt stays valid)

| Unit | State | Where | Evidence here |
|---|---|---|---|
| H1 router catalog | merged 2026-10-07 | representation-router #85 (3d6b1bd) | h1-router-npm-test-2026-10-07.txt |
| H2 viewer hubs (typed-graph/v1 `hyperedges`, 0.5.0) | merged 2026-10-07 | representation-router #86 (4790de4) | h2-router-npm-test-2026-10-07.txt, h2-browser-two-facts.png, h2-h4-browser-runs.txt |
| H3 DoDAF whole-model fact hub view | live 2026-10-07 | dodaf #481 (ea82ac5), release record #482 (dodaf-mock-ea82ac5, 1320/1320 byte audit) | live check PASS: 131 hubs, "2 separate pieces", 0 console errors (dodaf ui/registry.yaml) |
| H4 viewer layout for hub graphs | 0.6.0 ELK stress merged (#87, #88), then replaced by 0.7.0 d3-force (#89, f794fc7) | representation-router | h4-router-npm-test-2026-10-07.txt (0.6.0), h4-router-npm-test-force-2026-10-07.txt (0.7.0), h4-browser-dm2-stress.png, h4-build_dm2_hubs.py |
| H4 DM2 metamodel view in the demo | live 2026-10-07 | dodaf #486 (2b0b5ac), release record #487 (dodaf-mock-2b0b5ac, 1321/1321 byte audit) | live: 86 hubs, 71 types, 173 roles, "10 separate pieces as hubs alone, 4 with is a kind of", search lights matches, 0 console errors; fitted view is an unreadable cloud, readable after three zoom steps (security-markings cluster stays crowded) |
| H5 recipe-built views | live 2026-10-07 | dodaf #488 (2793ee4), #489 (25d7625), release record #490 (dodaf-mock-25d7625, 1323/1323 byte audit, worker 4b9bc9e2) | h5-worker-tail-2026-10-07.txt, h5-worker-tail-first-deploy-2026-10-07.txt, h5-openrouter-generations-2026-10-07.json, h5-live-run-2026-10-07.json, h5-gfql-crosscheck-2026-10-07.txt, h5-dodaf-checks-2026-10-07.txt, h5-browser-checks-2026-10-07.txt, h5-live-desktop.png, h5-live-phone.png |

## Uncertainties answered
- Date participants and the Sendai piece: measured on the published payload, hubs alone give 3 pieces; adding exact-date and place
  participants as notes gives 3; linking the three "Yokota Air Base" place notes to the Yokota Air Base entity gives 2. Dates do not
  join Sendai; no source yet links it.
- Hub readability at DM2 size: layered layout fits 86 hubs at scale 0.22 (an unreadable column); ELK stress fits at 0.33 but took
  61 s on the DoDAF facts graph (52 s placing unused edge labels; 9 s without). d3-force (0.7.0): 0.66 s on the facts graph (225
  boxes) and 0.49 s on DM2 (157), no overlapping boxes, scale 0.42 and 0.51; live it draws in 0.9-3.8 s in Chromium.

- How much the agent's recipes need constraining (H5): on the first deploy (2793ee4) 1 of 3 live questions returned a recipe.
  After the guide gained the paths through one fact, the roles each thing fills, "undirected" role edges and short chains
  (PR #489), the live release 25d7625 returned 5 recipes for 5 questions: 4 validated and drew (4, 3, 4 and 2 facts), 1 was
  refused because it selected no facts (it joined performing_performer to consumed_resource through one fact). 1 in 5
  refused, under the plan's 1-in-3 disproof line. A schema refusal (role "commander_of", and hops 3) was shown through the
  live api/check-recipe endpoint. 8 logged generations cost $0.00405 in all.

## H5 recipe format (prior art, 2026-10-07)
Adopt a subset of Graphistry GFQL's JSON wire protocol (Chain, Node filter, Edge type match, hops <= 2; graphistry/pygraphistry,
BSD-3, release 0.59.1 2026-10-03, docs/source/gfql/spec/wire_protocol.md) with facts as nodes and roles as `role:<name>` edges.
Build only: a JSON Schema generated from the model's types, a small JS executor for the subset, and the result-to-viewer mapper
with the custom label and the recipe in words. Wrong if: test recipes run through pygraphistry and our executor return different
fact sets. Checked 2026-10-07: 5 recipes, identical node and edge sets (h5-gfql-crosscheck-2026-10-07.txt).
