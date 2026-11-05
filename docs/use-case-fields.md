# Use-case fields

Generated from `schemas/use-case.schema.json` by `node scripts/use-case-fields.mjs`; do not edit by hand.
A value outside a listed set is rejected, and the error names the allowed values.

| Field | Required | Values | Note |
| --- | --- | --- | --- |
| `id` | yes | string |  |
| `title` |  | string | Optional short name for the page (a few words), shown as its title; concern keeps the full question. |
| `concern` | yes | string |  |
| `stakeholder` |  | string |  |
| `intent` | yes | list of: `inspect`, `compare`, `understand`, `decide`, `create`, `modify`, `navigate`, `monitor`, `troubleshoot`, `communicate`, `trace` |  |
| `informationStructure` | yes | list of: `scalar`, `list`, `table`, `hierarchy`, `network`, `hypergraph`, `timeline`, `sequence`, `spatial`, `document`, `process`, `state-machine`, `matrix`, `rules` |  |
| `tasks` | yes | list of: `lookup`, `locate`, `filter`, `sort`, `rank`, `correlate`, `trace`, `aggregate`, `annotate`, `select`, `enter`, `confirm`, `compare`, `inspect`, `edit`, `simulate`, `scrub`, `decode-notation`, `follow-trend` | What the reader does with the page. follow-trend: see how a measured value rises and falls over time (a weekly rate, a running total); it favours a line chart over lists that only hold time-stamped items. |
| `itemDetail` |  | `in-page`, `link-out`, `none` | What selecting one item gives the reader. in-page: more about it on this page (fields, a record, a preview). link-out: only a link to somewhere else (a directory, an index of tools or documents). none: the row itself is everything. With link-out or none, views built around a detail pane are set aside: the pane would be empty. |
| `valueShape` |  | `magnitude`, `signed`, `interval` | What each number the reader compares is. magnitude: an amount from zero up (a count, a cost, a score). signed: an effect that can go either way from zero (a change, a difference, a correlation), so the zero line and the direction matter. interval: an estimate with its uncertainty (a mean with a confidence interval, a forecast range), so the range must show, not only the point. Views that hide the sign or the range lose points. |
| `entities` |  | list of string |  |
| `relationshipEnds` |  | list of object | Optional: which object kinds each relationship joins, so the page plan can say what each kind reveals on click and how each link is drawn. |
| `relationshipEnds[].relationship` | yes | string |  |
| `relationshipEnds[].from` | yes | string |  |
| `relationshipEnds[].to` | yes | string |  |
| `relationshipEnds[].directed` |  | boolean | false for a two-way link; omitted means it runs from -> to. |
| `relationships` |  | list of string |  |
| `focus` |  | string |  |
| `explanatoryFocus` |  | list of: `structure`, `mechanism`, `transformation`, `provenance`, `comparison`, `causality`, `uncertainty`, `state`, `flow`, `dataflow`, `interface` |  |
| `surfaceContext` |  | object |  |
| `surfaceContext.repeatedCollection` |  | boolean |  |
| `surfaceContext.neighboringRepresentations` |  | `homogeneous`, `heterogeneous`, `unknown` |  |
| `surfaceContext.sharedInteractionGrammar` |  | boolean |  |
| `surfaceContext.medium` |  | `application`, `dashboard`, `report`, `technical-document`, `presentation`, `portfolio`, `embedded-widget`, `other` |  |
| `scale` | yes | object |  |
| `scale.items` | yes | integer |  |
| `scale.density` | yes | `low`, `medium`, `high` |  |
| `scale.links` |  | integer | How many links the view draws between the items. A node-link or flow view's screen carries items plus links, so both count against the density budget. |
| `interaction` | yes | object |  |
| `interaction.mode` | yes | `read-only`, `exploratory`, `direct-manipulation`, `authoring`, `collaborative` |  |
| `interaction.dynamics` | yes | `static`, `interactive`, `animated`, `simulated`, `playback` |  |
| `audience` |  | object |  |
| `audience.expertise` |  | `novice`, `mixed`, `expert` |  |
| `audience.frequency` |  | `one-off`, `occasional`, `high` |  |
| `audience.domainFamiliarity` |  | `novice`, `mixed`, `expert` |  |
| `audience.notationFamiliarity` |  | `novice`, `mixed`, `expert` |  |
| `audience.visualizationLiteracy` |  | `novice`, `mixed`, `expert` |  |
| `semanticLenses` |  | list of object |  |
| `semanticLenses[].id` | yes | string |  |
| `semanticLenses[].label` | yes | string |  |
| `semanticLenses[].status` | yes | `canonical`, `source-derived`, `interpretive`, `practitioner-specific`, `illustrative`, `speculative` |  |
| `consequence` |  | object |  |
| `consequence.risk` |  | `low`, `medium`, `high` |  |
| `consequence.reversibility` |  | `reversible`, `partially-reversible`, `irreversible` |  |
| `constraints` |  | object |  |
| `constraints.mobile` |  | boolean |  |
| `constraints.viewports` |  | list of object | Screens the page will be read on, in CSS pixels; the plan is budgeted for the one that holds the fewest objects. |
| `constraints.viewports[].label` |  | string |  |
| `constraints.viewports[].width` | yes | integer |  |
| `constraints.viewports[].height` | yes | integer |  |
| `constraints.accessibility` |  | `baseline`, `high` |  |
| `constraints.realtime` |  | boolean |  |
| `constraints.provenance` |  | boolean |  |
| `constraints.allowAggregation` |  | boolean |  |
| `constraints.scripts` |  | `any`, `self-contained`, `none` | What the page may load: any (default); self-contained (one file, nothing fetched from another host or a running service, libraries inlined); none (must work with no JavaScript, e.g. a README, email or PDF). |
| `constraints.arrival` |  | object | How results reach the page: at-once (default); staged (named steps finish one after another, e.g. a pipeline run of 30-90 seconds); streaming (items keep arriving with no end). |
| `constraints.arrival.mode` | yes | `at-once`, `staged`, `streaming` |  |
| `constraints.arrival.stages` |  | list of string |  |
| `constraints.arrival.typicalSeconds` |  | integer |  |
| `constraints.print` |  | boolean | The page must read correctly on paper or as a PDF. |
| `requiredCapabilities` |  | list of string |  |
| `modelData` |  | object | Optional instance-level data for renderer adapters. Shape is adapter-specific; when omitted, previews are explicitly schematic. |
| `representationRole` |  | `explanatory`, `operational`, `analytic`, `authoring`, `audit` |  |
| `abstractionLevel` |  | `caricature`, `overview`, `detailed` |  |
| `concernHierarchy` |  | object |  |
| `concernHierarchy.primary` | yes | string |  |
| `concernHierarchy.secondary` |  | list of string |  |
| `concernHierarchy.assuranceRole` |  | `secondary`, `coequal`, `primary` |  |
| `semanticAvailability` |  | object |  |
| `semanticAvailability.status` | yes | `available`, `partial`, `unavailable` |  |
| `semanticAvailability.present` |  | list of string |  |
| `semanticAvailability.missing` |  | list of string |  |
| `semanticAvailability.note` |  | string |  |
| `learning` |  | object |  |
| `learning.entryMode` |  | `guided`, `practice`, `reference`, `assessment` |  |
| `learning.outcomes` |  | list of: `orientation`, `recognition`, `prediction`, `discrimination`, `composition`, `transfer`, `fluency` |  |
| `learning.scaffolding` |  | `full`, `fading`, `minimal`, `none` |  |
| `learning.predictionBeforeReveal` |  | boolean |  |
| `learning.unseenTransfer` |  | boolean |  |
| `mustShow` |  | list of string | Parts the person named and expects to find on the page, in their words (for example each input category, each destination surface). Each one becomes a required disposition line shows:<part> whose satisfied answer must say where it is visible. |
| `successCriteria` |  | list of string |  |
| `parts` |  | list of object | Sections of one page, in reading order. Each part is a use case for one section: it inherits every field of this page use case and overrides the ones it names (a shallow merge). A use case with parts gets one page plan across the sections (src/page-plan.mjs): one viewport and density budget per screen, one colour and shape per object kind on every section, and the gaps between sections. |
| `parts[].id` | yes | string |  |
| `parts[].title` |  | string |  |
| `parts[].concern` | yes | string |  |
