# Task-First Capability Pass v1.2

**Planning path:** durable single-contributor  
**Status:** implemented; final current-head CI verification pending after agent-guidance documentation update  
**Risk tier:** Tier 2 — working-surface comprehension and interaction behavior  
**Target:** PR #23 / `feature/review-workbench-v0`

## Outcome

Generalize the Review Workbench feedback into a reusable Representation Router design rule and apply it to a new v1.2 checkpoint.

The long-term product goal is to make full-stack, end-to-end software engineering operable through task-appropriate representations even when the person does not begin with software-internal vocabulary. The interface must preserve exact technical truth and a path to code/schema/source while making prior knowledge of terms such as `ViewSpec`, `SurfaceSpec`, semantic identity, provenance, or graph-neighborhood algorithms unnecessary for the first successful task.

Human checkpoint: **Can a person open the workbench, understand what changed and what to do, and inspect architecture/evidence without first learning Representation Router terminology?**

## Current truth

- v1.1 proves direct manipulation, edge selection, provenance inspection, and cross-view navigation can exist in one self-contained artifact.
- Human review found that the Overview still led with implementation vocabulary and that visible controls such as `Lock layout` and `Neighbors on` exposed graph mechanics instead of the human task.
- The useful behavior behind neighborhood highlighting is still valuable; the toggle and algorithmic label are not.
- The useful behavior behind layout locking is not yet important enough to deserve a primary control.
- Exact technical language must remain available because the goal is increased engineering capability, not irreversible simplification.

## Generalized design rule

Use **task-first language with progressive technical disclosure**:

1. Lead with the human job, question, decision, or outcome.
2. Use ordinary verbs and nouns for primary controls.
3. Make useful graph/context behavior automatic when there is no meaningful decision for the user to make.
4. Introduce technical terms at the point where they explain something the user is already doing.
5. Preserve exact technical names, IDs, schema fields, source revisions, evidence, and code links under `Technical details` / `Source` rather than hiding them.
6. Never replace technical truth with a simplified parallel truth model.
7. Measure success by what the person can correctly understand, trace, decide, change, or verify—not whether they can repeat internal terminology.

This rule is now documented in `docs/task-first-engineering-language.md` and is also agent-facing in `SKILL.md`.

## Implemented scope

1. Added canonical guidance at `docs/task-first-engineering-language.md`.
2. Kept v0/v1/v1.1 intact as comparison baselines.
3. Added Review Workbench v1.2 as a separate self-contained React/XYFlow artifact.
4. Replaced the first-screen explanation with task/outcome language.
5. Renamed architecture tabs around questions/tasks: `Start here`, `System map`, `How it works`, `What happens next`.
6. Removed visible `Lock layout` and `Neighbors on/off` controls.
7. Made direct-connection highlighting automatic after graph selection.
8. Renamed graph controls to `Show whole diagram` and `Reset positions`.
9. Added concise instructions: `Drag boxes to rearrange. Click a box or line to understand it.`
10. Rewrote inspector headings around human questions: `What this is`, `What this relationship means`, `Connects`, `Why it matters`, `Source`, `What this does not mean`, `See related`, and `Technical details`.
11. Added plain-language primary labels such as `Source of truth`, `One focused view`, `Combined working view`, and `The app people use`, while retaining exact `ViewSpec` / `SurfaceSpec` names inside technical detail.
12. Preserved Requirements, Evidence, Review, exact revisions, source links, formal relationship names, IDs, and provenance.
13. Added regression tests for task-first copy, automatic connection context, technical-depth preservation, local-only layout mutation, and self-contained build behavior.
14. Added `npm run build:review-workbench:v1.2` and CI artifact retention.
15. Updated `SKILL.md` so future Representation Router implementations inherit the capability-first rule.

## Non-goals

- No separate "nontechnical mode" that hides engineering truth.
- No removal of exact technical terminology from technical detail/source views.
- No persisted layout yet.
- No semantic graph editing.
- No new diagram family.
- No automated representation routing in this tranche.
- No authorization/write-back capability.

## Acceptance evidence

The first complete v1.2 CI run (`35050442486`) on head `0061c4f2b179c95d9081a883d67d52de76849ce1` completed successfully after correcting a brittle wording assertion:

- `npm ci` — success
- `npm test` — success
- v0 build — success
- v1 build — success
- v1.1 build — success
- `npm run build:review-workbench:v1.2` — success
- v0 / v1 / v1.1 / v1.2 artifact uploads — success

Retained v1.2 artifact from that run:

- artifact id `10428219452`
- archive digest `sha256:99dbcef130cff62a4a276809ff3b3d8de3ed583dd0fd7b0c36d11c6d9521da77`
- generated `index.html`: 489,188 bytes
- generated HTML SHA-256: `bf9f22ffa918d814b3a985c4043a31ba2890d3a8d6c2cf4aa7a06cd3888b55be`
- no external `<script src>` dependency

Static inspection of the exact CI artifact confirms `Start here`, `System map`, `How it works`, `What happens next`, `Show whole diagram`, `Reset positions`, and repeated `Technical details` disclosures are present; `Lock layout`, `Neighbors on`, and `Neighbors off` are absent.

A subsequent `SKILL.md` update made the rule agent-facing. The final current-head CI run after that documentation change is the last repository gate; no v1.2 product source changed after the successful artifact above.

## Stop condition

Stop when the final current-head CI run is green and the v1.2 artifact is handed to the user for comprehension review. Do not add persistence, new diagram types, graph editing, or automated routing until comprehension is reviewed.