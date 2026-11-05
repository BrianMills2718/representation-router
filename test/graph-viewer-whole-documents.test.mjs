import assert from "node:assert/strict";
import { test } from "node:test";
import { validateTypedGraph, childrenOf, defaultOpen, openToKind, visibleGraph, laneLayout, estimateSize, resolveSource, SCHEMA } from "../graph-viewer/src/model.mjs";
import { documentsToTypedGraph, turnsOf } from "../graph-viewer/src/adapters/claim-batch.mjs";

// A tiny outline: one document holding two turns, the first holding two claims; a person outside.
const outline = {
  schema: SCHEMA,
  kinds: { doc: { label: "Document" }, turn: { label: "Turn", collapsed: true }, claim: { label: "Claim" }, person: { label: "Person" } },
  nodes: [
    { id: "d", label: "Hearing", kind: "doc", lane: "L" },
    { id: "t2", label: "Turn 2", kind: "turn", parent: "d", order: 2 },
    { id: "t1", label: "Turn 1", kind: "turn", parent: "d", order: 1, source: { text: "Mr. A. The sky is not green." } },
    { id: "c1", label: "The sky is not green", kind: "claim", parent: "t1", source: { from: "t1", start: 7, end: 27 } },
    { id: "c2", label: "Second claim", kind: "claim", parent: "t1" },
    { id: "p", label: "Mr. A", kind: "person" },
  ],
  edges: [
    { id: "p-d", source: "p", target: "d", label: "speaks in" },
    { id: "p-t1", source: "p", target: "t1", label: "speaks", quiet: true },
    { id: "p-t2", source: "p", target: "t2", label: "speaks", quiet: true },
  ],
  layout: { algorithm: "lanes", lanes: [{ id: "L", label: "Lane" }] },
};

test("containment is checked: unknown parents, parent cycles, unknown lanes and sources are reported", () => {
  assert.deepEqual(validateTypedGraph(outline), []);
  const bad = { ...outline, nodes: [...outline.nodes, { id: "x", label: "x", parent: "nope" }, { id: "y", label: "y", parent: "z" }, { id: "z", label: "z", parent: "y" }, { id: "w", label: "w", lane: "Q" }, { id: "v", label: "v", source: { from: "gone" } }] };
  const problems = validateTypedGraph(bad).join("\n");
  assert.match(problems, /x parent nope is not a node/);
  assert.match(problems, /parent cycle/);
  assert.match(problems, /lane Q is not in layout.lanes/);
  assert.match(problems, /source.from gone is not a node/);
});

test("children keep document order; kinds marked collapsed start closed", () => {
  assert.deepEqual(childrenOf(outline).get("d"), ["t1", "t2"]);
  const open = defaultOpen(outline);
  assert.ok(open.has("d"));
  assert.ok(!open.has("t1"), "turns start closed");
});

test("a closed node hides and counts what it holds; nothing is dropped and edges move to what is shown", () => {
  const v = visibleGraph(outline, defaultOpen(outline));
  assert.deepEqual(v.nodes.map((n) => n.id).sort(), ["d", "p", "t1", "t2"]);
  assert.deepEqual(v.nodes.find((n) => n.id === "t1").hidden, { claim: 2 });
  assert.deepEqual(v.counts.claim, { shown: 0, total: 2 });
  assert.ok(v.edges.some((e) => e.containment && e.source === "d" && e.target === "t1"));
  assert.ok(v.edges.some((e) => e.id === "p-t1" && e.quiet), "quiet edges stay quiet");
  // Close the document: both quiet turn links fold into one link to it, counted.
  const closed = visibleGraph(outline, new Set());
  assert.deepEqual(closed.nodes.map((n) => n.id).sort(), ["d", "p"]);
  assert.deepEqual(closed.nodes.find((n) => n.id === "d").hidden, { turn: 2, claim: 2 });
  const folded = closed.edges.find((e) => e.merged);
  assert.equal(folded.label, "speaks ×2");
  assert.ok(folded.quiet);
  assert.ok(closed.edges.some((e) => e.id === "p-d" && !e.quiet));
});

