// Whole documents as one typed graph: each document keeps its structure (document -> blocks of
// speaker turns -> turns in order -> passages where a turn splits -> claims), several documents sit
// side by side in lanes, and people who speak in more than one document are linked across them.
// "A line in a speech does not stand alone" (Brian, 2026-10-26): every claim stays inside the turn
// and passage it came from, and clicking it shows that exact source text.
//
// Input per document (all from onto-canon6's claim path, no greer-specific fields):
//   passages:   AtomicSourceDocumentV1 (atoms[] with atom_id, locator {turn_ordinal, speaker_label,
//               start_char, end_char}, exact_text). Offsets index the source text the producer read.
//   claimBatch: SourceBackedClaimBatchV1 (candidates[] with producer_claim_id, statement,
//               evidence_spans[].locator {passage_id, start_char, end_char}, and the optional
//               attribution fields original_claimant and stance: asserts | denies | relays | asks |
//               answers, data-contracts #41). A claim with no stance shows as "no stance recorded".
//               No original_claimant means the speaker of the turn is the claimant.
//   sameClaimant: optional {printed speaker label: [claimant names]}: other spellings of that
//               speaker ("Ms. Mace" -> "Nancy Mace"), so those claims are not shown as relayed.
//               Names equal apart from letter case ("Dr. HARDER", "Dr. Harder") match unlisted.
//   leadingCharsStripped: characters the producer stripped from the front of the file, added back
//               when the page quotes file positions.
// Output: typed-graph/v1 with layout.algorithm "lanes" (graph-viewer 0.9.0).

import { SCHEMA } from "../model.mjs";

export const CLAIM_GRAPH_KINDS = {
  document: { label: "Hearing", plural: "Hearings", color: "#c9d3dc", explain: "One whole transcript. Open it to see its speaker turns in order." },
  block: { label: "Turns", plural: "Turn groups", color: "#8fa3b5", collapsed: true, explain: "A run of consecutive speaker turns, grouped so the page starts readable. Open it to see each turn." },
  turn: { label: "Speaker turn", plural: "Speaker turns", color: "#8fa3b5", collapsed: true, explain: "One person speaking without interruption. Open it to see the claims made in it; select it to read the exact words." },
  passage: { label: "Passage", plural: "Passages", color: "#8fa3b5", dashed: true, collapsed: true, explain: "A long turn split into passages for reading; claims sit under the passage they came from." },
  claim: { label: "Claim", plural: "Claims", color: "#9aa5b1", explain: "Something the speaker states or answers in their own name, in the extractor's words. Select it to see the exact source text." },
  "relayed-claim": { label: "Relayed claim (someone else's words)", plural: "Relayed claims", color: "#a9c8ee", explain: "The speaker passes on what someone else said or believes; that person is the original claimant, named on the claim." },
  "denied-claim": { label: "Denied claim (speaker says not so)", plural: "Denied claims", color: "#e8913a", explain: "The speaker disputes this claim: they say it is NOT so. A 'not' inside someone's reported words (\"UFOs posed no threat\") is not marked; only the speaker's denial is." },
  question: { label: "Question", plural: "Questions", color: "#9aa5b1", dashed: true, explain: "Something a speaker asks rather than states." },
  "unbound-claim": { label: "Claim (no stance recorded)", plural: "Claims with no stance", color: "#6f7d89", dashed: true, explain: "The extractor recorded no stance or claimant for this claim. It is kept and shown, not dropped." },
  place: { label: "Quoted place", plural: "Quoted places", color: "#7fa7d6", explain: "The exact words at one end of a link between documents. Select it to read them highlighted in the transcript; its links are listed as buttons." },
  "person-shared": { label: "Speaks in more than one hearing", plural: "People in several hearings", color: "#4c8ed9", explain: "A speaker whose printed name appears in more than one transcript." },
  person: { label: "Speaker", plural: "People in one hearing", color: "#8fa3b5", explain: "A speaker whose printed name appears in one transcript only." },
  "people-group": { label: "People", plural: "Boxes of one-hearing speakers", color: "#8fa3b5", dashed: true, collapsed: true, explain: "Speakers found in only one hearing, grouped so the page starts readable. Open it to list them." },
};

