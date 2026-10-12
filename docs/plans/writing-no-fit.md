---
schema_version: "1.0"
artifact_type: design_plan
id: writing-no-fit
plan_id: writing-no-fit
status: proposed
planning_path: requested
method_conformance_receipt: docs/plans/writing-no-fit.receipt.json
trace_review_criteria:
  - criterion_id: outcome
    expected_outcome: pass
goal:
  outcome: "writing_record.py declare accepts --no-fit-governed-by PATH_OR_URL when the facts give no route; check then passes on the medium items and logs form no_fit"
  canonical_example: "A review report on medium document with every fact no, declared with --no-fit-governed-by review-contract.md (a file in the same workspace), passes check after rep-considered is checked off; the daily log row has form no_fit."
  forbidden_substitutes: "claiming success from a check's last line or exit status alone; a change outside the listed files; a commit without the saved check output"
  boundaries: "only these files: scripts/writing_record.py, test/writing-record.test.mjs, docs/writing-router.md, docs/model/ARCHITECTURE.md; no irreversible action and no spend; Brian's request as quoted is the scope"
  done_when: "node --test test/writing-record.test.mjs: asserts no-route without governor still fails check, a missing governor file is refused (exit 2), a governed no-fit record fails until rep-considered is checked and then exits 0, log rows read [null,false],[no_fit,false],[no_fit,true], and a governor is refused when facts give a route. The check's full output on the parent commit and on the change commit is committed as docs/plans/writing-no-fit.check.txt, and the commit is tagged [Goal writing-no-fit] with an Asked: line quoting the request. python3 \"$SESSION_PLUGIN_ROOT/scripts/durable_docs_check.py\" --repo . --plan docs/plans/writing-no-fit.md --range b273c514d91fecff299710994e34731279d0eb35..HEAD exits 0 and its output is in the same file."
  do_not_gate_on: "Brian's review of the plan page; work outside the listed files"
---

# Writing router accepts an explicit no-fit disposition naming the authority that governs the writing

## When a run fails or surprises us

This procedure is separate from the anticipated failure named in the disproof
under Success and disproof: it applies to any run that fails or surprises us.
Preserve the failed check and its execution trace id. Before selecting a fix,
read the complete inputs, prompts, tool arguments/results, intermediate stages
and final output, including the full check command/output and the changed files.
Cite the observed divergence and classify evidence absent, returned but unused
or contradicted, invalid expectation, or unresolved. An unresolved diagnosis
cannot authorize a causal repair; it permits only further investigation. Bind the targeted repair to a new
traced verification run; retain the failed original. Review every failing or
surprising item and a sample of passes. A complete review is distinct from a
passing run. Criterion `outcome` covers the entire requested success check.

## Actor and result

**Actor:** Brian, who asked for this change.

**Request (verbatim):** Feedback loop (fix owner run for Brian) 2026-10-11, AES issue #405: "Make the writing router and its check accept an explicit no-fit disposition that allows a supplied contract or existing authority to govern when truthful classification matches no catalog route."

**Desired result:** writing_record.py declare accepts --no-fit-governed-by PATH_OR_URL when the facts give no route; check then passes on the medium items and logs form no_fit.

**Stable example:** A review report on medium document with every fact no, declared with --no-fit-governed-by review-contract.md (a file in the same workspace), passes check after rep-considered is checked off; the daily log row has form no_fit.

## Authority and non-goals

**Authority:** Brian asked for this change in his own repository; one agent makes it.

**Non-goals:** nothing outside the files listed under Vertical and reset. No irreversible action and no spend.

## Requirements

| Id | Requirement | Source | Check | Status |
| --- | --- | --- | --- | --- |
| R1 | writing_record.py declare accepts --no-fit-governed-by PATH_OR_URL when the facts give no route; check then passes on the medium items and logs form no_fit. | asked: Feedback loop (fix owner run for Brian) 2026-10-11, AES issue #405: "Make the writing router and its check accept an explicit no-fit disposition that allows a supplied contract or existing authority to govern when truthful classification matches no catalog route." | the success check under Success and disproof, its output saved as `docs/plans/writing-no-fit.check.txt` | planned, not yet run |
| R2 | existing route behaviour unchanged | stated with the request | the six prior writing-record tests still pass | planned, not yet run |
| R3 | durable documents stay consistent | stated with the request | durable_docs_check.py --arc42 --repo <worktree> exits 0 | planned, not yet run |

Requirements the change's own claims imply are listed above as R2 onward.

## Durable documents

This repository declares durable documents (`durable_documents` in `.agentic/repo.yaml`); its declared roles are `goal`, `requirements`, `system_model`, `decisions`, `plans`. Each role named below is one of them (checked by quick-adopt).

Durable documents: system_model#PROC-WRITING-RECORD

