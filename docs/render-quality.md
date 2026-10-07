# Render quality methods

Representation selection is not sufficient. A semantically correct ViewSpec can still produce a bad picture.

Treat rendering as a second constraint problem:

```text
semantic routing
  -> implementation choice
  -> render with real fonts/data
  -> measure actual geometry
  -> detect failures
  -> repair
  -> re-render
  -> human composition review
  -> visual regression capture
```

The key distinction is that routing heuristics predict what should work; render QA verifies what actually happened in pixels.

## Completion gate

Do not call a visualization complete only because it renders without exceptions. For spatial/vector views, require both:

1. machine-checkable geometry constraints; and
2. screenshot-level human review of visual hierarchy and composition.

Zero bounding-box collisions is necessary in many views, but it is not sufficient for a good composition.
## SVG / custom vector views

For native SVG or D3 SVG:

- render after final fonts load;
- measure text and marks with browser geometry (`getBoundingClientRect` / `getBBox` as appropriate);
- give movable labels several candidate anchors rather than one fixed coordinate;
- score candidates against already-placed labels and node/shape obstacles;
- reroute edges when labels cannot be placed cleanly;
- preserve a priority order so canonical/focal labels win over secondary decoration;
- prefer hiding or moving secondary detail to an inspector over shrinking required text;
- test every meaningful state, not only the initial frame.

A useful repair order is: move label -> reroute edge -> increase spacing -> shorten secondary display text -> move secondary detail to inspector.

## Graph / diagram layouts

Do not lay out nodes using guessed dimensions and then pour text into them. Measure real node content first, pass those dimensions into the layout engine, route edges after node placement, then place edge labels against the routed geometry. Re-run layout when label or node size changes materially.

## Responsive representations

A narrow viewport may require a different projection or layout rather than scaling the desktop diagram until it is unreadable. Responsive QA should distinguish intentional local panning from accidental page overflow, and should preserve the user's focal element when the layout changes.
## Minimum browser audit

For each target viewport and important interaction state, check at least:

- required text/text overlaps;
- required text/mark overlaps;
- clipped labels;
- page-level horizontal overflow;
- minimum rendered text size;
- controls outside the viewport;
- selected/focal mark visibility;
- edge/arrowhead clearance;
- stable positions across adjacent steps when identity is meant to persist.

Capture screenshots after the automated audit passes. Human review should ask whether the first frame is legible, the focal hierarchy is obvious, whitespace is balanced, and technically legal placements are still sensible.

## Numogram lesson

The Numogram regression case exposed two distinct failures: the model could be semantically correct while labels overlapped, and a wide-screen topology could become unreadable when merely squeezed onto mobile. The corrected implementation uses measured label placement plus a separate narrow-screen layout. This is the pattern to generalize: preserve semantic identity, but permit representation geometry to adapt to the actual display constraints.

Machine-readable versions of these methods live in `catalog/quality-methods.json`; `src/quality-plan.mjs` attaches the best matching method to agent recommendations.

## Whole-page composition

Every recommendation carries the one-page composition checks in addition to the renderer method; see [`composition.md`](composition.md).

## Approved reference and sketch candidates

A generated image can play one honest role in this flow: a **schematic candidate**
at the representation-selection step. When the router returns two or three
plausible families with no meaningful score margin, drawing one placeholder-data
sketch per candidate lets a person choose a shape in seconds. The sketch is not a
render of the model, carries no source-derived labels, and must be labeled as a
candidate.

`scripts/sketch-set.mjs` draws such a set through the ChatGPT browser bridge and
writes the acceptance draft. Once a person approves, that image set is the
**acceptance reference** for the build. Record it in an `acceptance.json`:

```json
{ "references": [{ "id": "...", "kind": "approved-mockup", "path": "...png",
  "sha256": "...", "approvedBy": "...", "approvedAt": "..." }] }
```

and run `npm run disposition -- <recommendation> <disposition> --acceptance <file>`.
The CLI verifies the digest and requires an explicit `matches-approved-reference:<id>`
line; `satisfied` must name the comparison evidence. Parity is still a human
judgment. The mechanism exists because of the 2026-09-10 Company Work Graph case,
where sixteen mockups were generated, one approved, and the shipped page drifted
from it unnoticed until the owner looked
(`examples/approved-references/company-work-graph-20260910/`).

## Reusable browser harness

The repository ships `scripts/render-qa.mjs`. Run it with:

```bash
npm run render-qa -- path/to/render-qa-config.json
```

A config can target an existing URL or serve a static directory, enumerate viewport sizes and interaction states, optionally call an application-specific QA hook, and capture screenshots. The generic audit checks SVG text overlap/clipping, page-level horizontal overflow, controls outside the horizontal viewport, and minimum rendered SVG text height. Use the application hook for domain-specific geometry checks that the generic harness cannot infer.