const squash = (s) => (s ?? "").replace(/\s+/g, " ").trim();
// Transcripts print the speaker before the words ("Mr. Grusch. Thank you ..."); the label already names them.
const withoutSpeaker = (text, speaker) => (speaker && text.startsWith(speaker) ? text.slice(speaker.length).replace(/^[.:]\s*/, "") : text);
const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** Who a claim belongs to and how the speaker holds it: {stance, claimant, relayed, alias, kind}. */
export function attributionOf(c, speakerLabel, sameClaimant = {}) {
  const stance = c.stance ?? null;
  const claimant = c.original_claimant ?? null;
  const fold = (s) => s.toLowerCase();
  const alias = Boolean(claimant && speakerLabel && claimant !== speakerLabel
    && (fold(claimant) === fold(speakerLabel) || (sameClaimant[speakerLabel] ?? []).includes(claimant)));
  const relayed = Boolean(claimant) && !(speakerLabel && (claimant === speakerLabel || alias));
  const kind = !stance ? "unbound-claim" : stance === "asks" ? "question" : stance === "denies" ? "denied-claim" : relayed ? "relayed-claim" : "claim";
  return { stance, claimant, relayed, alias, kind };
}

/** Turns of one document in order: {ordinal, speaker, atoms, start, end, text}. Passages must be contiguous within a turn. */
export function turnsOf(passages) {
  const byTurn = new Map();
  for (const atom of [...passages.atoms].sort((a, b) => a.locator.start_char - b.locator.start_char)) {
    const t = atom.locator.turn_ordinal;
    if (!byTurn.has(t)) byTurn.set(t, { ordinal: t, speaker: atom.locator.speaker_label ?? null, atoms: [] });
    byTurn.get(t).atoms.push(atom);
  }
  return [...byTurn.values()].sort((a, b) => a.ordinal - b.ordinal).map((turn) => {
    const start = turn.atoms[0].locator.start_char, end = turn.atoms.at(-1).locator.end_char;
    let text = "";
    for (const a of turn.atoms) text += " ".repeat(Math.max(0, a.locator.start_char - start - text.length)) + a.exact_text;
    return { ...turn, start, end, text };
  });
}

/**
 * documentsToTypedGraph([{id, title, shortTitle?, date?, sourcePath?, leadingCharsStripped?, passages, claimBatch, notPeople?, sameClaimant?}], {blocks})
 * -> typed-graph/v1. `blocks` is about how many turn groups each document starts with (default 12).
 * `notPeople` maps printed speaker labels that do not name a person (a heading such as
 * "PREPARED STATEMENT ...", an OCR fragment) to a plain note: those turns keep their label and show
 * the note, but get no person box and are never matched across documents.
 *
 * `crossLinks` (0.11.0): links between exact places in different documents, such as a later speaker
 * retelling earlier testimony. Each is {id, label, relation, color?, dashed?, explain?, details?,
 * from: {doc, start, end, ref?}, to: {doc, start, end, ref?}, fromClaims?, toClaims?} with offsets
 * in the same text the passages index. Each end becomes a "place" node inside its turn, the link
 * becomes an edge from place to place carrying both quotes for side-by-side reading, and the claims
 * and turns it touches list it as a button. fromClaims/toClaims are claim occurrence or producer ids.
 *
 * `people` (0.11.0): identity groups [{id, name, members: [{doc, label, role: "speaker"|"claimant"}],
 * explain?}] that say which printed speaker labels and claimant names are one person. A grouped
 * speaker label maps to that person in every document it is listed for; a grouped claimant gets
 * "credited with" links to the claims attributed to them. Without it, people match by exact label.
 */
