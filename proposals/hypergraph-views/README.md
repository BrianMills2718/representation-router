---
plan_id: hypergraph-views
status: shaping
selected_path: coordinated
planning_path_decision: proposals/hypergraph-views/planning-path-decision.json
method_conformance_receipt: proposals/hypergraph-views/method-conformance-receipt.json
review_page: proposals/hypergraph-views/review-page/hypergraph-views-plan.html
goal:
  outcome: any project whose facts join more than two things in named roles is drawn without breaking them into pairs, through the shared graph viewer and the Representation Router; the DoDAF demo shows its model and the whole DM2 metamodel that way, and a reader or the agent can build a custom view from a checked recipe
  canonical_example: the DoDAF fact "Matthew Perry transferred 45 pallets to Shiloh on 23 March near Hachinohe" is one hub with spokes to Matthew Perry, Shiloh, the pallets, Hachinohe and 23 March, so it connects to the Hachinohe port clearance; the whole DoDAF model drawn that way is 2 connected pieces or fewer, not 7
  forbidden_substitutes: a hand-rolled per-project viewer; a picture that draws hubs but drops place or date into edge notes; a custom view labelled with a standard DoDAF code; a recipe drawn without checking it against the model's types
  boundaries: shared viewer changes are additive to typed-graph/v1 (existing graphs render unchanged); DoDAF model changes only promote place, date and quantity that the cited passages already state; the DoDAF repository stays parked apart from the demo
  done_when: 'the shared viewer renders a typed-graph with hyperedges as hubs with role-labelled spokes (tests and a browser check); the router routes a hypergraph use case to relation-hub-graph and applies keep-n-ary-relations-whole (tests); the live DoDAF demo has a whole-model hub view whose piece count is measured and stated, a DM2 metamodel hub view built from onto-canon6''s dm2_complete pack, and an agent that answers a question with a recipe-built view labelled custom (live checks)'
  do_not_gate_on: Brian's review of the plan page; migrating other projects (scientific-hypergraph, onto-canon6) onto the shared viewer
  owner: claude-code session dd8590c4
---

# Hypergraph views: draw n-ary facts whole, everywhere

## Who it serves, the result, one example

**Actor:** Brian, readers of his public demos, and every agent that builds a graph view for one
of his projects.

**Result:** facts that join several things in named roles (who did what, to what, where, when,
from which source) are drawn as one mark with labelled spokes instead of being split into pairs.
The graph then stays connected where the facts connect.

