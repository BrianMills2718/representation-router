# Visual Planning and Review

Use this profile when a person must understand or judge work across plans, architecture, implementation, and evidence, and those truths are expensive to reconstruct from prose, code, tickets, tests, or disconnected tools.

The goal is **not** to replace the planning or review system. Produce the smallest source-bound working surface that makes the current planning or quality-control question answerable.

## Two related modes

### Prospective planning

Use the surface to answer questions such as:

- What outcome are we trying to achieve?
- What work units exist and what depends on what?
- What is blocked or ready next?
- Which architecture or contracts are implicated?
- Which requirements, risks, or assurance obligations are not yet covered?

The output helps a person reason about intended work before or during execution. It does not become the authoritative plan.

### Checkpoint / completed-work review

Use the surface to answer questions such as:

- What was supposed to change?
- What actually changed at the reviewed revision?
- What evidence was executed for that exact subject?
- Where does implementation diverge from the plan or architecture?
- Which claims remain unsupported or partial?
- Which remaining decision genuinely requires human judgment or authority?

The output helps a person review a revision-bound subject. It does not turn test success into human acceptance or local UI state into workflow truth.

## Default linked lenses

Use only the lenses needed by the current question. When several are useful, preserve stable semantic IDs and cross-links between them.

1. **Work** — outcomes, units, dependencies, state, blockers, and next actions.
2. **Architecture** — system boundaries, components, contracts, data/control flow, and current versus proposed structure.
3. **Assurance** — requirements linked to architecture, work, risks, tests, evidence, and uncovered obligations.
4. **Review** — completed changes, demonstrated behavior, limitations, drift, unsupported claims, and decisions requiring human judgment.

The intended flow is:

```text
authoritative plan / goals
        +
architecture / design truth
        +
implementation revision
        +
tests / evidence / observations
        ↓
validated concern-specific projections
        ↓
Work | Architecture | Assurance | Review
        ↓
shared semantic focus + provenance
        ↓
human planning or review decision
        ↓
owning workflow performs any authoritative change
```

## Source boundary

Identify the authoritative plan, architecture sources, implementation revision, evidence, and decision owner before rendering. A visual artifact is a projection over those sources.

- Keep source revision and provenance reachable from visible claims.
- Label proposed, current, partial, unavailable, interpretive, and fixture-backed material distinctly.
- Do not infer governed project semantics from prose merely because a renderer could draw them.
- Do not convert local review state into repository, plan, deployment, or approval truth.
- If a required semantic view cannot be derived safely, show it as unavailable with the reason and required source contract.
- Keep recorded plan state, implementation state, executed evidence, rendered review state, and human disposition separate.

A **temporary validated projection is the default** for a one-off or early workflow. Add a durable repository-owned projection only after repeated use shows that it reduces drift, repeated reconstruction, or review cost. Do not require an owning planning system to adopt Representation Router schemas just to obtain a useful review surface.

## Workflow

1. **Name the human question.** State what the person needs to understand, plan, compare, or decide.
2. **Identify authority.** Pin the plan/source revisions, implementation subject, evidence, and decision owner relevant to that question.
3. **Choose the required lenses.** Do not force Work, Architecture, Assurance, and Review when fewer answer the question.
4. **Build concern-specific projections.** Select only the entities, relationships, derived values, and gaps needed by those lenses.
5. **Validate before rendering.** Check identifiers, edge endpoints, cross-lens references, source revisions, assurance bindings, evidence references, and any domain-owned projection contract.
6. **Choose the smallest useful artifact.** Use a static diagram for a small explanation, linked HTML for exploration/review, and a repository-integrated screen only when repeated operation or authorized write-back actually requires it.
7. **Render realistic states.** Inspect final labels and density, desktop and smallest supported viewport, selection/detail state, cross-lens navigation, and at least one blocked, partial, or unavailable state where relevant.
8. **Hand off the decision.** Present the exact entrypoint, subject/revision, one to three useful actions, expected decision, evidence, and known limitation.

When the supplied model matches the linked weekly-review contract, `scripts/build-weekly-review.mjs` is a reusable implementation. Otherwise adapt the model or use the target project's established renderer rather than forcing incompatible semantics into that template.

## Reviewing a structured proposal or target before implementation

A third case sits before the two modes above: a person must **accept, revise,
or reject a machine-readable proposal or target** (an architecture proposal
with typed references, a project target record, a contract set) when no
implementation exists yet to review. Prose summaries of such records lose the
one property a person needs: whether every promise is reachable from an
outcome and provable by something concrete.

