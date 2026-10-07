---
name: representation-router
description: Choose and build working representations for models, plans, architecture, code/evidence review, completed work, product UI, and interactive explanations. Use when a visual or interactive artifact must make a concrete question or action easier for a person.
---

# Representation Router

Choose a representation from the user's question and semantic model before choosing a renderer. The model remains the truth; every diagram, graph, matrix, table, animation, editor, or workbench is a task-specific projection or working surface over truth owned elsewhere.

Do **not** begin by choosing a library. First determine what the user needs to understand or do, whether the required semantic view exists, and whether one view is enough or several views/actions must be composed into a working surface.

## Select a profile

Load only the profile needed for the request.

| Profile | Use when | Load |
|---|---|---|
| `planning-review` | Understand or review a plan, architecture, implementation evidence, completed work, or required human decisions | [`references/planning-review.md`](references/planning-review.md) |
| `general` | Select or build a visualization, diagram, graph explorer, modeling view, product surface, or dashboard | [`references/advanced-routing.md`](references/advanced-routing.md) |
| `explainer` | Teach unfamiliar notation or explain a dynamic, multi-stage system | [`references/advanced-routing.md`](references/advanced-routing.md), starting at “When the notation itself must be learned” or “Dynamic visualization” |

For implementation or explicit visual verification, also use [`docs/render-quality.md`](docs/render-quality.md) and the selected method in `catalog/quality-methods.json`.

For repository documentation ownership and freshness rules, use [`docs/README.md`](docs/README.md). Do not infer current project state from a dated plan or evidence record.

## Common contract

Before rendering, identify:

- the question or human job the artifact must support;
- the person, their decision or task, and their familiarity with the domain;
- the authoritative source model and available concern-specific semantic view;
- the relevant information structure, scale, interaction, provenance, and accessibility constraints;
- the exact source/revision boundary when the surface coordinates current work, evidence, or decisions;
- whether any visible action is read-only, surface-local, or an authoritative write owned by another system; and
- an observable success criterion.

Infer routine details from context. Ask only when a missing choice would materially change the result.

Keep these levels distinct:

1. **Semantic view** — the concern-specific slice of the model.
2. **Representation** — graph, matrix, sequence, timeline, architecture view, table, composite view, or another presentation.
3. **Primitive** — nodes, edges, lanes, states, annotations, inspectors, evidence links, selection, and focus behavior.
4. **Working surface** — one or more ViewSpecs plus interface patterns, shared semantic focus, source/revision bindings, and action boundaries used by a person to plan, inspect, edit, review, operate, learn, or decide.

If the required semantic view is unavailable, return a visible unavailable state with the reason and required source contract. Do not fabricate a plausible diagram. If it is partial, preserve the missing semantics in the artifact.

A working surface never becomes semantic or workflow authority merely because it renders controls. A representation family does not decide semantic eligibility. A write control must be backed by a product-owned action contract; otherwise keep it read-only or surface-local.

## Human language and engineering capability

Treat mixed technical fluency as normal. The default surface should let a person perform the engineering task before requiring familiarity with implementation-specific vocabulary.

Use the rule in [`docs/task-first-engineering-language.md`](docs/task-first-engineering-language.md):

> **Lead with the job. Teach the technical language in context. Preserve the exact truth underneath.**

For user-facing surfaces:

- lead with the human question, task, decision, or outcome;
- name primary controls after intent (`Show whole diagram`, `Reset positions`, `See related evidence`) rather than algorithms (`Fit`, `Neighborhood`, `Cross-lens`);
- make safe contextual behavior automatic when the user has no meaningful choice, such as highlighting direct graph connections after selection;
- explain relationships as first-class semantic objects, including endpoints, meaning, evidence/source, and what the relationship does not imply;
- use ordinary-language primary labels while keeping exact formal names, IDs, schema fields, revisions, and source paths available under `Technical details` / `Source`;
- do not create a simplified parallel truth model for less-technical users; the same surface should support deeper inspection and growing engineering fluency; and
- judge success by what the person can correctly understand, trace, decide, change, or verify—not by whether they can repeat internal terminology.

Reference/proving applications may exercise these principles across the software-engineering lifecycle. That end-to-end ambition does **not** make Representation Router the owner of planning, implementation, CI, deployment, operations, or other product workflows; the reusable core remains representation selection/composition plus explicit semantic, provenance, quality, and authority boundaries.

## Selection and implementation