test("one control opens a whole level", () => {
  const v = visibleGraph(outline, openToKind(outline, "claim", defaultOpen(outline)));
  assert.deepEqual(v.counts.claim, { shown: 2, total: 2 });
});

test("lanes layout: an outline per lane in order, the shared lane holds lane-less nodes, every edge is routed", () => {
  const v = visibleGraph(outline, openToKind(outline, "claim", defaultOpen(outline)));
  const sizes = Object.fromEntries(v.nodes.map((n) => [n.id, estimateSize(n)]));
  const layout = laneLayout(v, sizes);
  const at = Object.fromEntries(layout.children.map((c) => [c.id, c]));
  assert.deepEqual(layout.lanes.map((l) => l.label), ["Shared", "Lane"], "shared lane inserted at the middle index");
  assert.ok(at.d.y < at.t1.y && at.t1.y < at.c1.y && at.c1.y < at.c2.y && at.c2.y < at.t2.y, "document order top to bottom");
  assert.ok(at.c1.x > at.t1.x && at.t1.x > at.d.x, "children indented under their container");
  assert.ok(at.p.x + at.p.width < at.d.x, "shared lane sits in its own column");
  for (const e of v.edges) assert.ok(layout.routes[e.id]?.length >= 2, `edge ${e.id} has a route`);
  const boxes = layout.children;
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i], b = boxes[j];
    assert.ok(!(a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height), `${a.id} overlaps ${b.id}`);
  }
});

test("source text follows source.from and clamps the highlighted span", () => {
  const c1 = outline.nodes.find((n) => n.id === "c1");
  const s = resolveSource(outline, c1);
  assert.equal(s.text.slice(s.start, s.end), "The sky is not green");
  assert.equal(resolveSource(outline, { source: { text: "abc", start: 2, end: 99 } }).end, 3);
  assert.equal(resolveSource(outline, { label: "none" }), null);
});

// Two small transcripts in onto-canon6's shapes (AtomicSourceDocumentV1 + SourceBackedClaimBatchV1).
function transcript(ref, turns) {
  let pos = 0, n = 0;
  const atoms = [];
  for (const [ordinal, speaker, ...parts] of turns) for (const text of parts) {
    atoms.push({ atom_id: `satom1_${ref}_${n}`, ordinal: ++n, unit_kind: "transcript_passage", locator: { turn_ordinal: ordinal, speaker_label: speaker, start_char: pos, end_char: pos + text.length }, exact_text: text });
    pos += text.length;
  }
  return { source_ref: `greer:${ref}`, atoms };
}
const claim = (id, atom, start, end, statement, attribution = {}) => ({ producer_claim_id: id, producer_run_id: "run", statement, ...attribution, evidence_spans: [{ text: atom.exact_text.slice(start - atom.locator.start_char, end - atom.locator.start_char), locator: { passage_id: atom.atom_id, start_char: start, end_char: end } }] });