export function documentsToTypedGraph(docs, { blocks = 12, sharedLaneLabel = "People in several hearings", crossLinks = [], people: identity = null } = {}) {
  const nodes = [], edges = [];
  const people = new Map();  // person key -> {docs: Map(docId -> [turnIds])}
  const groupOf = new Map();  // `${role}::${doc}::${label}` -> group
  for (const g of identity ?? []) for (const m of g.members) groupOf.set(`${m.role}::${m.doc}::${m.label}`, g);
  const credited = new Map();  // group id -> Map(docId -> [claim node ids])
  const perDoc = new Map();  // doc id -> {docId, turns, claimNode: Map(id -> node id), lead}
  const lanes = [];
  for (const doc of docs) {
    const lead = doc.leadingCharsStripped ?? 0;
    const turns = turnsOf(doc.passages);
    const atomTurn = new Map();
    for (const t of turns) for (const a of t.atoms) atomTurn.set(a.atom_id, t);
    const claims = [...doc.claimBatch.candidates].sort((a, b) => (a.evidence_spans[0]?.locator?.start_char ?? 0) - (b.evidence_spans[0]?.locator?.start_char ?? 0));
    const notPeople = doc.notPeople ?? {};
    const sameClaimant = doc.sameClaimant ?? {};
    const docId = `doc::${doc.id}`;
    const fileRange = (s, e) => `${s + lead}–${e + lead}${lead ? ` (offsets +${lead}: the extractor stripped ${lead} leading character${lead === 1 ? "" : "s"})` : ""}`;
    const atts = new Map(claims.map((c) => [c, attributionOf(c, atomTurn.get(c.evidence_spans[0]?.locator?.passage_id)?.speaker ?? null, sameClaimant)]));
    const countKind = (kind) => claims.filter((c) => atts.get(c).kind === kind).length;
    const denied = countKind("denied-claim"), relayedN = countKind("relayed-claim");
    const otherClaimant = claims.filter((c) => atts.get(c).relayed).length;  // relayed, denied or asked about someone else
    const short = doc.shortTitle ?? doc.title;
    const claimNodeIds = new Map();
    perDoc.set(doc.id, { docId, turns, claimNodeIds, lead, doc });
    for (const c of claims) {
      const nid = `${docId}::claim::${c.producer_claim_id}`;
      claimNodeIds.set(c.producer_claim_id, nid);
      if (c.occurrence_id) claimNodeIds.set(c.occurrence_id, nid);
      const g = c.original_claimant ? groupOf.get(`claimant::${doc.id}::${c.original_claimant}`) : null;
      if (g) {
        if (!credited.has(g.id)) credited.set(g.id, new Map());
        const per = credited.get(g.id);
        if (!per.has(doc.id)) per.set(doc.id, []);
        per.get(doc.id).push(nid);
      }
    }
    lanes.push({ id: doc.id, label: doc.date ? `${short} (${doc.date})` : short, explain: doc.explain ?? `${turns.length} speaker turns, ${claims.length} claims.` });
    nodes.push({
      id: docId, label: doc.title, kind: "document", lane: doc.id,
      explain: `${turns.length} speaker turns, ${claims.length} claims (${relayedN} relayed from someone else, ${denied} denied by the speaker; ${otherClaimant} credited to someone other than the speaker, counting denials and questions). Open groups below to read in order.`,
      details: [
        ["Date", doc.date ?? "not given"], ["Source", doc.sourcePath ?? doc.passages.source_ref ?? ""],
        ["Speaker turns", String(turns.length)], ["Passages", String(doc.passages.atoms.length)],
        ["Claims", String(claims.length)], ["Relayed from someone else", String(relayedN)],
        ["Claimant is not the speaker (relayed, denied or asked)", String(otherClaimant)],
        ["Denied by the speaker", String(denied)], ["Questions", String(countKind("question"))],
        ["Claims with no stance", String(countKind("unbound-claim"))],
        ["Claim batch", doc.claimBatch.batch_id ?? ""],
        ...(Object.keys(notPeople).length ? [["Labels that are not people", `${Object.keys(notPeople).length} (${turns.filter((t) => t.speaker in notPeople).length} turns): no person box, not matched across hearings`]] : []),
      ],
    });
    const size = Math.max(1, Math.ceil(turns.length / blocks));
    const claimsByTurn = new Map(turns.map((t) => [t.ordinal, []]));
    const orphans = [];
    for (const c of claims) {
      const t = atomTurn.get(c.evidence_spans[0]?.locator?.passage_id);
      if (t) claimsByTurn.get(t.ordinal).push(c); else orphans.push(c);
    }
    for (let b = 0; b * size < turns.length; b++) {
      const group = turns.slice(b * size, (b + 1) * size);
      const blockId = `${docId}::block::${b}`;
      const tally = new Map();
      for (const t of group) tally.set(t.speaker ?? "no speaker", (tally.get(t.speaker ?? "no speaker") ?? 0) + 1);
      const top = [...tally].sort((x, y) => y[1] - x[1]);
      const nClaims = group.reduce((n, t) => n + claimsByTurn.get(t.ordinal).length, 0);
      nodes.push({
        id: blockId, label: `Turns ${group[0].ordinal}–${group.at(-1).ordinal}: ${top.slice(0, 3).map(([s]) => clip(s, 28)).join(", ")}${top.length > 3 ? " …" : ""}`,
        kind: "block", parent: docId, order: b,
        explain: `${group.length} turns, ${nClaims} claims. Speakers: ${top.map(([s, n]) => `${s} (${n})`).join(", ")}.`,
      });
      for (const t of group) {
        const turnId = `${docId}::turn::${t.ordinal}`;
        const speaker = t.speaker ?? "No speaker (front matter)";
        const tc = claimsByTurn.get(t.ordinal);
        const note = t.speaker ? notPeople[t.speaker] : undefined;
        nodes.push({
          id: turnId, label: `${t.ordinal}. ${note ? `"${speaker}" (not a person)` : speaker}: ${clip(withoutSpeaker(squash(t.text), t.speaker), 90)}`,
          kind: "turn", parent: blockId, order: t.ordinal,
          explain: `Turn ${t.ordinal}, ${speaker}: ${tc.length} claim${tc.length === 1 ? "" : "s"}.${note ? ` Not a person: ${note}` : ""}`,
          details: [["Speaker (as printed)", speaker], ...(note ? [["Not a person", note]] : []), ["Turn", String(t.ordinal)], ["Claims", String(tc.length)], ["Passages", String(t.atoms.length)], ["Characters in source file", fileRange(t.start, t.end)]],
          source: { text: t.text, title: `Turn ${t.ordinal} · ${speaker}`, ref: `${doc.sourcePath ?? doc.passages.source_ref ?? doc.id}, characters ${fileRange(t.start, t.end)}` },
        });
        if (t.speaker && !note) {
          const g = groupOf.get(`speaker::${doc.id}::${t.speaker}`);
          const key = g ? `group::${g.id}` : t.speaker;
          if (!people.has(key)) people.set(key, new Map());
          const per = people.get(key);
          if (!per.has(doc.id)) per.set(doc.id, []);
          per.get(doc.id).push(turnId);
        }
        const split = t.atoms.length > 1;
        const passageOf = new Map();
        if (split) t.atoms.forEach((a, i) => {
          const pid = `${docId}::passage::${a.atom_id}`;
          passageOf.set(a.atom_id, pid);
          const n = tc.filter((c) => c.evidence_spans[0].locator.passage_id === a.atom_id).length;
          nodes.push({
            id: pid, label: `Passage ${i + 1} of ${t.atoms.length}: ${clip(squash(a.exact_text), 80)}`, kind: "passage", parent: turnId, order: i,
            explain: `${n} claim${n === 1 ? "" : "s"} from this part of the turn.`,
            details: [["Passage id", a.atom_id], ["Characters in source file", fileRange(a.locator.start_char, a.locator.end_char)]],
            source: { from: turnId, start: a.locator.start_char - t.start, end: a.locator.end_char - t.start, title: `Turn ${t.ordinal} · passage ${i + 1} of ${t.atoms.length}` },
          });
        });
        tc.forEach((c, i) => nodes.push(claimNode(docId, c, i, split ? passageOf.get(c.evidence_spans[0].locator.passage_id) : turnId, turnId, t, speaker, atts.get(c), notPeople, fileRange)));
      }
    }
    if (orphans.length) {
      const oid = `${docId}::orphans`;
      nodes.push({ id: oid, label: `Claims with no passage (${orphans.length})`, kind: "block", parent: docId, order: blocks + 1, explain: "Claims whose evidence did not point at a transcript passage." });
      orphans.forEach((c, i) => nodes.push(claimNode(docId, c, i, oid, null, null, null, atts.get(c), notPeople, fileRange)));
    }
  }
  // People: exact printed speaker label unless identity groups say which names are one person.
  const titleOf = new Map(docs.map((d) => [d.id, d.shortTitle ?? d.title]));
  const groups = new Map((identity ?? []).map((g) => [`group::${g.id}`, g]));
  for (const [key, g] of groups) if (!people.has(key) && credited.has(g.id)) people.set(key, new Map());
  const loners = new Map();
  const docsOf = ([key, per]) => new Set([...per.keys(), ...(groups.has(key) ? [...(credited.get(groups.get(key).id) ?? new Map()).keys()] : [])]);
  [...people].sort((a, b) => docsOf(b).size - docsOf(a).size || a[0].localeCompare(b[0])).forEach(([key, per], i) => {
    const g = groups.get(key);
    if (g) { personNode(g, per, i); return; }
    const label = key;
    const id = `person::${label}`;
    const shared = per.size > 1;
    const total = [...per.values()].reduce((n, l) => n + l.length, 0);
    let parent;
    if (!shared) {
      const only = [...per.keys()][0];
      parent = `people-only::${only}`;
      loners.set(only, (loners.get(only) ?? 0) + 1);
    }
    nodes.push({
      id, label, kind: shared ? "person-shared" : "person", ...(parent ? { parent } : {}), order: i,
      explain: `${total} turns: ${[...per].map(([d, l]) => `${l.length} in ${titleOf.get(d)}`).join("; ")}. Matched by the exact printed name only.`,
      details: [["Printed name", label], ...[...per].map(([d, l]) => [titleOf.get(d), `${l.length} turns`]), ["Matching", "Exact printed name in the transcript; not an identity judgement."]],
    });
    for (const [d, turnIds] of per) {
      edges.push({ id: `${id}->doc::${d}`, source: id, target: `doc::${d}`, label: `speaks in ${turnIds.length} turns` });
      for (const t of turnIds) edges.push({ id: `${id}->${t}`, source: id, target: t, label: "speaks", quiet: true });
    }
  });
  function personNode(g, per, i) {
    const id = `person::${g.id}`;
    const cred = credited.get(g.id) ?? new Map();
    const inDocs = new Set([...per.keys(), ...cred.keys()]);
    const shared = inDocs.size > 1;
    let parent;
    if (!shared) {
      const only = [...inDocs][0];
      parent = `people-only::${only}`;
      loners.set(only, (loners.get(only) ?? 0) + 1);
    }
    const names = g.members.map((m) => `"${m.label}" (${m.role === "speaker" ? "printed speaker" : "named as claimant"}, ${titleOf.get(m.doc) ?? m.doc})`);
    nodes.push({
      id, label: g.name, kind: shared ? "person-shared" : "person", ...(parent ? { parent } : {}), order: i,
      explain: g.explain ?? `One person under ${g.members.length} name form${g.members.length === 1 ? "" : "s"}. ${[...inDocs].map((d) => `${titleOf.get(d)}: ${(per.get(d) ?? []).length} turns spoken, ${(cred.get(d) ?? []).length} claims credited to them`).join("; ")}.`,
      details: [
        ["Name forms", names.join("; ")],
        ...[...inDocs].map((d) => [titleOf.get(d), `${(per.get(d) ?? []).length} turns spoken, ${(cred.get(d) ?? []).length} claims credited to them`]),
        ["Matching", g.reason ?? "Identity group supplied with the graph (a judgement, not an exact-name match)."],
      ],
    });
    for (const d of inDocs) {
      const turnIds = per.get(d) ?? [], claimIds = cred.get(d) ?? [];
      edges.push({ id: `${id}->doc::${d}`, source: id, target: `doc::${d}`, label: [turnIds.length ? `speaks in ${turnIds.length} turns` : "", claimIds.length ? `credited with ${claimIds.length} claims` : ""].filter(Boolean).join(", ") });
      for (const t of turnIds) edges.push({ id: `${id}->${t}`, source: id, target: t, label: "speaks", quiet: true });
      for (const c of claimIds) edges.push({ id: `${id}=>${c}`, source: id, target: c, label: "credited with", quiet: true });
    }
  }
  // Cross-document links: a place node at each end, an edge between them, buttons on what they touch.
  const linksOf = new Map();
  const addLink = (nodeId, edgeId) => { if (!linksOf.has(nodeId)) linksOf.set(nodeId, []); if (!linksOf.get(nodeId).includes(edgeId)) linksOf.get(nodeId).push(edgeId); };
  const placeIds = new Map();
  const placeFor = (end, role, link) => {
    const info = perDoc.get(end.doc);
    if (!info) throw new Error(`crossLinks ${link.id}: unknown document ${end.doc}`);
    const key = `${end.doc}:${end.start}:${end.end}`;
    if (placeIds.has(key)) return placeIds.get(key);
    const over = info.turns.filter((t) => t.start < end.end && t.end > end.start);
    if (!over.length) throw new Error(`crossLinks ${link.id}: ${role} place ${end.start}-${end.end} is in no turn of ${end.doc}`);
    const first = over[0], last = over.at(-1);
    let text = "";
    for (const t of over) text += (text ? "\n" : "") + " ".repeat(Math.max(0, t.start - first.start - text.length - (text ? 1 : 0))) + t.text;
    const turnsText = over.length === 1 ? `turn ${first.ordinal}` : `turns ${first.ordinal}–${last.ordinal}`;
    const quote = squash(text.slice(end.start - first.start, end.end - first.start));
    const speakers = [...new Set(over.map((t) => t.speaker ?? "no speaker"))];
    const id = `${info.docId}::place::${end.start}-${end.end}`;
    nodes.push({
      id, label: `“${clip(quote, 110)}”`, kind: "place", parent: `${info.docId}::turn::${first.ordinal}`, order: -1,
      explain: `Exact words in ${titleOf.get(end.doc)}, ${turnsText} (${speakers.join(", ")})${end.ref ? `, ${end.ref}` : ""}.`,
      details: [["Document", titleOf.get(end.doc)], ["Speaker", speakers.join(", ")], ["Turns", turnsText], ...(end.ref ? [["Where", end.ref]] : []), ["Characters", `${end.start + info.lead}–${end.end + info.lead}`]],
      source: { text, start: end.start - first.start, end: end.end - first.start, title: `${titleOf.get(end.doc)} · ${turnsText} · ${speakers.join(", ")}`, ref: end.ref },
    });
    placeIds.set(key, id);
    return id;
  };
  for (const link of crossLinks) {
    const from = placeFor(link.from, "from", link), to = placeFor(link.to, "to", link);
    const edgeId = `link::${link.id}`;
    const fromInfo = perDoc.get(link.from.doc), toInfo = perDoc.get(link.to.doc);
    const fromNode = nodes.find((n) => n.id === from), toNode = nodes.find((n) => n.id === to);
    edges.push({
      id: edgeId, source: from, target: to, label: link.label ?? link.relation, relation: link.relation,
      ...(link.color ? { color: link.color } : {}), ...(link.dashed ? { dashed: true } : {}),
      explain: link.explain, details: link.details ?? [],
      compare: [
        { title: link.toTitle ?? `${titleOf.get(link.to.doc)}`, node: to, source: toNode.source, details: toNode.details },
        { title: link.fromTitle ?? `${titleOf.get(link.from.doc)}`, node: from, source: fromNode.source, details: fromNode.details },
      ],
    });
    addLink(from, edgeId); addLink(to, edgeId);
    for (const [ids, info, place] of [[link.fromClaims ?? [], fromInfo, fromNode], [link.toClaims ?? [], toInfo, toNode]]) {
      for (const cid of ids) { const nid = info.claimNodeIds.get(cid); if (nid) addLink(nid, edgeId); }
      addLink(place.parent, edgeId);
    }
  }
  for (const n of nodes) if (linksOf.has(n.id)) n.links = linksOf.get(n.id);
  docs.forEach((d, i) => {
    if (!loners.has(d.id)) return;
    nodes.push({ id: `people-only::${d.id}`, label: `${loners.get(d.id)} people only in ${d.shortTitle ?? d.title}`, kind: "people-group", order: 10_000 + i,
      explain: `Speakers whose printed name appears only in ${d.shortTitle ?? d.title}. Open to list them.` });
  });
  return {
    schema: SCHEMA, kinds: CLAIM_GRAPH_KINDS, nodes, edges,
    layout: { algorithm: "lanes", lanes, sharedLane: { label: sharedLaneLabel, explain: "People matched across hearings by the exact name printed in each transcript. Two different people with one printed name would be merged; that is not checked." } },
  };
}