1. Inspect the request, relevant model/data, existing UI, and mature notation for the task.
2. Normalize the use case with `schemas/use-case.schema.json` when structured routing is useful.
3. Apply hard constraints before preferences. Reject representations that cannot support the required semantics, scale, interaction, or accessibility.
4. Generate plausible representations from `catalog/representations.json` and distinguish complements from substitutes with `catalog/representation-relations.json`.
5. Choose the representation that makes the primary operation perceptually cheapest. Use coordinated views when important questions require different structures.
6. Select interactions from `catalog/interaction-patterns.json`, primitives from `catalog/visual-primitives.json`, and interface patterns from `catalog/interface-patterns.json` when relevant.
7. Prefer existing project capabilities and native web primitives before adding a focused library. Read `catalog/implementations.json` only after selecting the representation.
8. Produce a renderer-independent `ViewSpec` for each concern-specific view.
9. When the product needs one working experience across multiple views, source revisions, interface patterns, or consequential actions, compose the ViewSpecs with `schemas/surface-spec.schema.json` / `src/surface-spec.mjs`. Use `CollectionSpec` instead when the need is a repeated portfolio/collection with shared presentation behavior but no working-surface authority boundary.
10. When implementation is requested, build and inspect the real rendered result at the required viewports and states.
10a. The ranked score is advisory. Treat the router's list as candidates to
    reason about; choose, and be ready to say why in your own words against the
    alternatives for this audience and job. The disposition step will ask for
    exactly that (`choice-justified:<representation>`). A score margin is not a
    justification.
10b. Judge the whole page, not only the marks: every recommendation now carries
    the page plan (`compositionPlan`: the one question, primary element, reading
    order, groups, hierarchy, density budget, reveal-on-click map) drawn from
    `catalog/composition-heuristics.json`, and
    the one-page composition checks (title first, whole on one screen, readable
    in a minute, form matched to job, relationships drawn, one visual language,
    reveal on click). See `docs/composition.md`.
11. Before calling the build done, run `npm run disposition -- <recommendation.json>
    <disposition.json>` (see [`src/disposition-cli.mjs`](src/disposition-cli.mjs)).
    It does not re-verify any claim — it only refuses a silent gap: every
    `avoid`, `hardCheck`, `softCheck`, and `usabilityCheck` the recommendation
    named needs an explicit `satisfied` / `na` / `skipped` line with a reason,
    even "skipped: ran out of time." Write the reasons honestly; a rubber-stamped
    "satisfied" defeats the point as surely as skipping the step.
12. To let a person choose a shape before anything is built, draw a **sketch
    set**: `npm run sketch-set -- <spec.json> --out <dir>` (spec: one shared
    shell + one instruction per picture; example in
    `examples/sketch-sets/`). It drives the ChatGPT browser bridge, saves the
    pictures, and writes an `acceptance.json` **draft** with empty approver
    fields. Show the pictures to the person; record their words with
    `--approve "<words>" --approver <name>`. A sketch set is for a whole
    surface (every tab, one shell), not one diagram in isolation; one picture
    says nothing about whether the views fit together.
13. When a human chose one sketch or mockup from a set of candidates before the
    build, record it in an `acceptance.json` (id, kind, path, sha256, approver,
    time) and pass `--acceptance` to the same command. Each approved reference
    becomes a required `matches-approved-reference:<id>` line; `satisfied` must
    name the evidence it was compared against. Generated sketches are schematic
    candidates for choosing a shape — never a render of the model and never a
    substitute for the semantic source (see `docs/render-quality.md`).

For `SurfaceSpec`, preserve stable semantic IDs across representation pivots. When the selected semantic object is not represented in the new view, keep the selection and report that state rather than silently changing subjects. A source-revision change clears semantic focus or requires an explicit remap; never transfer focus by matching labels.

For an `authoritative-write` action, require:

- the write destination and its owner;
- the target revision;
- the exact subject revision being acted on;
- the actor/authority basis and scope;
- `reject` or `refresh-required` stale-submission behavior; and
- retained evidence.

The optional `web/` playground exists to inspect routing behavior. It is not the required product surface. Reuse the target project's established interface when it already owns the workflow.

## Writing

For prose (articles, email, Slack, reports, applications), use the writing router: declare the facts and
medium with `scripts/writing_record.py declare`, follow the governing guidance it names, check off its
items, and run `writing_record.py check` before calling the draft done. Where a part would be better as a
figure, table or interactive piece, route that part through `recommend` and `disposition` here.
See `docs/writing-router.md`.

## Output

For design guidance, return the selected representation, interactions, implementation approach, alternatives that answer materially different questions, rejected patterns with reasons, assumptions, and the success criterion. Include a `ViewSpec` when another agent or renderer will consume one view.

Include a `SurfaceSpec` when several ViewSpecs and interface patterns form one human working surface, especially when source revisions, persistent semantic focus, or action/write-back boundaries matter. The consuming product still owns persistence, authorization, mutation, semantic truth, and final interaction behavior.

For implementation, deliver the reviewable artifact and its exact entrypoint. State which data is authentic, proposed, partial, unavailable, or fixture-backed. Passing tests establish only the behavior they exercise; they do not establish human comprehension, usefulness, adoption, or semantic correctness.