const a = transcript("a", [[0, null, "Front matter. "], [1, "Mr. Grusch", "Mr. Grusch. I was told of a program. ", "It did not stop. "], [2, "Ms. Luna", "Ms. Luna. Who told you? "]]);
const b = transcript("b", [[1, "Ms. Luna", "Ms. Luna. Welcome. "], [2, "Mr. Gold", "Mr. Gold. Thank you. "]]);
const docs = [
  { id: "a", title: "Hearing A", date: "2023-07-26", leadingCharsStripped: 1, passages: a,
    claimBatch: { batch_id: "scbatch1_a", candidates: [
      claim("meaning_000002", a.atoms[2], a.atoms[2].locator.start_char, a.atoms[2].locator.start_char + 15, "It did not stop.", { original_claimant: "Mr. Knapp", stance: "relays" }),
      claim("meaning_000001", a.atoms[1], a.atoms[1].locator.start_char + 12, a.atoms[1].locator.start_char + 36, "Grusch was told of a program.", { original_claimant: "Mr. GRUSCH", stance: "asserts" }),
      claim("meaning_000003", a.atoms[3], a.atoms[3].locator.start_char + 10, a.atoms[3].locator.start_char + 23, "Luna asks who told Grusch.", { original_claimant: "Ms. Luna", stance: "asks" }),
    ] } },
  { id: "b", title: "Hearing B", passages: b, sameClaimant: { "Ms. Luna": ["Anna Paulina Luna"] }, claimBatch: { batch_id: "scbatch1_b", candidates: [
    claim("meaning_000001", b.atoms[0], b.atoms[0].locator.start_char + 10, b.atoms[0].locator.start_char + 18, "Luna welcomes the witnesses."),
    claim("meaning_000002", b.atoms[0], b.atoms[0].locator.start_char + 10, b.atoms[0].locator.start_char + 18, "Luna says welcome.", { original_claimant: "Anna Paulina Luna", stance: "asserts" }),
    claim("meaning_000003", b.atoms[1], b.atoms[1].locator.start_char + 10, b.atoms[1].locator.start_char + 20, "Gold says he gave no thanks.", { original_claimant: "Mr. Gold", stance: "denies" }),
  ] } },
];

test("turns are rebuilt from passages in order, with each turn's exact text", () => {
  const turns = turnsOf(a);
  assert.deepEqual(turns.map((t) => [t.ordinal, t.speaker, t.atoms.length]), [[0, null, 1], [1, "Mr. Grusch", 2], [2, "Ms. Luna", 1]]);
  assert.equal(turns[1].text, "Mr. Grusch. I was told of a program. It did not stop. ");
});

