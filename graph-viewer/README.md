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

**Large graphs.** Over 60 nodes or 120 edges, ELK uses its fast node placement, because the default
overflowed the stack on a 127-box plan, and link words show only for the selection. A layout candidate that throws is logged to the console and
skipped; if all of them throw, the graph falls back to the force layout, so boxes never pile on one spot.

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

### Links survive a hidden panel (0.14.2)

A viewer whose element is hidden (`display:none` on it or a parent) or squeezed to no width or
height no longer refits to zoom 0. Before 0.14.2 it did, and React Flow measures each box's link
handles as screen offset divided by zoom, so when the panel was shown again every handle measured
0/0 and every link drew `MNaN,NaN` while the boxes drew fine (world-substrate#316). Now the viewer
keeps its current view while hidden and refits once the element has a size again. Box sizes that
are missing or not a number get the default size before the force layout, and ELK coordinates that
are not numbers become 0, so no layout can place a box at NaN. Regression test:
`test/graph-viewer-nan.test.mjs` (the browser part needs Chrome; set `CHROME_PATH` if it is not
found).

### Full page at a readable size (0.14.0)

Every viewer shows a **Full page** button (top-left; bottom-right for lanes graphs). It makes the
host element cover the whole window and fits the drawing again, but never below 85% zoom, so 13px
labels stay about 11px or larger; a drawing too big for that opens from its top-left corner and the
reader drags to pan the rest. The button again, or Esc, returns to the page. `mount(el, { fullPage:
false })` leaves the button out; `onFullPage(on)` reports each change; `viewer.fullPage(true|false)`
opens or closes it from the page. Router heuristic `every-diagram-opens-full-page-at-a-readable-size`
(Brian, 2026-11-05: "the diagram and its text are too small to be readable i need a full paging otpion").

### Arc layout for small networks read on a phone (0.13.0)

`layout: { algorithm: "arc" }` stands the main nodes in one column, ordered so linked nodes sit
close (up to 8 linked nodes are ordered exactly; `node.order` overrides), draws each link between
them as an arc on the left, nested so arcs do not cross, with its words written along the arc, and
puts nodes marked `side: true` (on the node or its kind) in a narrow column on the right, level with
the nodes they link to. The drawing stays about one column wide, so a whole small theory or model
reads on a phone without zooming (arc diagrams: Wattenberg, InfoVis 2002).

### Shapes, heavy borders and line styles (0.12.0)

A node (or its kind, or a hyperedge hub) may set `shape: "diamond"` for a claim, decision or
proposition, and `strong: true` for a heavy border on the one node the drawing is about (a core
category). A link may set `line` to `solid`, `dashed`, `dotted`, `dashdot` or `long` so several
relation types stay apart without colour, `arrow: false` for an undirected relation, and `color`
and `width`. The page draws the key for these itself. `mount(el, { panel: false, ... })` leaves out
the built-in details panel when the page shows the selection in its own panel through `onSelect`.

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

### Whole documents side by side (`layout.algorithm: "lanes"`, 0.9.0)

For documents kept whole (a hearing, a report, a speech) rather than cut into separate facts. Each
node may name a `parent` (containment), an `order` among its siblings, a `lane` (one column per
document, listed in `layout.lanes`) and `collapsed` (start closed; a kind can set it for all its
nodes). Nodes with no lane go in a shared middle column (`layout.sharedLane`), for things several
documents have in common, such as people who speak in more than one.

- **Defaults hide, never drop.** A closed box says what it holds ("▸ Open: 43 speaker turns, 180
  claims"); links to hidden nodes move to the nearest visible box and merge ("speaks ×12"). The bar
  above the graph shows shown/total for every kind, a "Show all" per kind and "Reset view".
- **Source drilldown.** `node.source` is `{text}` or `{from: otherNodeId, start, end}`; the side panel
  shows the text with that span marked. `node.details` is a list of `[label, value]` rows for the panel.
- `edge.quiet` links show only while one of their ends is selected.

`src/adapters/claim-batch.mjs` builds such a graph from onto-canon6 outputs:
`documentsToTypedGraph(docs, {blocks})` takes, per document, its passages (AtomicSourceDocumentV1) and
claim batch (SourceBackedClaimBatchV1, whose claims may carry `original_claimant` and `stance`:
asserts, denies, relays, asks, answers), plus optional `notPeople` (printed labels that are headings,
not speakers) and `sameClaimant` (other spellings of a speaker). It returns document → numbered turn
groups → speaker turns in order → passages → claims: relayed claims (claimant is not the speaker) in
pale blue, claims the speaker denies in orange, questions dashed, claims with no stance kept as "no
stance recorded", and people in more than one
document in blue. Each document box counts "relayed from someone else" as the pale-blue relayed
claims only, and separately "claimant is not the speaker (relayed, denied or asked)" (0.10.1); the detail panel caps its label column at 45% of its width so a long label cannot squeeze the values (0.10.2). It is also exported as `GraphViewer.documentsToTypedGraph`. First consumer: greer's
whole-document hearings page. Tests: `test/graph-viewer-whole-documents.test.mjs`.

### Links between documents and one person under several names (0.11.0)

`documentsToTypedGraph(docs, {crossLinks, people})` adds two optional inputs.

- `crossLinks`: each link joins an exact place in one document to an exact place in another
  (`from`/`to`: `{doc, start, end, ref?}`, offsets in the text the passages index), with its words
  (`label`, such as "retells · strengthened"), an optional `color` and `dashed`, an `explain` and
  `details`. Each end becomes a "place" box inside its turn; the link becomes an edge that carries
  both quotes (`edge.compare`). The claims named in `fromClaims`/`toClaims` and the turns at both
  ends list the link as a button (`node.links`).
- `people`: identity groups `[{id, name, members: [{doc, label, role: "speaker" | "claimant"}], reason}]`.
  The listed speaker labels and claimant names become one person box, linked to the turns they speak
  and the claims credited to them, instead of matching by exact printed label.

Any typed graph can use the same edge fields: `color`, `explain`, `details`, `compare`
(`[{title, node, source}]`) and `node.links` (edge ids). Clicking a link button, or
`viewer.selectLink(edgeId)`, opens every box above both ends, selects the link, brings its far end
into view and shows both quotes side by side with a "Go to this place" button for each end.

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
  // viewer.update(nextGraph); viewer.fit(); viewer.select(id); viewer.fullPage(true); viewer.destroy();
  // lanes graphs also: viewer.open(id), viewer.showKind(kind), viewer.reset().
  // viewer.highlight(["node-id", "edge-id"]) lights those up and dims the rest; highlight(null) clears.
</script>
```

The viewer shields its SVGs from host rules such as `svg{width:100%;height:auto}`;
`demo.html` carries that rule on purpose.

Theme through CSS variables on any ancestor: `--gv-bg`, `--gv-ink`,
`--gv-node-bg`, `--gv-line`, `--gv-edge`, `--gv-ext` (dashed links),
`--gv-edge-text`, `--gv-focus`, `--gv-dots`. `--gv-node-tint` (default `0%`) mixes that much of each
node's kind colour into its fill, so a page whose kinds carry meaning (activity, status) reads at a
glance instead of only through the thin border.

## In OpenUI (generative UI)

`src/openui.mjs` wraps the viewer as an OpenUI custom component, so a model answering in OpenUI Lang
can draw a real graph. React, OpenUI's `defineComponent`, zod and `mount` are passed in, so the file
loads in node (prompt building, parsing) as well as in a page:

```js
import { defineGraphViewerComponent } from "graph-viewer/src/openui.mjs";
const GraphViewer = defineGraphViewerComponent({ React, defineComponent, z, mount: (el, o) => window.GraphViewer.mount(el, o) });
const library = openuiLibrary.extend({ components: { add: [{ component: GraphViewer, slots: ["Card.children"] }] } });
```

The model writes `nodes{id,label,kind}`, `edges{source,target,label}`, `legend`, `focus`. Every edge
reads "source label target" in the direction the question states (`EDGE_DIRECTION_RULE`, shown in the
component's description). `toTypedGraph` turns the props into typed-graph/v1. Frames narrower than 800
pixels leave the layout direction to the viewer's own best-fit choice. Checked with two models in
`examples/openui-check` (run 3).

## Build and test

```bash
npm run build:graph-viewer   # writes graph-viewer/dist/graph-viewer.js (one file, no build needed by consumers)
npm test                     # includes test/graph-viewer.test.mjs
```

Open `graph-viewer/demo.html` through any static server to see it.

Consumers vendor a pinned copy of `dist/graph-viewer.js` (first consumer: the
DoDAF demo at brianmills.dev/dodaf-mock/).
