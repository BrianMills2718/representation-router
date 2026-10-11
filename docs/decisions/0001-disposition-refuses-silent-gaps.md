---
description: Decision that a disposition is refused unless every named checklist item has an explicit status and reason
---

# 0001 Disposition refuses a silently skipped checklist item

Governs: RULE-DISPOSITION-NO-SILENT-GAP, RULE-CHOICE-JUSTIFIED, RULE-ACCEPTANCE-EVIDENCE, RULE-OBSERVATION-DAILY-APPEND, RULE-WRITING-PASS-NEEDS-QUOTE

Status: accepted. Introduced 2026-09-23 in commit `2b3d67d` ("Add a disposition log: refuse
a silently-skipped checklist item"); extended by the composition layer (`4ef5fba`, PR #39:
"score advisory, justification is the record"), approved references with sha256, and the
daily observation log (`df99ecb`, 2026-10-06).

## Context

A recommendation names an avoid list, hard, soft and usability checks and, when
alternatives existed, a choice to justify. A builder can read that list and then simply not
mention an item; a finished-looking page then hides which checks were never looked at.

## Decision

`npm run disposition` (`src/disposition-cli.mjs`, validation in `src/disposition.mjs`)
refuses unless every item the recommendation named has a line with status satisfied, na or
skipped and a non-empty reason. A satisfied approved reference also needs evidence, and the
approved file's sha256 must still match. Accepted runs write one record under
`disposition-logs/`; every run, accepted or refused, appends one line to the day's
situation-checklist log (`src/observation.mjs`). The same shape applies to prose:
`scripts/writing_record.py` accepts a pass only with a quote found verbatim in the draft.

The gate checks completeness, not truth: whether a "satisfied" line is correct stays a
reviewer's job.

## Wrong when

Reviews of dispositioned pages keep finding faults the recommendation named and the
disposition marked satisfied, at a rate no lower than pages built without a disposition
(the gate is producing paperwork, not attention); or agents routinely mark items `na` or
`skipped` with boilerplate reasons, visible as the same reason text repeated across most
lines in `disposition-logs/`.
