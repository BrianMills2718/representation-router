# Renderer contract

Routing and rendering are deliberately separate.

```text
UseCase → heuristic router → ViewSpec → RenderPlan → concrete renderer
```

`ViewSpec` answers **what representation should exist**. `RenderPlan` answers **which renderer family should realize it and what normalized data it receives**. A browser renderer, React Flow adapter, D3 renderer, Mermaid exporter, or native application can consume the same decision without owning the recommendation logic.

## Current adapters

| View pattern | Adapter |
| --- | --- |
| Node-link graph | `graph` |
| Requirements / adjacency matrix | `matrix` |
| Hierarchy tree | `hierarchy` |
| Layered architecture view | `architecture` |
| Sequence diagram | `sequence` |
| Timeline | `timeline` |
| State machine | `state` |
| Data table | `table` |
| Master-detail | `master-detail` |
| Small multiples | `small-multiples` |
| Explorable simulation | `simulation` |

## Schematic vs. project-backed previews

The current use-case examples describe model **types, concerns, tasks, scale, and constraints**, not full instance-level project models. The playground therefore generates deterministic schematic preview data and labels it as schematic.

If a use case supplies `modelData`, `buildRenderPlan()` passes that data through unchanged and marks the plan as project-backed. The exact data shape is adapter-specific for now; tightening those shapes into dedicated schemas is a future step.

This distinction is intentional: a renderer should never make generated sample marks look like real engineering evidence.

## Interaction contract

The browser prototype demonstrates a few interaction primitives:

- selection persists and exposes mark details;
- graph selection highlights incident relationships;
- matrix cells can be inspected individually;
- master-detail rows update an inspector;
- simulation exposes play/pause and explicit scrubbing;
- reduced-motion preferences disable automatic simulation playback.

The next adapters should preserve the ViewSpec provenance contract: visual marks should resolve back to semantic model elements, derived calculations, and evidence whenever those bindings exist.
