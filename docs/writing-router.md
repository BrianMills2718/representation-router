# Writing router

The same question the visual router asks, for prose: which written form answers this reader, in what
order, checked how. Policy `situation-declared-checklists` (project-meta registry), Brian 2026-10-06.

1. **Declare.** `python3 scripts/writing_record.py declare DRAFT --medium MEDIUM --fact ... --rationale ...`
   records yes/no facts with evidence. Code derives the route from them (`catalog/writing-forms.json`,
   `precedence`). Media: web_page, document, chat, email, agent_reply.
2. **Route to the governing guidance.** Every route names the instructions it comes from:

   | Route | Governed by |
   |---|---|
   | Reply or report to Brian | `~/code/AGENTS.md` closing format |
   | Inside Success daily log | `write-dloa` skill |
   | Resume, cover letter, application | `resume-writing` skill and the personal-wiki work record |
   | Slack, DM, chat | `write-slack` skill |
   | Email | `write-slack` skill (Email section: Hello ..., Best,) and the outbound email policy |
   | How-to, finding, argument, tool | Brian's `writing-medium-posts` skill (profiles D, C, B, A) |
   | Proposal, decision brief | this catalog; decision brief follows the AGENTS.md Decision format |
   | Pull request or change description | `~/code/AGENTS.md` "Work and verification" and "Persist and close" |
   | Reference, status or handoff note (README, index, now, snapshot, handoff) | `maintain-knowledge` skill |

   `reference_note` is last in precedence, so a note that also asks for a decision or walks the reader
   through a task takes that route instead. `test/fixtures/writing-content-types.json` lists the common
   content types and the route each must get; `npm test` fails if any comes back with no route.

3. **Check off** each item with `observe DRAFT ITEM pass --quote "exact words"` (or another status with a
   note). Every route also gets `rep-considered` for its medium: on a web page or document, each part is
   checked for whether a figure, table or interactive piece answers the reader better than prose, and
   where it does, the part goes through this router's `recommend` and `disposition`.
4. **Check.** `writing_record.py check DRAFT` exits 0 only when every item passes, and appends one line
   to the daily `situation-checklists` log either way.
5. **No route fits.** When truthful facts give no route but the writing is already governed by a supplied
   contract or an existing authority (a review contract, a machine-consumed progress file), declare it
   with `--no-fit-governed-by PATH_OR_URL`. The record carries an explicit `no_fit` disposition, `check`
   passes on the medium's own items, and the log line's form is `no_fit`, so a route the catalog is
   missing shows up as a count instead of a false declaration. Without a governor, no route still fails.
6. **Catalog gaps.** Every no-route result without a governor, at `declare` and at `check`, appends a row
   with `"catalog_gap": true`, the draft's absolute `path` and its `facts` to the daily log.
   `writing_record.py gaps [--days N]` (default 7) lists those rows by path, with the facts that were yes,
   and exits 1 when any exist, so an audit can run it and open a concern for the missing route.

Enforcement: portfolio articles are gated at merge, preview and publish by the portfolio's own
`tools/check_article_review.py`, whose article routes mirror this catalog's. Messages have no merge step,
so their records are observed (Measured tier) until a send tool checks them.
