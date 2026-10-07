# Prior-art routing guide

Before inventing a representation, identify mature visual languages that already solve the same perceptual or interaction problem. Borrow their effective grammar, then adapt it to the product's semantic identity, interaction, accessibility, and provenance contracts.

This is not a rule to copy a notation wholesale. It is a rule against rediscovering solved design problems without evidence that the established form is inadequate.

## Semantic framework vs representation

Architecture and modeling frameworks often define **what a view means** without requiring exactly one rendering. Treat framework-defined semantics as constraints on content and interpretation, then independently route to the representation that best serves the concern and task.

DoDAF is a useful example: its model catalog is explicitly non-prescriptive, and individual models can allow textual, tabular, graphical, timeline, matrix, or other presentations. SysML view/viewpoint concepts and ISO/IEC/IEEE 42010 reinforce the same separation.

## Prior-art families

| Problem | Prior art to inspect first | Typical reusable ideas |
|---|---|---|
| Ordered interactions among participants | UML sequence, message-sequence charts, BPMN choreography, distributed tracing | lifelines, messages, activation/order, participant identity |
| Workflow / branching process | BPMN, UML/SysML activity, process mining | lanes, events, gateways, tokens/paths, exceptions |
| Lifecycle / reactive behavior | UML/SysML state machine, statecharts | states, transitions, guards, entry/exit, hierarchy/concurrency |
| Dependency structure | DSM/adjacency matrix, graph analysis, PERT, influence diagrams | directed edges, matrix ordering, path tracing, criticality |
| Layered architecture | C4, UML component/deployment, ArchiMate, SysML | abstraction boundaries, containment, interfaces, deployment context |
| Data / information structure | ER, UML class, ontology/knowledge graph, schema browsers | entities, attributes, cardinality, specialization, physical/logical separation |
| Component contracts / interfaces (`uml-component-diagram`, `uml-class-diagram`) | UML 2.5 component and class diagrams, C4 model, PlantUML, Mermaid classDiagram, D2, Structurizr (diagrams generated from one model) | provided/required interfaces, ports, operations, generalization/realization, views generated from a model rather than drawn |
| Typed dataflow between steps (`port-graph`) | Zapier, n8n, Node-RED, ComfyUI, LabVIEW, Unreal Blueprints; React Flow handles, Rete.js sockets, ELK layered layout with ports | named input/output ports per node, wires carrying a typed payload, port-compatibility, branching dataflow |
| Capability / taxonomy | taxonomy browsers, indented trees, icicle/sunburst where appropriate | hierarchy, measures, compare phases, collapse/expand |
| Project evolution | Gantt, PERT/CPM, roadmaps, milestone maps | intervals, milestones, dependencies, critical path, baseline vs target |
| Geographic relationships | GIS/cartography | spatial position, regions, layers, scale, clustering |
| Magnitude-bearing flow | Sankey/alluvial | flow width, source/sink/stage identity, conservation caveats |
| Dense pairwise relationships | adjacency/DSM matrices, heatmaps | ordering, clustering, cells, symmetric/asymmetric semantics |
| Evidence / investigation | link analysis, knowledge graphs, investigative workbenches | persistent focus, neighborhood expansion, provenance, linked inspectors |
| Multi-view analysis | coordinated multiple views, brushing-and-linking, small multiples | linked selection, shared filters, consistent scales, compare/pivot |
| Narrative explanation | annotated graphics, scrollytelling, explorable explanations | staged disclosure, annotations, guided focus, narrative + free exploration |

## Representation comparison questions

For each candidate representation, record:

1. Which analyst question does it make easiest to answer?
2. Which semantic distinctions does it preserve or obscure?
3. At what scale/density does it stop working?
4. What established notation or visual convention does it borrow from?
5. What interaction is essential rather than decorative?
6. Can selection persist when the user pivots to another representation?
7. Can every important mark resolve to model identity and provenance when required?
8. What accessibility risks exist beyond color?
9. What simpler representation could answer the same question?
10. What concrete deficiency would justify inventing something new?

## Multiple representations are not a failure

A semantic view can legitimately need more than one representation when the representations optimize different tasks.

Example: a resource-exchange semantic view can use:

- a node-link network for topology and neighborhood tracing;
- a source → resource → destination flow for direction and handoffs;
- a matrix/ledger for dense lookup, comparison, and completeness checks.

The router should preserve these alternatives when they are complementary rather than collapsing them into one ranking winner.

## Classify alternatives as substitutes or complements

Before ranking multiple candidate representations, decide whether they are actually competing for the same task.

- **Substitutes** answer substantially the same analyst question with different encodings. Rank them against each other and prefer the lowest-complexity representation that preserves the required semantics.
- **Complements** optimize different important tasks over the same semantic view. Do not force them into a winner/loser order; coordinate them with shared selection, filters, and provenance.

Common complementary pairs include:

- node-link graph for dependency-path explanation + DSM/adjacency matrix for dense global overview;
- applicability matrix for many-to-many coverage + graph neighborhood for change-impact tracing;
- Gantt for duration/slippage + dependency graph for causal schedule structure + capability-delivery roadmap for whether delivery meets operational need;
- ER/class-like diagram for bounded schema comprehension + search/inspector for large-schema lookup;
- logical/component architecture view + physical deployment view when both concerns matter.

This distinction should happen before scoring. A lower score for a complementary representation does not imply it should be omitted.

## Homologous views should share grammar

When a framework repeats the same semantic pattern at different abstraction layers, route those views through a shared representation grammar before designing each independently.

For example, operational, service, and system layers may each expose resource flow, state transition, event trace, rules, functionality, or pairwise relationship views. The entity types differ, but the perceptual task is often homologous.

Prefer:

```text
shared semantic pattern
    → shared representation candidates
    → shared primitives/interactions
    → layer-specific entity types and labels
```

over separate one-off diagram conventions.

This improves learnability and makes cross-layer pivots comprehensible, while still allowing a layer-specific representation when its semantics genuinely require one.

## Scale-adaptive routing

The semantic view should remain stable when the representation changes because of scale.

Example policy:

```text
small dependency set   → labeled node-link graph
medium dependency set  → filtered/clustered graph + inspector
large dependency set   → adjacency/DSM matrix + search + neighborhood graph
```

This is preferable to preserving one visual form until it becomes illegible.

## Composite views

Some concerns require a coordinated composition rather than a single visual form. A good composite may include a concise finding, primary visualization, exceptions/gaps, inspector, and provenance surface.

Composite components must share semantic identity and interaction state. A collection of unrelated dashboard cards is not automatically a composite representation.

## Sources to keep current

- DoDAF 2.02: https://dodcio.defense.gov/DoDAF/
- OMG UML: https://www.omg.org/spec/UML/
- OMG SysML v2: https://www.omg.org/sysml/sysmlv2/
- OMG BPMN: https://www.omg.org/spec/BPMN/
- ISO/IEC/IEEE 42010 overview: https://www.iso.org/standard/74393.html
- C4 model: https://c4model.com/
- ArchiMate: https://www.opengroup.org/archimate-forum
- Draco: https://github.com/cmudig/draco2
- CompassQL: https://github.com/vega/compassql
- Brehmer & Munzner task typology: https://www.cs.ubc.ca/labs/imager/tr/2013/MultiLevelTaskTypology/
- Munzner nested model: https://www.cs.ubc.ca/labs/imager/tr/2009/NestedModel/