**Example (measured 2026-10-07 on the DoDAF demo's published model, 131 relations):**

| Drawing | Disconnected pieces |
|---|---:|
| pairs (today) | 7 |
| one hub per relation, role spokes | 3 |
| hub plus a place participant | 2 (the remaining piece is the Sendai effort) |

## Brian's direction

- 2026-10-07: "i think we kind of do need n-ary role typed because the binary edges are causing what
  should be a unified graph to be broken up into isolated subgraphs"; "i was kind of expecting
  something more like what i have for scientific hypergraph repo".
- 2026-10-07: "on the interactive part i was thinking maybe like the user/ai could build views in
  real time?"; "this will probably be ai powered where the user asks questions and the ai delivers
  views for basic users".
- 2026-10-07: "ok can you see if represnetation router should be updated for general proejcts that
  need these capabiltiies" then "i approve".

## What exists, and what this plan does with it

| Existing piece | Where | Disposition |
|---|---|---|
| Hub layout: relation instance as a box with role-labelled spokes, layered columns | scientific-hypergraph `wiki/reference/metamodel/hypergraph-viewer-*.js` | **reuse the approach** inside the shared viewer; not a second viewer |
| Shared graph viewer (React Flow + ELK, typed-graph/v1: nodes, edges) | representation-router `graph-viewer/` | **extend**: add `hyperedges` (type, roles to node ids), drawn as hubs |
| Role-typed assertions (`roles: {role: [fillers]}`; 5 of 131 already have three roles) | dodaf semantic IR and surface payload | **reuse**; promote place, date and quantity from annotations to role fillers |
| DM2 2.02 as data: 193 entity types, 86 relation types, 173 roles with expected types, 204 subtype links | onto-canon6 `ontology_packs/dm2_complete/2.2.0/` | **reuse** as the metamodel hub view's input |
| View recipes (selection, grouping, shape) as a registry | dodaf `semantic_authority/projections.py` | **reuse** the shape for recipe-built views |
| Router catalog: 26 representations, none for hypergraphs | representation-router `catalog/` | **extend**: relation-hub-graph, paoh-hypergraph, upset-plot; hypergraph structure; three heuristics; recipe-built-views pattern (ready as a tested patch) |

**Ownership searched (2026-10-07):** `project-meta/PROJECT_GRAPH.json` and the coordination claims for
representation-router (1 active claim: this plan's own lane), dodaf (none), onto-canon6 (4, none on views or
the DM2 pack) and scientific-hypergraph (none). Representation Router owns the shared viewer and the
catalog; dodaf owns its demo; nobody else owns hub drawing.

**Internal lineage searched:** the ideas register `vision/legacy/project-meta-vision/ARCHITECTURAL_IDEAS.md`
for hypergraph, hyperedge, n-ary and role-typed:

| Earlier work | Disposition |
|---|---|
| onto-canon6 "n-ary assertions with role-preserving projection" (assertion node plus role edges; `docs/topics/views/n-ary-assertion-model.md`) | **reuse** as the hyperedge encoding in typed-graph/v1: a fact is a node of kind relation with role-labelled edges |
| onto-canon6 "projection-scoped loss accounting" (`make kg-conformance`) | **reuse** the idea: each view states what it flattens; the piece count is that statement for the hub view |
| dodaf "dual graph surfaces" (`thin/corpus.py`, ADR 0006: an evidence surface keeping n-ary role edges beside a readable surface) | **extend**: H3 draws from this existing evidence surface instead of adding a new one |
| sb_ontologies "model type selection through parallel detectors" (property_graph, hypergraph, ...) | **bounded exception**: representation choice stays in the Representation Router's routing; not used |
| agent_ontology "typed hypergraph with code generation" | **bounded exception**: different domain (agent architectures); nothing to reuse here |

**What was searched externally:** the two repositories above for hub and hypergraph rendering; the router catalog
for hypergraph, hyperedge, n-ary, incidence and bipartite entries (none); published methods:
Fischer et al. (2021, IEEE VIS, survey of hypergraph visualizations), Valdivia et al. (2021, IEEE
TVCG, PAOH), Lex et al. (2014, IEEE TVCG, UpSet), Shen et al. (2021, IEEE TVCG, natural-language
interfaces to visualization). Dispositions, one per candidate:

| Candidate | Disposition |
|---|---|
| Relation-as-hub drawing (scientific-hypergraph viewer; incidence drawing in the survey) | **reuse** the approach in the shared viewer |
| PAOH (Valdivia et al. 2021) | **compose**: catalogued as a router view type for many or changing facts; not built in this plan |
| UpSet (Lex et al. 2014) | **compose**: catalogued as a router view type for unordered co-occurrence; not built in this plan |
| Hypergraph visualization survey (Fischer et al. 2021) | **reuse** as the routing guidance for choosing among the three forms |
| Natural-language interfaces to visualization (Shen et al. 2021) | **reuse** as the pattern for question-built views (H5) |
| Shared graph viewer | **extend** (hyperedges added) |
| DoDAF projection registry | **extend** (recipe-built views use its selection, grouping and shape) |

## Authority and non-goals

**Authority:** Brian (directions quoted above). Owners of the touched pieces: Representation Router
(`representation-router`: catalog and shared graph viewer), the DoDAF demo (`dodaf`: model export,
demo page, agent worker), onto-canon6 (read only: its DM2 pack is input data).

**Non-goals:**
- No second graph viewer; scientific-hypergraph's code is a reference for the hub approach, not copied.
- No migration of scientific-hypergraph, onto-canon6 or other projects onto the shared viewer in this plan.
- No new facts in the DoDAF model: place, date and quantity are promoted only where a cited passage
  already states them.
- No free-form agent drawing: recipe-built views draw only what a checked recipe selects from the model.

## Success, and what would disprove it

**Success:** the live whole-model hub view on brianmills.dev/dodaf-mock/ states a measured piece count
of 2 or fewer for the 131 facts (7 as pairs today); the shared viewer's existing graphs render unchanged;
a hypergraph use case routes to relation-hub-graph; three live questions each return a checked,
labelled custom view.

**Disproof:** the approach is wrong if, after H3, the hub view still shows more than 3 pieces (place and
date did not unify the facts), or if hubs at DM2's size are unreadable at 1440px with no filter that
fixes it (then PAOH or a matrix replaces the hub graph for the metamodel), or if more than 1 in 3 of
the agent's recipes is refused (the recipe language is too loose for the agent).

## Full-trace review

Each acceptance check is judged from the whole run, not its final line:
- H1, H2: the router and viewer test runs (full output with counts and exit status, saved under
  `proposals/hypergraph-views/evidence/`), plus the headless-browser run that renders the three-role
  fixture, whose screenshot and console log are kept beside it.
- H3, H4: the release run: build log, the per-file byte audit of the live site and the browser run's
  console and screenshot, recorded in dodaf `ui/registry.yaml` as for every demo release.
- H5: the worker's request log (`npx wrangler tail brian-dodaf-mock`: one line per question with model,
  generation id, usage, latency, recipe validity and refusal reason), captured to
  `proposals/hypergraph-views/evidence/h5-worker-tail-<date>.txt`, with the OpenRouter generation record
  for each logged generation id saved beside it (the worker calls OpenRouter directly, not through the
  shared Python client); read end to end for each of the three live questions and the refused recipe.

