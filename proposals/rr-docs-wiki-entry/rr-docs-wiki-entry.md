---
schema_version: "1.0"
artifact_type: design_plan
id: rr-docs-wiki-entry
plan_id: rr-docs-wiki-entry
status: proposed
planning_path: requested
method_conformance_receipt: proposals/rr-docs-wiki-entry/rr-docs-wiki-entry.receipt.json
goal:
  outcome: "The repo has a wiki/index.md that passes the workspace wiki-entry check, and README, TAKEOVER, docs/README and the plan index name hypergraph views as the current work instead of the merged Consolidation v0"
  canonical_example: "README's 'Current project checkpoint' section says hypergraph views is active as of 2026-10-08 and calls Consolidation v0 (PR #24) history; before, it said Consolidation v0 was the active tranche."
  forbidden_substitutes: "claiming success from a check's last line or exit status alone; a change outside the listed files; a commit without the saved check output"
  boundaries: "only these files: wiki/index.md, README.md, TAKEOVER.md, docs/README.md, docs/plans/README.md; no irreversible action and no spend; Brian's request as quoted is the scope"
  done_when: "check_wiki_entry.py prints OK ./wiki/index.md with exit 0, node --test passes including test/docs-consistency.test.mjs, and publish.py --dry-run passes. The check's full output is committed as proposals/rr-docs-wiki-entry/rr-docs-wiki-entry.check.txt, and the commit is tagged [Goal rr-docs-wiki-entry] with an Asked: line quoting the request."
  do_not_gate_on: "Brian's review of the plan page; work outside the listed files"
---

# Representation Router docs match the wiki and documentation policy

## Actor and result

**Actor:** Brian, who asked for this change.

**Request (verbatim):** Brian 2026-10-08 "i feel like we should get the docuemtnation in represneation rotuer to alignw ith docuemtnation and wkki policy"

**Desired result:** The repo has a wiki/index.md that passes the workspace wiki-entry check, and README, TAKEOVER, docs/README and the plan index name hypergraph views as the current work instead of the merged Consolidation v0.

**Stable example:** README's 'Current project checkpoint' section says hypergraph views is active as of 2026-10-08 and calls Consolidation v0 (PR #24) history; before, it said Consolidation v0 was the active tranche.

## Authority and non-goals

**Authority:** Brian asked for this change in his own repository; one agent makes it.

**Non-goals:** nothing outside the files listed under Vertical and reset. No irreversible action and no spend.

## Success and disproof

**Success evidence:** check_wiki_entry.py prints OK ./wiki/index.md with exit 0, node --test passes including test/docs-consistency.test.mjs, and publish.py --dry-run passes.

**Trace review:** the run whose full trace is judged is the success check above, run once on the commit that makes the change; no model, agent or LLM pipeline runs under this plan. Where the trace lives: the check's complete output, with the exact command and its exit status, is saved as `proposals/rr-docs-wiki-entry/rr-docs-wiki-entry.check.txt` and committed with the change. What must be seen in it beyond the final result: the command ran against the files listed under Vertical and reset at that commit, each check or test it reports appears by name with its result and none is skipped, and the exit status matches. Success and disproof are both judged from that file.

**Disproof:** Any of the five files still calls Consolidation v0 or consolidation-dogfood-order.md the active work, or the wiki check or the test suite fails.

## Uncertainties

| Uncertainty | Owner or resolving evidence |
| --- | --- |
| Whether the change needs files beyond the list below; if so it is out of scope for this plan | Resolved before editing: grep -n 'active tranche\|is the active\|is open as of' on main's README.md, TAKEOVER.md, docs/README.md and docs/plans/README.md found the stale lines only in those four files (README 175/177, TAKEOVER 38, docs/README 95); wiki/index.md was missing. This file list is the only material uncertainty and that grep resolves it. |

## Vertical and reset

One vertical over these files (and the saved check output, `proposals/rr-docs-wiki-entry/rr-docs-wiki-entry.check.txt`):

- `wiki/index.md`
- `README.md`
- `TAKEOVER.md`
- `docs/README.md`
- `docs/plans/README.md`

The vertical delivers: The repo has a wiki/index.md that passes the workspace wiki-entry check, and README, TAKEOVER, docs/README and the plan index name hypergraph views as the current work instead of the merged Consolidation v0. It is done when this holds: check_wiki_entry.py prints OK ./wiki/index.md with exit 0, node --test passes including test/docs-consistency.test.mjs, and publish.py --dry-run passes.

Make the change, run the success check, commit. Reset: `git revert` of the commit. Not pursued: anything outside these files.

## Activation facts

No shared mechanism, no comparison, no LLM at the centre, no irreversible action or spend: a bounded change Brian asked for.
