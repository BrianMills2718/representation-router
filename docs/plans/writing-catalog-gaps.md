---
schema_version: "1.0"
artifact_type: design_plan
id: writing-catalog-gaps
plan_id: writing-catalog-gaps
status: proposed
planning_path: requested
method_conformance_receipt: docs/plans/writing-catalog-gaps.receipt.json
conflict_surfaces:
  - {kind: repository_path, repository: "brianmills-spec/representation-router", target: "scripts/writing_record.py", access: write}
  - {kind: repository_path, repository: "brianmills-spec/representation-router", target: "catalog/writing-forms.json", access: write}
  - {kind: repository_path, repository: "brianmills-spec/representation-router", target: "test/writing-record.test.mjs", access: write}
  - {kind: repository_path, repository: "brianmills-spec/representation-router", target: "test/fixtures/writing-content-types.json", access: write}
  - {kind: repository_path, repository: "brianmills-spec/representation-router", target: "docs/writing-router.md", access: write}
trace_review_criteria:
  - criterion_id: outcome
    expected_outcome: pass
goal:
  outcome: "Every representative content type in test/fixtures/writing-content-types.json declares to a non-null route, and every no-route declare or check writes a catalog_gap row that writing_record.py gaps summarizes and exits 1 on"
  canonical_example: "declare README.md --medium document with only is_reference_note=yes routes to reference_note governed by the maintain-knowledge skill; declare with every fact no writes a row with catalog_gap true, and gaps --days 7 lists that path and exits 1"
  forbidden_substitutes: "claiming success from a check's last line or exit status alone; a change outside the listed files; a commit without the saved check output"
  boundaries: "only these files: scripts/writing_record.py, catalog/writing-forms.json, test/writing-record.test.mjs, test/fixtures/writing-content-types.json, docs/writing-router.md; no irreversible action and no spend; Brian's request as quoted is the scope"
  done_when: "node --test test/writing-record.test.mjs asserts: each fixture sample (README nav note, wiki index, now/status note, handoff, PR description, one per existing route) declares to its expected route via the real script; every catalog route has at least one sample; a no-route declare and check each write a catalog_gap row with path and facts; gaps exits 1 listing the path and exits 0 on an empty log. npm test exits 0 on the committed change. The check's full output on the parent commit and on the change commit is committed as docs/plans/writing-catalog-gaps.check.txt, and the commit is tagged [Goal writing-catalog-gaps] with an Asked: line quoting the request. python3 \"$SESSION_PLUGIN_ROOT/scripts/durable_docs_check.py\" --repo . --plan docs/plans/writing-catalog-gaps.md --range 15df8884d7396ca7898faac1ec50b95c9d9a27a2..HEAD exits 0 and its output is in the same file."
  do_not_gate_on: "Brian's review of the plan page; work outside the listed files"
---

# Writing router routes short reference notes and PR descriptions, and records every catalog gap

## When a run fails or surprises us

This procedure is separate from the anticipated failure named in the disproof
under Success and disproof: it applies to any run that fails or surprises us.
Preserve the failed run itself: keep its complete output (command, every
line, exit status) and its execution trace id, never overwritten by a rerun.
Before selecting a fix,
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

**Request (verbatim):** Agent feedback AES#676 and AES#677 (problem agent-feedback-log#692), 2026-10-13: short README/index/navigation and status/handoff notes match no route so check fails "no route fits"; prevent with a coverage fixture at authoring time and detect gaps on every no-route result

**Desired result:** Every representative content type in test/fixtures/writing-content-types.json declares to a non-null route, and every no-route declare or check writes a catalog_gap row that writing_record.py gaps summarizes and exits 1 on

**Stable example:** declare README.md --medium document with only is_reference_note=yes routes to reference_note governed by the maintain-knowledge skill; declare with every fact no writes a row with catalog_gap true, and gaps --days 7 lists that path and exits 1

## Authority and non-goals

**Authority:** Brian asked for this change in his own repository; one agent makes it.

**Non-goals:** nothing outside the files listed under Vertical and reset. No irreversible action and no spend.

## Requirements

| Id | Requirement | Source | Check | Status |
| --- | --- | --- | --- | --- |
| R1 | Every representative content type in test/fixtures/writing-content-types.json declares to a non-null route, and every no-route declare or check writes a catalog_gap row that writing_record.py gaps summarizes and exits 1 on | asked: Agent feedback AES#676 and AES#677 (problem agent-feedback-log#692), 2026-10-13: short README/index/navigation and status/handoff notes match no route so check fails "no route fits"; prevent with a coverage fixture at authoring time and detect gaps on every no-route result | the success check under Success and disproof, its output saved as `docs/plans/writing-catalog-gaps.check.txt` | planned, not yet run |
| R2 | Existing records keep their routes: precedence puts the new reference_note route last, so any record whose old facts gave a route still gives the same route | stated with the request | existing route tests in test/writing-record.test.mjs still pass | planned, not yet run |

Requirements the change's own claims imply are listed above as R2 onward.

