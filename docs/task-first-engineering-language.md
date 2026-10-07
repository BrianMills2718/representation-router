# Task-first engineering language

This document is **human-interface guidance for working surfaces and proving/reference applications**. It does not expand Representation Router's core ownership into planning, implementation, deployment, operations, or other product workflows.

Representation Router should help people perform real software-engineering work without requiring prior familiarity with the vocabulary of the implementation.

The goal is not to create a simplified parallel world for "nontechnical" users. The goal is to make planning, architecture, implementation, testing, review, release, operations, and product behavior **legible and operable first**, while preserving a path to exact technical detail, source, evidence, code, and formal notation.

A person should be able to become more technically capable through the surface instead of being blocked by terminology before they can act.

## Core rule

> **Lead with the job. Teach the technical language in context. Preserve the exact truth underneath.**

Primary UI copy should answer questions such as:

- What changed?
- Why does it matter?
- What should I inspect?
- What depends on this?
- What happens next?
- What proves this claim?
- What can I change?
- What is still waiting on a person?

Internal terms such as `ViewSpec`, `SurfaceSpec`, semantic identity, projection, provenance, representation family, or graph neighborhood may still be important. They should appear when they add explanatory value, not as entry requirements for using the surface.

## Technical depth ladder

A good working surface supports at least three levels without creating separate truths.

### 1. Task language

The first successful interaction uses ordinary language tied to the human job.

Examples:

- `Show whole diagram` instead of `Fit view`
- `Reset positions` instead of `Reset layout`
- `Connections` instead of `Neighborhood`
- `Source` instead of making `Provenance` the primary label
- `What this does not mean` instead of `Nonclaim`
- `See related requirements` instead of `Cross-lens navigation`

### 2. Engineering structure

Once the person is oriented, expose real architecture, state, sequence, requirements, evidence, contracts, boundaries, tests, and source relationships.

The representation should not hide complexity that is necessary for the task. It should organize it around the question being answered.

### 3. Exact technical detail

The same surface should permit inspection of:

- formal type / relationship names;
- stable semantic IDs;
- schema fields;
- exact source paths;
- source revisions / commits;
- evidence receipts;
- code or configuration;
- formal notation when useful.

Use disclosure such as `Technical details`, `Source`, `Open exact source`, or an expert inspector. Do not create a second simplified truth model.

## Capability before terminology

A user should be able to perform a correct task before memorizing the name of the mechanism that supports it.

For example, a user can:

1. select a component;
2. see what directly connects to it;
3. inspect why an arrow exists;
4. follow the related evidence;
5. only then encounter the terms `dependency`, `semantic identity`, or `provenance` if those terms help them reason more precisely.

This supports learning through use rather than requiring a glossary exam before participation.

## Prefer automatic context over configuration

Do not expose a control when the system can apply the useful behavior safely and predictably.

Examples:

- selecting a graph node should normally highlight direct connections automatically;
- selecting an edge should automatically emphasize its endpoints;
- the inspector should automatically show the relevant source/evidence;
- a representation switch should preserve focus when semantic identity is shared.

Expose a control only when the user faces a meaningful choice.

`Neighbors on/off` is usually implementation language for behavior that should simply happen. `Lock layout` should not occupy primary UI unless accidental movement is a demonstrated user problem.

## Controls describe intent, not algorithms

Primary labels should name what the person wants to accomplish.

Prefer:

- `Show whole diagram`
- `Reset positions`
- `Show connections`
- `See related evidence`
- `Open source`
- `Compare with plan`
- `See what happens next`

Avoid primary labels such as:

- `Fit`
- `Neighborhood`
- `Semantic focus`
- `Projection`
- `Cross-lens`
- `Surface-local`

Those terms may remain in technical details or developer documentation.

## Explain relationships as carefully as objects

In software engineering, the relationship can carry more meaning than either endpoint.

A selected relationship should expose:

1. **Connects** — the two exact semantic subjects;
2. **What this relationship means** — plain-language explanation;
3. **Why it matters** — task consequence when relevant;
4. **Evidence** — what supports the relationship;
5. **Source** — where the claim came from;
6. **What this does not mean** — guard against overinterpretation;
7. **Technical details** — formal relationship type / ID / authority semantics.

Do not force the user to infer meaning from an arrowhead or color alone.

## Progressive disclosure is not loss of rigor

Plain language is the first layer, not a replacement for technical precision.

A representation fails if it makes the first screen easy by making the underlying truth unrecoverable. Preserve stable identity and source traceability so the person can move from:

```text
plain explanation
  -> structured visual model
  -> exact technical concept
  -> source / code / evidence / revision
```

and back again without changing subjects.

## Mixed fluency is the normal case

Do not treat "technical" and "nontechnical" as two permanent user classes. A product owner may understand domain behavior deeply but not source-code syntax. An engineer may understand code but not a defense-architecture framework. A reviewer may learn the exact technical concept through repeated use of the surface.

Model the task, concern, and current notation/domain familiarity. Let the surface support movement toward deeper engineering fluency.

## End-to-end proving-surface target

Reference applications may test whether representation guidance can support coherent participation across:

```text
outcome / problem
 -> requirements
 -> architecture / design
 -> contracts / data / behavior
 -> implementation
 -> tests / evidence
 -> code review
 -> release / deployment
 -> runtime / operations
 -> product UI
 -> learning / documentation
```

The representation at each checkpoint may differ, but the person should retain orientation, semantic identity, provenance, and a path to the next engineering action.

The ambition is to make engineering workflows more legible and accessible **through product-owned working surfaces**. Representation Router contributes reusable representation policy and authority boundaries; the consuming systems continue to own the workflow, state, execution, and effects.

## Review-surface checklist

Before accepting a working surface, ask:

- Can a first-time user tell what this surface is for within about 30 seconds?
- Does the first screen lead with the task/outcome rather than internal architecture vocabulary?
- Are primary controls named after user intent?
- Are useful contextual behaviors automatic unless there is a real choice?
- Can the user inspect relationships, not only objects?
- Can the user reach exact technical detail and source without leaving the subject they were inspecting?
- Are evidence and limitations adjacent?
- Does the surface teach terminology in context when the terminology improves reasoning?
- Can a more experienced user go deeper without switching to a separate truth model?
- Does interaction preserve the boundary between presentation state and authoritative semantic/workflow state?

## Success criteria

Prefer observable capability measures over vocabulary recall.

Examples:

- a first-time reviewer can explain what changed and why;
- a user can locate what depends on a selected component;
- a user can trace a requirement to implementation and evidence;
- a user can distinguish automated verification from human approval;
- a user can identify the authoritative source behind a visible claim;
- a user can predict the next lifecycle state and who has authority to trigger it;
- a user can move from a plain explanation to the exact source/code when needed;
- after repeated use, a user can correctly use the technical terms the surface has introduced in context.

The target is increased engineering agency and correctness, not reduced terminology for its own sake.
