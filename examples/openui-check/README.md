# OpenUI check: does a model follow the router's component list?

Run 2026-10-24 against `@openuidev/react-ui` 0.18.1 / `@openuidev/react-lang` 1.0.1, installed with
`OPENUI_TELEMETRY_DISABLED=1 DO_NOT_TRACK=1 npm install --ignore-scripts`.

## What was run

Two questions with data (`src/cases.mjs`): which of four checkout variants to ship (the router picks
small multiples) and what fails when auth-db goes down (the router picks a node-link graph). Each was
sent two ways:

- **with router**: the OpenUI library cut down to the router's allowed components with OpenUI's own
  `openuiLibrary.extend({ components: { remove } })`, a `GraphViewer` custom component added where the
  router names one, and the router's instruction appended to OpenUI's generated prompt;
- **without router**: OpenUI's full 82-component library and its default prompt.

Models: `gpt-5.6-luna` and `gemini-3.1-pro-preview`, through llm_client (`runner/run.py`). Every answer
was parsed with OpenUI's parser against the library the model was given (`src/check.mjs`) and rendered
with OpenUI's `Renderer` in Chromium (`src/page.jsx`).

## Results

| | without router | with router |
|---|---|---|
| prompt size | 36,113 chars | 13,260 to 15,262 chars |
| components outside the allowed list | n/a | 0 of 6 answers |
| parse errors | 2 (gpt-5.6-luna, compare: a string for a boolean, one extra argument) | 0 |
| compare question | tabs hiding 2 of 3 metrics (Gemini), or a table plus one derived chart (GPT) | one chart per metric, side by side, in both models |
| failure question | a numbered step list in both models; no graph, OpenUI has none | `GraphViewer` with all 12 services and 12 edges in both models; failed set correct (9 fail, 3 unaffected) |

Run 1 (`evidence/run-1-router-vs-plain/`) found that the graph alone dropped the failure **order** the step
lists gave. The plan now allows one companion view from `catalog/representation-relations.json`
complements (here the handoff flow, drawn with `Steps`), leaving out views the router rejected. Run 2
(`evidence/run-2-companion-view/`): Gemini added a correct four-stage timeline beside the graph; GPT
numbered the services 1 to 6 on the graph itself (also correct). Still 0 parse errors and 0 components
outside the list.

Run 3 (`evidence/run-3-real-graph-viewer/`, 2026-10-25) swapped the stand-in for the real
`graph-viewer`, wrapped as an OpenUI component by `graph-viewer/src/openui.mjs`. Its props mirror
typed-graph/v1 (`nodes{id,label,kind}`, `edges{source,target,label}`, `legend`, `focus`), and its
description states the edge rule: every edge reads as a sentence, "source label target", in the
direction the question states. Graph question, router mode, both models:

| | gemini-3.1-pro-preview | gpt-5.6-luna |
|---|---|---|
| parse errors / components outside list | 0 / 0 | 0 / 0 |
| edges matching the question's "X depends on Y" lines | 12 of 12, 0 reversed | 12 of 12, 0 reversed |
| drawn by the real viewer | 12 boxes, 12 links | 12 boxes, 12 links |
| failed set | correct (auth-db plus 8 fail; payments, fraud-check, search-index unaffected) | correct |
| failure order | not stated (no companion view this time) | stated in a callout; correct |

`check.mjs` now compares every drawn edge with the question's stated pairs (`expectedEdges` in
`src/cases.mjs`). In run 1 the two models disagreed on direction; with the rule both agree.

One layout fix came out of the screenshot: GPT asked for a left-to-right layout, and in a 560-pixel card
the viewer wrapped that chain into loops. The model cannot see the frame, so in frames narrower than
800 pixels the component leaves the direction out and the viewer picks its best-fitting layout (its own
`layoutCandidates`); the model's direction applies only on wide frames.
Screenshot: `evidence/run-3-real-graph-viewer/openui-failure-propagation-real-viewer.png`.

First finding, fixed before these runs: the router's first map used OpenUI source folder names
(`Charts`, `MetricIndicator`), which are not components. The map now uses names read from the installed
library and lists the child parts (`Col`, `TabItem`, `StepsItem`, `Series`).

## Limits

- Two questions, two models, one answer each. This shows the mechanism works; it does not measure how
  often a model strays.
- Runs 1 and 2 used a stand-in `GraphViewer` with different prop names (`from`/`to`); their `check.json`
  files are kept as recorded and no longer re-parse against the current component. Run 3 uses the real
  viewer.
- One graph question. The edge rule is checked on "depends on" wording only.

## Rerun

```bash
cd examples/openui-check
OPENUI_TELEMETRY_DISABLED=1 DO_NOT_TRACK=1 npm install --ignore-scripts
node src/prepare.mjs runs/new                       # MODES=router to skip the control
(cd ~/code2/llm_client && uv run python <repo>/examples/openui-check/runner/run.py <repo>/examples/openui-check/runs/new openrouter/openai/gpt-5.6-luna)
node src/check.mjs runs/new
npm run build-page && python3 -m http.server -d dist  # RUN=runs/new npm run build-page for another run
```

Cost: runs 1 and 2 $0.21 (12 calls); run 3 $0.036 (2 calls).