function claimNode(docId, c, i, parent, turnId, turn, speaker, att, notPeople, fileRange) {
  const span = c.evidence_spans[0]?.locator ?? c.evidence_spans[0] ?? {};
  const name = (s) => (s in notPeople ? `"${s}" (not a person)` : s);
  const speakerName = turn?.speaker ? name(turn.speaker) : null;
  const claimantName = att.claimant ? name(att.claimant) : speakerName ? `${speakerName} (the speaker)` : "no one named";
  const said = att.stance ? `${speakerName ?? "No named speaker"} ${att.stance}` : "No stance recorded";
  return {
    id: `${docId}::claim::${c.producer_claim_id}`, label: c.statement, kind: att.kind, parent, order: i,
    explain: `${said}. Original claimant: ${claimantName}${att.relayed ? " (relayed: not the speaker)" : ""}.`,
    details: [
      ["Original claimant", claimantName],
      ["Speaker of the turn", speaker ? (turn?.speaker ? speakerName : speaker) : "none"],
      ["Stance of the speaker", att.stance ?? "not recorded"],
      ["Claimant is not the speaker", att.relayed ? "yes" : "no"],
      ...(att.alias ? [["Claimant spelling", `"${att.claimant}" is the speaker under another spelling, so not relayed`]] : []),
      ["Claim id", c.producer_claim_id],
      ...(span.start_char !== undefined ? [["Characters in source file", fileRange(span.start_char, span.end_char)]] : []),
    ],
    source: turnId && span.start_char !== undefined
      ? { from: turnId, start: span.start_char - turn.start, end: span.end_char - turn.start, title: `Evidence in turn ${turn.ordinal} · ${speaker}` }
      : { text: c.evidence_spans[0]?.text ?? c.content_text ?? "", start: 0, end: (c.evidence_spans[0]?.text ?? c.content_text ?? "").length, title: "Evidence" },
  };
}
