# Figma as a review surface (deferred)

Status: deferred. Brian, 2026-11-05: "lets defer the figma decision with some docuemtnation in represtnation router
for now". Nothing here is a routing rule; the router does not recommend Figma until this is decided and tested.

## What it would do

When a page's look is the open question (layout, spacing, which of two or three variants), the agent can put the real
page into Figma as editable layers, in two or three versions. Brian moves, edits and leaves notes on the canvas
instead of describing changes in text; the agent reads the edited frames back and changes the code to match. This is
the variant step the router already asks for (show visual choices as variants, not as text questions), with direct
editing added.

## What it would replace or add

- Today: variants are separate rendered pages or a sketch set (`npm run sketch-set`), and Brian answers in words.
- With Figma: the same variants on one canvas that he can edit by hand. Code stays the source; Figma is a review copy.

## Limits found on 2026-11-05

- The free plan allows about 6 to 20 tool calls a month, too few for one review round.
- Professional with a Full seat is $16 a month and allows 200 calls a day.
- The agent's tools cannot read ordinary Figma comments; notes must be text on the canvas.
- Sign-in: in Claude Code, `/mcp`, the `figma` server, Authenticate.

Source: the plugin comparison in code2-workspace,
[`proposals/harness-review/plugin-compare.md`](https://github.com/BrianMills2718/code2-workspace/blob/main/proposals/harness-review/plugin-compare.md)
(Figma paragraph), and open question Q37 in that repository's planning package.

## What would settle it

One real page reviewed both ways (variants as pages versus variants in Figma), with Brian saying which was easier.
That is acceptance criterion A16's Figma row in code2-workspace. Until then the router keeps its current variant step.
