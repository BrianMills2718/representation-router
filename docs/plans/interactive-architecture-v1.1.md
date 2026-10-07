# Interactive Architecture v1.1 Plan

**Planning path:** durable single-contributor  
**Status:** implemented and CI-verified; awaiting human review  
**Risk tier:** Tier 2 — review-surface interaction behavior  
**Target:** PR #23 / `feature/review-workbench-v0`

## Outcome

Turn the architecture views from inspectable diagrams into working representations. A reviewer should be able to reorganize graph layout, pan/zoom, select nodes and relationships, inspect edge semantics/provenance, highlight local neighborhoods, and carry semantic focus into Requirements/Evidence without changing authoritative source truth.

Human checkpoint: **Does direct manipulation + relationship inspection make the architecture materially easier to reason about than the static v1 diagrams?**

## Current truth

- v1 remains the verified static-diagram baseline.
- v1.1 is now a self-contained React/XYFlow workbench using the repository's existing interaction dependency.
- Component and State are draggable/selectable graph canvases; Sequence messages are selectable semantic interactions.
- Relationships are first-class inspector targets rather than decorative arrow labels.
- Layout/viewport/selection remain surface-local and do not mutate semantic source truth.

## Implemented scope

1. Kept v0/v1 intact as baselines.
2. Added `review-workbench/pr22.interactions-v1.1.json` with explicit graph policy, edge/transition meaning, nonclaims, provenance, and requirement/evidence links.
3. Added `review-workbench-v11/` as a Vite/React single-file workbench using `@xyflow/react`.
4. Component and State support node drag, pan/zoom, fit, reset layout, layout lock, and neighborhood highlighting.
5. Component edges and State transitions are selectable semantic relationships with endpoint/meaning/nonclaim/provenance inspection.
6. Sequence participants/messages are selectable while preserving ordered lifeline semantics.
7. Inspector links selected architecture objects into Requirements and Evidence without replacing the architecture selection.
8. Added `test/review-workbench-v11.test.mjs` for semantic links, authority invariants, surface-local layout, and interaction/build contract.
9. Added `npm run build:review-workbench:v1.1` and CI retention of the exact artifact.

## Interaction contract

```text
semantic graph / state model
        ↓
representation adapter
        ↓
XYFlow interaction state
  - node positions
  - viewport
  - selection
  - neighborhood highlight
        ↓
shared inspector / cross-lens navigation
```

The downward flow above does **not** reverse automatically. Dragging a node changes only local layout. It does not mutate ViewSpec, SurfaceSpec, domain truth, Git state, or review authority.

### Node selection

Selecting a node:
- persists until another semantic object is selected;
- shows meaning, owner/type, provenance, and related requirements/evidence;
- highlights incident edges and one-hop neighbors;
- survives fit/zoom/reset operations while the semantic object still exists.

### Edge selection

Selecting an edge:
- selects the relationship identity, not merely its visual path;
- shows source and target semantic identities;
- explains what the relationship means;
- names supporting source provenance;
- shows what the edge does **not** imply;
- links to relevant requirements/evidence when present.

### Layout state

- Node drag is `surface-local`.
- Reset layout returns to deterministic model-derived positions.
- Fit view changes viewport only.
- No layout operation changes edge direction, edge type, membership, evidence, or source identity.

## Non-goals

- No persisted cloud/user layout in this tranche.
- No graph editing that creates/deletes semantic nodes or edges.
- No automated UML reverse engineering.
- No class/activity diagrams yet.
- No router-scoring changes yet.
- No product/workflow write-back from graph manipulation.

## Acceptance evidence

CI run `35049173530` on exact head `bf0816d51f0aacd70ad033b0bec2cf970658cb5b` completed successfully:

- `npm ci` — success
- `npm test` — success
- `npm run build:review-workbench` — success
- `npm run build:review-workbench:v1` — success
- `npm run build:review-workbench:v1.1` — success
- v0 artifact upload — success
- v1 artifact upload — success
- v1.1 artifact upload — success

Retained v1.1 artifact:

- artifact name: `review-workbench-v1.1`
- artifact id: `10427869143`
- archive digest: `sha256:c03d1ad7282af3d22097d8445ca4108f9dbf753d6c3b44e15a275db1791dd01d`
- generated `index.html`: 469,703 bytes
- generated HTML SHA-256: `53fc3aaef1ebbb4643d7418dd95537b407b51e3df8da725cff45c8a4410346c3`
- no external `<script src>` dependency

Static artifact inspection confirms the interactive graph controls, relationship inspector/cross-lens controls, XYFlow bundle, human gate states, and self-contained build are present.

An additional local Playwright/Chromium interaction pass was attempted against the exact artifact, but this execution environment blocks browser navigation to both `file://` and localhost with `ERR_BLOCKED_BY_ADMINISTRATOR`. Therefore no extra browser-automation claim is made beyond the green repository tests/build and the artifact itself; the current checkpoint is intentionally human interaction review.

## Acceptance criteria status

1. Component and State use interactive XYFlow canvases with drag, pan, zoom, fit, and reset — implemented; CI build green.
2. Component relationships and State transitions are first-class selectable edges — implemented and contract-tested.
3. Edge inspector exposes meaning, endpoints, provenance, related requirements/evidence, and nonclaim — implemented and contract-tested.
4. Node/edge neighborhood highlighting — implemented.
5. Sequence message inspection — implemented.
6. Cross-lens Requirement/Evidence navigation — implemented.
7. Layout changes are local clones; semantic architecture JSON remains unchanged — tested.
8. No direct `Machine verified → Accepted` transition — tested.
9. Narrow review uses responsive layout plus local graph pan/zoom — implemented in CSS/XYFlow interaction.
10. Canonical test/build/artifact gate — green on CI run above.

## Stop condition

Reached. The verified v1.1 artifact is the human-review subject. Do not add new diagram families, persistent layouts, semantic graph editing, or automated representation routing until the user reviews direct manipulation, edge semantics, neighborhood highlighting, and cross-lens navigation.
