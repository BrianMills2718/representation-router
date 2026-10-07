# Implementation playbooks

Representation selection and renderer selection are not enough. A library can be appropriate while the resulting picture is still badly composed.

Use the sequence:

```text
semantic view
  -> representation
  -> renderer / layout engine
  -> implementation playbook
  -> rendered quality gate
```

The playbook is the construction method. The quality gate verifies the rendered result.

## Custom SVG / D3

Measure final text and marks before freezing positions. Place the primary structure first, then annotations. Give movable labels several candidate anchors and score them against measured obstacles. Route edges after node and label geometry is known. Prefer hiding secondary labels or moving detail to an inspector over shrinking required text. Use a separate narrow-screen layout when the wide layout cannot remain legible by reflow alone.

When the task includes decoding unfamiliar notation, keep semantic explanation layered too: canonical identity, source-derived associations, concise interpretive gloss, and example-specific status should remain distinct. A compact semantic key can summarize the whole grammar while the inspector carries longer provenance; do not push full explanatory prose into every visual mark.

When notation familiarity is novice, progressive disclosure alone is not enough. Provide a **guided Learn mode** that introduces one new semantic distinction per step, defines vocabulary before first use, and explicitly shows likely wrong readings. Keep the full expert explorer as a separate mode. A slider that reveals more layers is still an expert control if the learner does not yet know what the layers mean.

Treat observed confusion as test data. If a user repeatedly reads a syzygy current as a zone-to-zone edge, or cannot distinguish a gate from a current, write that misunderstanding down as an acceptance criterion and regression case for the instructional surface.

## Graph layout tools

Measure node content first and pass real node dimensions to the layout engine. Choose layout from semantic order, not aesthetics alone. Route edges only after nodes are placed; place edge labels against those routes; reserve clearance for ports and arrowheads; rerun layout if content size changes materially.

## Canvas / WebGL

Define a screen-space label budget and level-of-detail policy. Keep selected/high-value labels stable and readable, keep hit targets synchronized with rendered marks, and move secondary detail to an inspector.

## Generated text diagrams

Keep source reviewable, but always render it. Inspect the generated layout in the target theme and viewport. Change orientation, split the view, or shorten display labels before accepting clipping or unreadable scale.

## Application/composite layouts

Establish the primary task and panel hierarchy, design breakpoints intentionally, use content-aware sizing, test empty/normal/max content, and prevent secondary panels from obscuring the primary representation.

Machine-readable playbooks live in `catalog/implementation-playbooks.json` and are attached to agent recommendations by `src/playbook-plan.mjs`.

### Explorable explanation pattern

For explanatory content whose meaning unfolds dynamically, keep a persistent visual object rather than replacing it with a new diagram on every section. Bind narrative/scroll progression to semantic state changes in that object. Use small, local manipulations to let the reader discover a rule. When the core difficulty is translating between levels of abstraction, show concrete example, plain-language model, and canonical/formal model as synchronized views of the same semantic object. Avoid turning the experience into a sequence of presentation cards with decorative interaction.

When the goal is durable model use rather than recognition, end guided practice with **scaffolding fade + transfer**. Remove hints and legal-action filtering while retaining core accessibility controls, include plausible misconceptions as distractors, delay feedback until the learner commits, and test at least one state/route/example that was not the exact guided exercise. Treat transfer failures as design evidence, not merely learner error.

When the desired outcome is operational fluency, follow the explainer with **constructive model practice**. Generate the available actions from the semantic model itself so the UI cannot teach impossible operations. Selecting an action should pause before mutating the model when prediction is useful; ask for the expected destination/result, reveal the move only after commitment, and explain the semantic rule that made it legal. Do not reduce feedback to “right/wrong.” The practice surface should diagnose the learner’s model.
