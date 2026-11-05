# Archived proving apps

These proving apps left the tree on 2026-10-23 (Brian approved, session
`session_01PrNxHAudkcCbB9MJaJ8eKx`). Nothing else in the repository built on them; each had
only its own test, build script and CI step. Git tag `archive/apps-2026-10-23` (commit
`89ea412`) is the last commit that contains them, and it is pushed to `origin`, so the files stay
reachable even if branch history changes.

| Folder | What it was | Plan record |
| --- | --- | --- |
| `review-workbench-v11/` | Review workbench v1.1, interactive architecture views | `docs/plans/interactive-architecture-v1.1.md` |
| `review-workbench-v12/` | Review workbench v1.2, task-first engineering language | `docs/task-first-engineering-language.md` |
| `feature-studio-v0/` | Feature authoring studio v0 | `docs/plans/feature-studio-v0.md` |

Restore one into the working tree:

```bash
git checkout archive/apps-2026-10-23 -- review-workbench-v12 test/task-first-engineering-language.test.mjs
```

Kept on purpose, because other parts still build on them: `review-workbench/` (v0 and v1),
`review-workbench-v13/` (target of `src/feature-draft.mjs`), `review-workbench-v14/` (target of
the implementation-loop examples and receipts), `engineering-studio-v1/` (bundled by Engineering
Home), and `weekly-review/` (served by `deploy/wsl/weekly-review.service`). Moving the whole
engineering-lifecycle cluster into its own repository is the next structural step if it is wanted.