## Model calls (H5)

**Call graph:** one model call per reader question, from the demo's worker, through the existing
OpenRouter route (`deepseek/deepseek-v4-flash`, the same call the agent makes today). **Structured
result:** JSON with the answer text, cited passage ids and an optional view recipe (relation types,
roles, filters, grouping); the worker validates the recipe against the published model's types before
the page draws it, and drops anything that does not validate, logging why. **Tracing:** the worker logs
one line per call (model, usage, latency, recipe valid or refused with reason); no call is retried on
failure. **Spend and provider authority:** Brian's standing rule that provider-unspecified model work runs
on his OpenRouter route; cost stays at the current ~$0.001 per question. **Promotion condition:** the
recipe-built view is switched on for readers only after one authentic traced run in which a live
question returns a recipe that validates and draws, and an invalid one is refused with its reason.

## Deployment boundary

The plan deploys Brian's own demo (brianmills.dev/dodaf-mock/). Authority: the workspace rule that his
own sites deploy without a yes when nothing private is published. Containment: every release is built
from an exact git revision, byte-audited and browser-checked, and recorded; rollback is redeploying the
previous recorded release. The shared viewer change is additive (typed-graph/v1 without hyperedges
renders as before), so other projects are unaffected until they opt in.

## Parallel-implementation check

After H2, search every repository's tracked files for a second hub or hyperedge renderer (hypergraph,
hyperedge, relation-hub) outside representation-router `graph-viewer/` and scientific-hypergraph's
reference viewer; any new one is a defect. The DoDAF demo's test asserts it draws hubs only through
`GraphViewer.mount`.

## Work units

| ID | Change | Where | Done when |
|---|---|---|---|
| H1 | Router catalog: hypergraph structure, three representations, three heuristics, recipe-built-views pattern | representation-router | router tests pass; a hypergraph use case routes to relation-hub-graph and lists keep-n-ary-relations-whole |
| H2 | Shared viewer draws `hyperedges` as hubs with role-labelled spokes; additive to typed-graph/v1 | representation-router `graph-viewer/` | existing graphs render unchanged (tests); a fixture with a three-role fact renders one hub and three labelled spokes in a real browser |
| H3 | DoDAF: place, date and quantity become role participants; whole-model hub view in the demo | dodaf | the published model has those participants; the live view states its piece count (target: 2 or fewer); release audited and recorded |
| H4 | DM2 metamodel hub view from onto-canon6's pack | dodaf demo (data from onto-canon6) | the live view shows the 86 relation types as hubs with their 173 typed roles, searchable |
| H5 | Recipe-built views: the agent answers a question with a view recipe, checked against the model's types, drawn, labelled custom | dodaf demo and its worker | three live questions each produce a checked custom view; an invalid recipe is refused with its reason |

Order: H1 and H2 first (they serve every project), then H3, H4, H5. Each lands and is checked on its own.

## Uncertainties

| Uncertainty | Owner | Evidence that resolves it |
|---|---|---|
| Whether a date participant joins the Sendai piece | the implementing session (integration owner) | H3's measured piece count with and without dates |
| Whether hubs stay readable at DM2's size (86 hubs, 193 types) | the implementing session | H4 in a real browser at 1440px and 390px; fall back to PAOH or a filtered start if not |
| How much the agent's recipes need constraining | the implementing session | H5's refused-recipe count over its live checks |

## Irreversible actions and spend

**Irreversible actions:** none. Every change is a revertable commit, the viewer format change is
additive, and each demo release can be rolled back by redeploying the previous recorded release.

**Spend:** model calls for H5 only, on the demo agent's existing call.
- Boundary: one call per reader question, at about $0.001 each; no new paid service.
- Authorizer: Brian's standing rule that provider-unspecified model work runs on his OpenRouter route
  (workspace rules, "LLM and durable contracts").
- Containment: the worker logs usage per call; more than $5 in one week, or more than $1 in one day,
  is reported to Brian as a needs-reply before the feature stays on; the existing OpenRouter key limit
  caps the worst case.

## Activation facts

`activation-facts.json` declares, for this exact plan revision:
- `shared_mechanism` = true: the shared graph viewer's format and the router's catalog are used by every project.
- `llm_central` = true: H5's recipe-built views depend on the demo agent's model call.
- `empirical_comparison_proposed` = false: no A/B test or benchmark is proposed; piece counts are
  measurements of one design against its own target.
- `irreversible_or_spend_action` = true: nothing is irreversible, but H5 spends on a model call per
  question (bounded, authorized and contained as described above).