test("documents become one lanes graph: structure kept, claims under their passage, people linked across documents", () => {
  const g = documentsToTypedGraph(docs, { blocks: 2 });
  assert.deepEqual(validateTypedGraph(g), []);
  assert.equal(g.layout.algorithm, "lanes");
  assert.deepEqual(g.layout.lanes.map((l) => l.id), ["a", "b"]);
  const byId = new Map(g.nodes.map((n) => [n.id, n]));
  // Turn 1 of A splits into two passages, so its claims sit under passages; turn 2's claim sits under the turn.
  const negative = g.nodes.find((n) => n.label === "It did not stop.");
  assert.equal(negative.kind, "relayed-claim", "claimant is not the speaker -> relayed");
  assert.equal(negative.details.find(([k]) => k === "Original claimant")[1], "Mr. Knapp");
  assert.match(negative.explain, /^Mr\. Grusch relays\. Original claimant: Mr\. Knapp \(relayed/);
  assert.equal(byId.get(negative.parent).kind, "passage");
  assert.equal(g.nodes.find((n) => n.label === "Grusch was told of a program.").kind, "claim", "same name in other letter case -> not relayed");
  const alias = g.nodes.find((n) => n.label === "Luna says welcome.");
  assert.equal(alias.kind, "claim", "listed other spelling of the speaker -> not relayed");
  assert.ok(alias.details.some(([k]) => k === "Claimant spelling"));
  assert.equal(g.nodes.find((n) => n.label === "Gold says he gave no thanks.").kind, "denied-claim");
  const question = g.nodes.find((n) => n.label === "Luna asks who told Grusch.");
  assert.equal(question.kind, "question");
  assert.equal(byId.get(question.parent).kind, "turn");
  const unbound = g.nodes.find((n) => n.label === "Luna welcomes the witnesses.");
  assert.equal(unbound.kind, "unbound-claim", "no stance -> shown as not recorded, not dropped");
  assert.equal(unbound.details.find(([k]) => k === "Stance of the speaker")[1], "not recorded");
  assert.match(byId.get("doc::b").explain, /1 denied by the speaker/);
  // The box's "relayed" count is the number of relayed-claim nodes (what the legend and facts line count);
  // the wider "claimant is not the speaker" count also takes in denials and questions about someone else.
  for (const docNode of g.nodes.filter((n) => n.kind === "document")) {
    const detail = (k) => Number(docNode.details.find(([key]) => key === k)[1]);
    const prefix = `${docNode.id}::`;
    const relayedNodes = g.nodes.filter((n) => n.id.startsWith(prefix) && n.kind === "relayed-claim").length;
    assert.equal(detail("Relayed from someone else"), relayedNodes, `${docNode.id}: relayed count matches relayed-claim nodes`);
    assert.ok(detail("Claimant is not the speaker (relayed, denied or asked)") >= relayedNodes);
    assert.match(docNode.explain, new RegExp(`\\(${relayedNodes} relayed from someone else`));
  }
  // Claim source points into its turn's text at the exact span.
  const s = resolveSource(g, negative);
  assert.equal(s.text.slice(s.start, s.end), "It did not stop");
  // File positions add back the stripped leading character.
  assert.match(negative.details.find(([k]) => k === "Characters in source file")[1], /^52–67 \(offsets \+1/);
  // Turn labels drop the repeated printed speaker name.
  assert.equal(byId.get("doc::a::turn::1").label, "1. Mr. Grusch: I was told of a program. It did not stop.");
  // People: Ms. Luna speaks in both hearings (shared, top level); the others are grouped per hearing.
  assert.equal(byId.get("person::Ms. Luna").kind, "person-shared");
  assert.equal(byId.get("person::Ms. Luna").parent, undefined);
  assert.equal(byId.get("person::Mr. Grusch").parent, "people-only::a");
  assert.equal(byId.get("person::Mr. Gold").parent, "people-only::b");
  assert.ok(g.edges.some((e) => e.source === "person::Ms. Luna" && e.target === "doc::b" && !e.quiet));
  assert.ok(g.edges.some((e) => e.source === "person::Ms. Luna" && e.target === "doc::a::turn::2" && e.quiet));
  // Every claim survives into the graph.
  const claimKinds = new Set(["claim", "relayed-claim", "denied-claim", "question", "unbound-claim"]);
  assert.equal(g.nodes.filter((n) => claimKinds.has(n.kind)).length, 6);
  // Default view: hearings and turn groups, claims hidden but counted.
  const v = visibleGraph(g, defaultOpen(g));
  assert.equal(v.counts["relayed-claim"].shown, 0);
  assert.equal(v.counts["relayed-claim"].total, 1);
  assert.equal(v.counts["denied-claim"].total, 1);
  assert.ok(v.nodes.some((n) => n.kind === "block" && n.hidden));
});

test("labels that are not people keep their turns but get no person box and no cross-document match", () => {
  const c = transcript("c", [[1, "Ms. Luna", "Ms. Luna. Hello again. "], [2, "PREPARED STATEMENT OF X", "PREPARED STATEMENT OF X. Text. "]]);
  const heading = c.atoms[1];
  const three = [...docs, { id: "c", title: "Hearing C", passages: c, claimBatch: { candidates: [
    claim("meaning_000001", heading, heading.locator.start_char + 25, heading.locator.start_char + 30, "The paper has text.", { original_claimant: "PREPARED STATEMENT OF X", stance: "asserts" }),
  ] },
    notPeople: { "Ms. Luna": "OCR fragment, not a speaker", "PREPARED STATEMENT OF X": "a printed heading; the witness is not named here" } }];
  const g = documentsToTypedGraph(three, { blocks: 2 });
  assert.deepEqual(validateTypedGraph(g), []);
  const byId = new Map(g.nodes.map((n) => [n.id, n]));
  assert.ok(!byId.has("person::PREPARED STATEMENT OF X"), "no person box for a heading");
  assert.ok(!g.edges.some((e) => e.target === "doc::c"), "nothing in C is matched to a person");
  assert.equal(byId.get("person::Ms. Luna").kind, "person-shared", "still shared between A and B");
  const turn = byId.get("doc::c::turn::2");
  assert.ok(turn.details.some(([k, v]) => k === "Not a person" && /heading/.test(v)));
  assert.match(turn.label, /^2\. "PREPARED STATEMENT OF X" \(not a person\): /);
  const own = g.nodes.find((n) => n.label === "The paper has text.");
  assert.equal(own.kind, "claim", "a heading credited as its own claimant is not relayed");
  assert.equal(own.details.find(([k]) => k === "Original claimant")[1], '"PREPARED STATEMENT OF X" (not a person)');
});

test("cross-document links (0.11.0): exact places at both ends, side-by-side quotes, buttons on the claims they touch", () => {
  const t1 = a.atoms[1].locator.start_char + 12, t1end = a.atoms[1].locator.start_char + 36;  // "I was told of a program."
  const w = b.atoms[0].locator.start_char + 10, wend = b.atoms[0].locator.start_char + 18;  // "Welcome."
  const g = documentsToTypedGraph(docs, {
    blocks: 2,
    crossLinks: [{ id: "L1", label: "retells · strengthened", relation: "retells", color: "#4c8ed9", explain: "why", details: [["Fidelity", "strengthened"]],
      from: { doc: "b", start: w, end: wend, ref: "lines 3-3" }, to: { doc: "a", start: t1, end: t1end, ref: "lines 9-9" },
      fromClaims: ["meaning_000001"], toClaims: ["meaning_000001"] }],
  });
  assert.deepEqual(validateTypedGraph(g), []);
  const byId = new Map(g.nodes.map((n) => [n.id, n]));
  const edge = g.edges.find((e) => e.id === "link::L1");
  assert.equal(edge.color, "#4c8ed9");
  const to = byId.get(edge.target), from = byId.get(edge.source);
  assert.equal(to.kind, "place");
  assert.equal(to.parent, "doc::a::turn::1");
  const src = resolveSource(g, to);
  assert.equal(src.text.slice(src.start, src.end), "I was told of a program.");
  assert.equal(edge.compare[0].node, to.id, "the earlier (target) place is shown first");
  assert.equal(edge.compare[1].node, from.id);
  assert.deepEqual(byId.get("doc::b::claim::meaning_000001").links, ["link::L1"]);
  assert.deepEqual(byId.get("doc::a::claim::meaning_000001").links, ["link::L1"]);
  assert.deepEqual(byId.get("doc::a::turn::1").links, ["link::L1"]);
  assert.throws(() => documentsToTypedGraph(docs, { crossLinks: [{ id: "x", from: { doc: "zz", start: 0, end: 1 }, to: { doc: "a", start: t1, end: t1end } }] }), /unknown document zz/);
});

test("identity groups (0.11.0) make one person of several name forms and credit them with claims", () => {
  const g = documentsToTypedGraph(docs, {
    people: [{ id: "grusch", name: "David Grusch", reason: "same witness", members: [{ doc: "a", label: "Mr. Grusch", role: "speaker" }, { doc: "a", label: "Mr. GRUSCH", role: "claimant" }, { doc: "b", label: "Mr. Gold", role: "claimant" }] }],
  });
  assert.deepEqual(validateTypedGraph(g), []);
  const person = g.nodes.find((n) => n.id === "person::grusch");
  assert.equal(person.label, "David Grusch");
  assert.equal(person.kind, "person-shared", "spoken in A, credited in B: in two documents");
  assert.ok(!g.nodes.some((n) => n.id === "person::Mr. Grusch"), "the printed label no longer stands alone");
  assert.ok(g.edges.some((e) => e.source === "person::grusch" && e.target === "doc::a::claim::meaning_000001" && e.label === "credited with"));
  assert.ok(g.edges.some((e) => e.source === "person::grusch" && e.target === "doc::b::claim::meaning_000003"));
  assert.ok(g.edges.some((e) => e.source === "person::grusch" && e.target === "doc::a::turn::1" && e.label === "speaks"));
});
