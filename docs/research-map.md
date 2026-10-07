# Research map

Representation Router sits at the intersection of visualization recommendation, model-based systems engineering, architecture description, graphical editors, and explorable explanations.

These references are starting points for extracting rules, abstractions, and implementation ideas. They are inspiration and prior art, not project dependencies.

## Visualization recommendation and task abstraction

- **Draco / Draco 2** — constraint-based visualization design and ranking: https://github.com/cmudig/draco2
- **CompassQL** — enumeration and ranking behind Voyager-style visualization recommendation: https://github.com/vega/compassql
- **Voyager** — visualization exploration/recommendation UX: https://github.com/vega/voyager
- **Brehmer & Munzner task typology** — WHY / WHAT / HOW abstraction: https://www.cs.ubc.ca/labs/imager/tr/2013/MultiLevelTaskTypology/
- **Munzner Nested Model** — domain problem → abstraction → encoding/interaction → algorithm: https://www.cs.ubc.ca/labs/imager/tr/2009/NestedModel/
- **FT Visual Vocabulary** — communication-goal-to-chart-family guidance: https://github.com/Financial-Times/chart-doctor/tree/main/visual-vocabulary
- **From Data to Viz** — data-shape-to-visualization decision guidance: https://www.data-to-viz.com/

## General UX patterns and heuristics

- **GOV.UK Design System patterns** — task-oriented patterns with “when to use” and “when not to use” guidance: https://design-system.service.gov.uk/patterns/
- **Nielsen heuristics** — general usability principles: https://www.nngroup.com/articles/ten-usability-heuristics/

A long-term goal is to make UX pattern selection as explicit and machine-readable as visualization recommendation.

## Formal models, viewpoints, and architecture description

- **OMG UML**: https://www.omg.org/uml/
- **SysML v2 / KerML** — semantic modeling plus view/viewpoint concepts: https://www.omg.org/sysml/sysmlv2/
- **ISO/IEC/IEEE 42010** — architecture description, viewpoints, views, concerns, and stakeholders: https://www.iso.org/standard/74393.html
- **Eclipse Sirius / Sirius Web** — semantic-model-to-viewpoint-to-representation workbench: https://eclipse.dev/sirius/
- **Capella / Arcadia** — model-based systems architecture and viewpoint-driven engineering: https://mbse-capella.org/
- **Papyrus** — UML/SysML graphical modeling workbench: https://eclipse.dev/papyrus/
- **Structurizr / C4** — one architecture model projected into multiple architecture views: https://github.com/structurizr

These systems reinforce the principle that a diagram should be a view of a semantic model rather than the canonical model itself.

## Graphical editor infrastructure

- **Eclipse GLSP** — language-server-style infrastructure for web graphical editors: https://github.com/eclipse-glsp/glsp
- **React Flow** — node-based interactive application toolkit: https://reactflow.dev/
- **Cytoscape.js** — graph analysis and visualization: https://js.cytoscape.org/
- **tldraw** — programmable interactive canvas: https://github.com/tldraw/tldraw
- **Graphviz** — automatic graph layout: https://graphviz.org/
- **ELK** — graph layout algorithms and infrastructure: https://www.eclipse.org/elk/

## Dynamic visualization and explorable explanations

- **Observable Framework / Plot / Inputs** — reactive data apps and interactive explanations: https://observablehq.com/framework/
- **D3** — visual encoding, layout, interaction, and animation primitives: https://d3js.org/
- **Scrollama** — scrollytelling interaction infrastructure: https://github.com/russellsamora/scrollama
- **Brian Mills portfolio** — interactive evidence networks, linked qualitative analysis, and step-through simulations: https://brianmills.dev/portfolio/

## Questions to turn into explicit rules

1. When does a node-link graph stop being useful, and what should replace it?
2. When should a user see one view versus coordinated multiple views?
3. Which tasks benefit from persistent selection rather than hover?
4. When does animation communicate causality or state change, and when is it decoration?
5. Which model changes should be directly manipulable in the visualization?
6. What provenance must remain reachable from every visual claim?
7. Which viewpoint conventions should be standardized and reusable?
8. How should accessibility constraints alter representation ranking rather than merely styling the final renderer?
9. When should the router recommend an explorable explanation or simulation instead of a conventional diagram?
10. Which heuristics can be supported by empirical evidence versus domain convention?

## Off-the-shelf candidates to evaluate (2026-09-25)

These are **candidates** from a cross-repo review, not decisions. The references above are cited as inspiration; unless a row says otherwise, none has been evaluated here as a replacement, dependency, or grounding for the named part of this repo.

| What in this repo | Established candidate | What it could replace or ground | Status | Source |
|---|---|---|---|---|
| `src/router.mjs` scoring + `heuristics/core.json` (hand-authored weights, described there as "hypotheses to test") | Draco 2 (constraint-based design knowledge with weights that can be learned from ranked pairs) | Ground the hard-constraint/soft-weight split and fit weights from recorded dispositions instead of hand-tuning | Cited above and as the analogy in [`design-model.md`](design-model.md) ("Hard vs. soft rules"); not yet evaluated as a weight-learning method or dependency. Draco targets Vega-Lite charts, while this catalog covers diagrams and interfaces, so grounding is likelier than replacement | https://github.com/cmudig/draco2 |
| `src/recommend-cli.mjs` / `src/agent-recommendation.mjs` candidate enumeration and ranking | CompassQL (query-based enumeration and ranking behind Voyager) | Ground how partial specifications are enumerated and ranked | Cited above; not yet evaluated. Chart-scoped (Vega-Lite), so a design reference rather than a drop-in | https://github.com/vega/compassql |
| `schemas/use-case.schema.json` `intent` and `tasks` enums (custom vocabulary: inspect, compare, lookup, locate, trace, ...) | Brehmer & Munzner multi-level task typology (why / what / how) | Map or align the task vocabulary to an established typology so the enums have a citable definition | Typology cited above; the enums have not been mapped to it | https://www.cs.ubc.ca/labs/imager/tr/2013/MultiLevelTaskTypology/ |
| ViewSpec `concern` + `viewpoint.stakeholder` (`schemas/view-spec.schema.json`, `src/router.mjs`), and open question 6 "Viewpoint reuse" in [`design-model.md`](design-model.md) | ISO/IEC/IEEE 42010 conceptual model (stakeholder, concern, viewpoint, view, model kind) | Ground a possible `ViewpointSpec` in the standard's viewpoint/view separation instead of inventing one | Cited above and in [`prior-art-routing.md`](prior-art-routing.md); not yet evaluated as the shape of a `ViewpointSpec` | http://www.iso-architecture.org/42010/cm/ |
| `src/schema-validation.mjs` (bounded JSON Schema subset interpreter, about 325 lines) | Ajv (mature JSON Schema validator) | Replace the interpreter | Already considered in [`runtime-contract-validation.md`](runtime-contract-validation.md): deliberately deferred; re-evaluate when the supported schema surface grows enough that the interpreter stops being simpler to audit | https://ajv.js.org/ |
| `scripts/render-qa.mjs` (automates overlap/overflow/screenshot checks; contains no accessibility audit) vs `catalog/quality-methods.json` checks such as `theme-contrast` and `keyboard-reachable-controls` | axe-core (automated accessibility rules engine, runs in the existing Puppeteer page) | Automate part of the contrast/keyboard/ARIA quality methods instead of relying on manual review | Not yet evaluated | https://github.com/dequelabs/axe-core |

How to evaluate: compare each candidate against this repo's real cases and needs, then choose adopt, compose, or keep; the company-planning `landscape-review` skill exists for this.