At completion, `python3 "$SESSION_PLUGIN_ROOT/scripts/durable_docs_check.py" --repo . --plan docs/plans/writing-no-fit.md --range b273c514d91fecff299710994e34731279d0eb35..HEAD` must exit 0; its full output is appended to `docs/plans/writing-no-fit.check.txt` (the durable-documents check, Plan #61; `durable_docs_check.py` ships in the Company Planning plugin).

## Success and disproof

**Success evidence:** node --test test/writing-record.test.mjs: asserts no-route without governor still fails check, a missing governor file is refused (exit 2), a governed no-fit record fails until rep-considered is checked and then exits 0, log rows read [null,false],[no_fit,false],[no_fit,true], and a governor is refused when facts give a route.

**Trace review:** two runs of the success check above are judged from their full output: one on the parent commit before the change (the disproof run: it must show the defect or the check failing, which proves the check can fail) and one on the commit that makes the change (the success run); no model, agent or LLM pipeline runs under this plan. Where the trace lives: the check's complete output, with the exact command and its exit status, is saved as `docs/plans/writing-no-fit.check.txt` and committed with the change. What must be seen in it beyond the final result: the command ran against the files listed under Vertical and reset at that commit, each check or test it reports appears by name with its result and none is skipped, and the exit status matches; for each model element listed under System model, the output shows what that line says. Both runs are saved in that one file, each headed by its commit: the disproof condition is judged from both (it holds if the success run still shows the defect, or if the before run already passes, meaning the check cannot detect it), and success from the success run.

**Disproof:** check exits 0 for a no-route record with no governor, or accepts a governor when a catalog route fits, or the log row form is not no_fit.

## System model

**System model:** `docs/model/ARCHITECTURE.md`, a file in this repository describing this repository only (not a shared model). Reachable from the documentation entry point `wiki/index.md`, which links `docs/model/ARCHITECTURE.md`.

**Model elements this change adds, changes or relies on, and what the saved check output must show of each:**

- PROC-WRITING-RECORD: check output must show exit 0 with route no_fit only for a governed no-route record, and exit 1 otherwise; model freshness check: durable_docs_check.py --arc42 --repo <worktree> reports findings=0 exit 0 (run 2026-10-11 after the model edit), and the PROC-WRITING-RECORD prose names the no_fit behaviour the new tests assert

**Views, freshness and reconciliation:** the applicable view is the requirement-to-verification link in the Requirements table (each requirement and the check that shows it, the check being source-linked by its command); no other view applies because the change adds, changes or relies on no entity, process, record, event or view beyond the elements listed above. Freshness: the model names no drift test, so none runs; the success check is the only freshness evidence for the elements above. If an element above is added, removed or renamed, the model, its view coverage and the saved check output are reconciled in the same commit, and otherwise the model needs no update because the elements keep their meaning.

## Capability reuse

Checked against the capability catalogue in agentic-capability-architecture-canonical (`reuse_candidates.yml` and `capability_registry.yml`):

- No catalogue entry fits, because this extends the existing writing router CLI in place rather than adding a capability
- What the work needs that no entry provides: edits to this repository's own files (`scripts/writing_record.py`, `test/writing-record.test.mjs`, `docs/writing-router.md`, `docs/model/ARCHITECTURE.md`); catalogue entries are cross-project capabilities, and none edits a repository's own source.

## Uncertainties

Material uncertainties. This one is the complete set; it is material because a file outside the list would
make the change exceed this plan's scope.

| Material uncertainty | Owner or resolving evidence |
| --- | --- |
| Whether the change needs files beyond the list below; if so it is out of scope for this plan | Resolved before editing: git diff --stat in the worktree: 4 files (scripts/writing_record.py, test/writing-record.test.mjs, docs/writing-router.md, docs/model/ARCHITECTURE.md) |

## Vertical and reset

One vertical over these files (and the saved check output, `docs/plans/writing-no-fit.check.txt`):

- `scripts/writing_record.py`
- `test/writing-record.test.mjs`
- `docs/writing-router.md`
- `docs/model/ARCHITECTURE.md`

The vertical delivers: writing_record.py declare accepts --no-fit-governed-by PATH_OR_URL when the facts give no route; check then passes on the medium items and logs form no_fit. It is done when this holds: node --test test/writing-record.test.mjs: asserts no-route without governor still fails check, a missing governor file is refused (exit 2), a governed no-fit record fails until rep-considered is checked and then exits 0, log rows read [null,false],[no_fit,false],[no_fit,true], and a governor is refused when facts give a route.

Make the change, run the success check before and after it, commit. Reset: `git revert` of the commit. Not pursued: anything outside these files. This plan adds no coordinated-work ceremony: no work-unit graph, no review or release contract, no claim beyond the repository's own rules.

## Activation facts

Each fact, with its value and why:

- `shared_mechanism`: false -- the change edits only the listed files and adds no contract, algorithm or mechanism other code uses.
- `empirical_comparison_proposed`: false -- no alternatives are compared; the success check verifies the one change.
- `llm_central`: false -- the change makes no model call.
- `irreversible_or_spend_action`: false -- the change is reverted by `git revert` and spends nothing.
- `claims_external_standard`: false -- the work claims no external standard, schema or contract.
- `aes_governed_target`: false -- this repository has no `.aes/target.yaml` (checked by quick-adopt).
- `durable_documents_declared`: true -- derived, `.agentic/repo.yaml` has `durable_documents`; see Durable documents.

