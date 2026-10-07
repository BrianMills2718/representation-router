# Disposition: public page for the Representation Router

Design authority: the `representation-router` agent, run 2026-09-30 against router commit b8b1b78 (three use cases through
`npm run recommend`: the page, the 23-view comparison, a refusal probe). Reader: a cold visitor from a portfolio, about one minute,
no jargon. Question: "what kind of view fits my situation, and why?"

**Decision.** `composite-linked-view` shell. Primary (about 60%): a sketch of the view the router picked, drawn from the visitor's own
words. Secondary: ranked score bars for all 23 views (the router's `data-table` pick for comparison, drawn as bars). Thin process
strip: words -> structured use case -> 23 views scored -> pick explained. Simple view by default; Advanced adds the use case chips,
the page plan (reading order, density gauge), interaction and checks, runner-up relations, cost/time, raw JSON, on the same marks.

**Rejected.** `scroll-linked-explainer` (router's top score for the page, 60): scrolling breaks the one-screen, one-click, one-minute
goal and the router's own `whole-design-visible-on-one-screen` check. `staged-explanatory-machine`: animation costs seconds. 23 thumbnails
at once: too dense. A wall of text (the old portfolio panel): fails `headline-and-picture-alone-convey-the-point`.

**Built against the checks.** One accent colour for the chosen view (sketch frame, bar, name); greyscale elsewhere; legend above the bars;
ties shown as ties; plain names, no catalog ids, in the simple view; generic placeholder labels drawn grey/italic; refusal shows an empty
dashed frame with the three missing things. Phone width: one column, strip collapses to 2x2, sketch re-laid-out at 360 units with at most 4 marks.

**Deviations / known gaps.** The "time-strip" panel the router adds to every page plan is shown only in Advanced (nothing here changes over
time). The model explains the router's top pick but cannot override it (so the sketch, bars and page plan always agree).
Router observations (not fixed here): scoring sometimes favours a matrix over a network diagram for dependency questions; most
alternative-pair relationships are "unclassified"; some scores tie.
