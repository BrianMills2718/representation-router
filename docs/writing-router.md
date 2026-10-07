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

3. **Check off** each item with `observe DRAFT ITEM pass --quote "exact words"` (or another status with a
   note). Every route also gets `rep-considered` for its medium: on a web page or document, each part is
   checked for whether a figure, table or interactive piece answers the reader better than prose, and
   where it does, the part goes through this router's `recommend` and `disposition`.
4. **Check.** `writing_record.py check DRAFT` exits 0 only when every item passes, and appends one line
   to the daily `situation-checklists` log either way.

Enforcement: portfolio articles are gated at merge, preview and publish by the portfolio's own
`tools/check_article_review.py`, whose article routes mirror this catalog's. Messages have no merge step,
so their records are observed (Measured tier) until a send tool checks them.