## Durable documents

This repository declares durable documents (`durable_documents` in `.agentic/repo.yaml`); its declared roles are `goal`, `requirements`, `system_model`, `decisions`, `plans`. Each role named below is one of them (checked by quick-adopt).

Durable documents: system_model#RULE-WRITING-PASS-NEEDS-QUOTE

At completion, `python3 "$SESSION_PLUGIN_ROOT/scripts/durable_docs_check.py" --repo . --plan docs/plans/writing-catalog-gaps.md --range 15df8884d7396ca7898faac1ec50b95c9d9a27a2..HEAD` must exit 0; its full output is appended to `docs/plans/writing-catalog-gaps.check.txt` (the durable-documents check, Plan #61; `durable_docs_check.py` ships in the Company Planning plugin).

## Success and disproof

**Success evidence:** node --test test/writing-record.test.mjs asserts: each fixture sample (README nav note, wiki index, now/status note, handoff, PR description, one per existing route) declares to its expected route via the real script; every catalog route has at least one sample; a no-route declare and check each write a catalog_gap row with path and facts; gaps exits 1 listing the path and exits 0 on an empty log. npm test exits 0 on the committed change.

**Trace review:** two runs of the success check above are judged from their full output: one on the parent commit before the change (the disproof run: it must show the defect or the check failing, which proves the check can fail) and one on the commit that makes the change (the success run); no model, agent or LLM pipeline runs under this plan. Where the trace lives: the check's complete output, with the exact command and its exit status, is saved as `docs/plans/writing-catalog-gaps.check.txt` and committed with the change. What must be seen in it beyond the final result: the command ran against the files listed under Vertical and reset at that commit, each check or test it reports appears by name with its result and none is skipped, and the exit status matches; for each model element listed under System model, the output shows what that line says. Both runs are saved in that one file, each headed by its commit: the disproof condition is judged from both (it holds if the success run still shows the defect, or if the before run already passes, meaning the check cannot detect it), and success from the success run.

**Disproof:** A fixture sample declares to null or an unexpected route, a no-route result writes no catalog_gap row, or gaps exits 0 while gap rows exist

## System model

**System model:** `docs/model/ARCHITECTURE.md`, a file in this repository describing this repository only (not a shared model). Reachable from the documentation entry point `wiki/index.md`, which links `docs/model/ARCHITECTURE.md`.

**Model elements this change adds, changes or relies on, and what the saved check output must show of each:**

- PROC-WRITING-RECORD gains the gaps subcommand and catalog_gap log rows; the test output must show gap rows and the gaps exit status

**Views, freshness and reconciliation:** the applicable view is the requirement-to-verification link in the Requirements table (each requirement and the check that shows it, the check being source-linked by its command); no other view applies because the change adds, changes or relies on no entity, process, record, event or view beyond the elements listed above. Freshness: the model names no drift test, so none runs; the success check is the only freshness evidence for the elements above. If an element above is added, removed or renamed, the model, its view coverage and the saved check output are reconciled in the same commit, and otherwise the model needs no update because the elements keep their meaning.

## Capability reuse

Checked against the capability catalogue in agentic-capability-architecture-canonical (`reuse_candidates.yml` and `capability_registry.yml`):

- No catalogue entry fits, because this is a route and log-row addition inside the existing writing router
- What the work needs that no entry provides: edits to this repository's own files (`scripts/writing_record.py`, `catalog/writing-forms.json`, `test/writing-record.test.mjs`, `test/fixtures/writing-content-types.json`, `docs/writing-router.md`); catalogue entries are cross-project capabilities, and none edits a repository's own source.

## Uncertainties

Material uncertainties. This one is the complete set; it is material because a file outside the list would
make the change exceed this plan's scope.

| Material uncertainty | Owner or resolving evidence |
| --- | --- |
| Whether the change needs files beyond the list below; if so it is out of scope for this plan | Resolved before editing: grep -rn writing_record and writing-forms in README.md SKILL.md docs test: only scripts/writing_record.py, catalog/writing-forms.json, test/writing-record.test.mjs, docs/writing-router.md and docs/model/ARCHITECTURE.md describe or use it |

## Vertical and reset

One vertical over these files (and the saved check output, `docs/plans/writing-catalog-gaps.check.txt`):

- `scripts/writing_record.py`
- `catalog/writing-forms.json`
- `test/writing-record.test.mjs`
- `test/fixtures/writing-content-types.json`
- `docs/writing-router.md`

The vertical delivers: Every representative content type in test/fixtures/writing-content-types.json declares to a non-null route, and every no-route declare or check writes a catalog_gap row that writing_record.py gaps summarizes and exits 1 on It is done when this holds: node --test test/writing-record.test.mjs asserts: each fixture sample (README nav note, wiki index, now/status note, handoff, PR description, one per existing route) declares to its expected route via the real script; every catalog route has at least one sample; a no-route declare and check each write a catalog_gap row with path and facts; gaps exits 1 listing the path and exits 0 on an empty log. npm test exits 0 on the committed change.

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