Case observed 2026-09-25 (AES v0.2, `agentic-engineering-system-canonical`
PR #35 and `whygame5/.aes/target.yaml`): a 16-file architecture proposal and a
one-sentence project outcome were both handed to the owner as terminal prose
with lettered options. Both asks contained the decision elements listed under
*Human attention*, but neither gave the person a surface where the coverage
was visible. The retained fix is `whygame5/.aes/generated/review.html`,
rendered by AES `scripts/probe/render_review.py`.

When the subject is a structured record:

1. **Lenses.** Product intent (outcome to normative items), Assurance
   (criterion to evidence requirement to verification subject, with an
   existence or execution mark per subject), Realization map (component to
   planned file, with an existence mark), and the orphan list (files under a
   governed root that nothing planned). Work and Architecture lenses apply
   only when a plan or implementation exists.
2. **Reference graph as evidence.** Run the record's own reference check
   (unresolved refs, duplicate IDs, duplicate paths) independently and show
   the numbers with the method. Zero unresolved references is a consistency
   fact, not architecture acceptance; say so on the page.
3. **Decision at the top.** The pending decision goes first, with the six
   elements under *Human attention*: what is decided, the exact
   subject/revision, why now, supporting evidence, remaining limitation, and
   what each disposition causes. The person should be able to decide from
   that box and section 1 alone.
4. **Explain from zero.** The page must be readable by someone who has none
   of the conversation. Open with what the page is, what it is built from,
   and that it is derived, not authority.
5. **Delivery.** A self-contained HTML file committed in the reviewed
   repository, openable with `file://`, no server, no login. A hosted
   artifact may be added but is never the only copy. Text in the terminal is
   the right surface only when the record is small enough that no coverage
   shape is lost, which for a target with more than a handful of criteria it
   is not.
6. **Route before you build.** Write the use case (`schemas/use-case.schema.json`)
   and run `npm run recommend` on it before choosing a form. The first cut of
   the retained case above was hand-built as tables of full sentences, which
   the owner rejected as "just text, which is the opposite of the point";
   the recommender's answer was a composite linked view (native web, path
   highlighting, inspector), and that is what shipped. A table of sentences
   with borders is prose. Then file the disposition (`npm run disposition`).
7. **Temporary first.** Build the projection as a one-off script that reads
   the record through its owning loader. Promote it to a repository-owned
   command only after a second real use shows it reduced reconstruction or
   review cost.

## Before asking a person to assess anything

An agent about to hand a person a review or decision runs the eight *Workflow*
steps above first, in order, and can name for each: the human question, the
pinned subject and revision, the chosen lenses, the artifact form and why that
form, the file path the person opens, and the one to three dispositions
available. If any of those is missing, the ask is not ready. A decision that
arrives as prose with options is acceptable only when the same information
would not change shape as a page.

## Human attention

Queue a human decision only when judgment, authority, preference, or an irreversible boundary genuinely belongs to the person.

Each decision item should make clear:

- what is being decided;
- which exact subject/revision is being judged;
- why the decision matters now;
- which evidence supports the decision;
- which limitation or uncertainty remains; and
- what each available disposition actually causes.

Do not ask generic usefulness questions when ordinary feedback can be inferred from the conversation or observed action. Request explicit feedback when it changes a pending design, acceptance, or adoption decision.

Review controls remain read-only or surface-local unless an authoritative write-back contract exists. An Approve button must not imply that a plan, merge, deployment, publication, or external workflow mutation occurred.

## Review checks

A planning/review artifact is ready for human use when the person can:

- distinguish intended work structure from system architecture;
- identify what is blocked, ready, partial, or unknown;
- trace a material requirement to relevant architecture, work, implementation, and evidence where those links exist;
- distinguish a test/check definition from evidence that it executed;
- inspect completed work without opening source code first, while still being able to reach exact source when needed;
- identify drift, unsupported claims, and missing evidence;
- see exactly which remaining decisions require human judgment; and
- resolve material displayed claims to their owning source and revision.

Passing tests, screenshots, schema validation, and browser automation establish only the properties they exercise. They do not establish human comprehension, usefulness, adoption, architectural conformance, or acceptance. Use actual human review decisions and observed task performance as evidence for those claims.

## Reusable renderer

For this repository's linked weekly-review workbench:

```bash
npm run build:weekly-review -- \
  --planning-model <planning-model.json> \
  --review-model <review-model.json>
npm run qa:weekly-review
```

The output is `artifacts/weekly-plans-review/index.html`. Keep it local unless publication or deployment is explicitly authorized.
