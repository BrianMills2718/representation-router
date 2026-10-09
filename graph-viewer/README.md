# graph-viewer: the shared typed-graph viewer

One reusable viewer for node-and-link graphs, so projects stop hand-rolling
their own (Brian, 2026-09-29: "every time i ask for a graph ... my coding agents
try to recreate the wheel"). A project produces a `typed-graph/v1` document;
the viewer owns layout, rendering, fit-then-zoom and selection.

- **Crisp text at any zoom.** Built on React Flow, which draws nodes and labels
  as page elements, not pixels on a canvas.
- **Measured layout.** Nodes are rendered, measured, then laid out by ELK
  (layered, orthogonal routing, long chains wrapped to the frame's shape). Edges
  follow ELK's routes with rounded corners, and link labels are measured too, so
  ELK reserves room for them: no label sits on a box or on another label.
- **Fits, then zooms like a map.** The whole graph opens fitted to its frame
  (never enlarged past 100%, so small graphs are not blown up);
  wheel or pinch to zoom, drag to pan, plus zoom and fit controls; a minimap
  appears once the reader zooms in, and stays out of the way until then
  (router heuristic `diagrams-fit-then-zoom-like-a-map`).
- **Selection.** Clicking a node or link highlights it and its neighbours, dims
  the rest, and reports `{type, id}` to the page.
- **Drag to rearrange (0.8.0).** Readers can drag any box or fact hub; its links
  follow (a hub's spokes come with it). Links touching a moved node drop ELK's
  stored route and draw straight to the new place; the rest keep their routes.
  Dragging the background still pans, and a drag never counts as a click, so it
  does not change the selection. Positions reset when the page sends a new graph.

## Input contract

`schemas/typed-graph.schema.json`:

```json
{
  "schema": "typed-graph/v1",
  "kinds": { "System": { "label": "System", "color": "#8dae98", "explain": "A machine or network that does work." } },
  "nodes": [{ "id": "siprnet", "label": "SIPRNET", "kind": "System" }],
  "edges": [{ "id": "e1", "source": "siprnet", "target": "hold", "label": "performs", "dashed": false }],
  "layout": { "direction": "RIGHT" }
}
```

A kind may set `dashed` (for example, modeled rather than stated items); a node
or edge may override it. The viewer throws a plain list of problems when the
document breaks the contract.

### Facts with several participants (`hyperedges`, 0.5.0)

A fact that joins more than two nodes in named roles goes in `hyperedges` instead of being split
into pairs of edges. The viewer draws it as one hub (a pill-shaped node) with a spoke to each
participant labelled by its role, so facts that share a participant (a place, a date, a unit)
connect through it. This is the encoding onto-canon6 uses for n-ary assertions (a fact node plus role
edges); the Representation Router heuristic `keep-n-ary-relations-whole` explains when to use it.

```json
"hyperedges": [{ "id": "f1", "label": "transfer (23 March)", "kind": "fact",
  "roles": { "giver": ["perry"], "receiver": ["shiloh"], "cargo": ["pallets"], "place": ["hachinohe"] } }]
```

For many facts that share participants, set `"layout": {"algorithm": "force"}` (0.7.0): a d3-force
map instead of left-to-right layers. The DoDAF model as 131 fact hubs lays out in under a second with no
overlapping boxes; ELK's stress layout (0.6.0, removed) took a minute on the same graph.

Every role names one or more node ids; hyperedge ids must not reuse node or edge ids. A graph without
`hyperedges` renders exactly as before.

## Use

```html
<div id="graph" style="height:60vh"></div>
<script src="graph-viewer.js"></script>
<script>
  const viewer = GraphViewer.mount(document.getElementById("graph"), {
    graph,                                   // typed-graph/v1
    onSelect: (pick) => console.log(pick),   // {type: "node"|"edge", id} or null
    onLayout: ({ width, height }) => {},     // drawing size at zoom 1, to size the frame
  });
  // viewer.update(nextGraph); viewer.fit(); viewer.select(id); viewer.destroy();
  // viewer.highlight(["node-id", "edge-id"]) lights those up and dims the rest; highlight(null) clears.
</script>
```

The viewer shields its SVGs from host rules such as `svg{width:100%;height:auto}`;
`demo.html` carries that rule on purpose.

Theme through CSS variables on any ancestor: `--gv-bg`, `--gv-ink`,
`--gv-node-bg`, `--gv-line`, `--gv-edge`, `--gv-ext` (dashed links),
`--gv-edge-text`, `--gv-focus`, `--gv-dots`.

## Build and test

```bash
npm run build:graph-viewer   # writes graph-viewer/dist/graph-viewer.js (one file, no build needed by consumers)
npm test                     # includes test/graph-viewer.test.mjs
```

Open `graph-viewer/demo.html` through any static server to see it.

Consumers vendor a pinned copy of `dist/graph-viewer.js` (first consumer: the
DoDAF demo at brianmills.dev/dodaf-mock/).
