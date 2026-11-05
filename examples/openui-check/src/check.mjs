// Parses every model output with OpenUI's own parser, against the library that model was given.
import { readFile, writeFile, readdir } from "node:fs/promises";
import { createParser } from "@openuidev/react-lang";
import { openuiLibrary } from "@openuidev/react-ui";
import { GraphViewer } from "./libraries.mjs";
import { libraryFor } from "./libraries.mjs";
import { cases } from "./cases.mjs";

const dir = process.argv[2];
const full = openuiLibrary.extend({ components: { add: [{ component: GraphViewer, slots: ["Card.children"] }] } });
const fullParser = createParser(full.toJSONSchema());
function used(node, acc = new Set()) {
  if (Array.isArray(node)) node.forEach((n) => used(n, acc));
  else if (node && typeof node === "object") {
    if (node.type === "element") acc.add(node.typeName);
    Object.values(node.props ?? node).forEach((v) => typeof v === "object" && used(v, acc));
  }
  return acc;
}
// GraphViewer edges as "source>target", to compare against the question's stated direction.
function graphEdges(node, acc = []) {
  if (Array.isArray(node)) node.forEach((n) => graphEdges(n, acc));
  else if (node && typeof node === "object") {
    if (node.type === "element" && node.typeName === "GraphViewer") for (const e of node.props?.edges ?? []) acc.push(`${e.source ?? e.from}>${e.target ?? e.to}`);
    Object.values(node.props ?? node).forEach((v) => typeof v === "object" && graphEdges(v, acc));
  }
  return acc;
}
function edgeCheck(caseId, root) {
  const expected = cases.find((c) => c.id === caseId)?.expectedEdges;
  const drawn = graphEdges(root);
  if (!expected || !drawn.length) return {};
  return { edgesDrawn: drawn.length, edgesAsStated: drawn.filter((e) => expected.includes(e)).length,
    edgesReversed: drawn.filter((e) => expected.includes(e.split(">").reverse().join(">"))).length, edgesExpected: expected.length };
}
const rows = [];
for (const f of (await readdir(dir)).filter((n) => n.endsWith(".output.json")).sort()) {
  const out = JSON.parse(await readFile(`${dir}/${f}`, "utf8"));
  const input = JSON.parse(await readFile(`${dir}/${f.replace(/--[^-]+(-[^-]+)*\.output\.json$/, "").replace(/--[a-z0-9.-]+\.output\.json$/, "")}.input.json`, "utf8").catch(() => "null"))
    ?? JSON.parse(await readFile(`${dir}/${f.split("--").slice(0, 2).join("--")}.input.json`, "utf8"));
  const plan = { removeFromLibrary: Object.keys(openuiLibrary.components).filter((n) => !input.libraryComponents.includes(n)), customComponents: input.libraryComponents.includes("GraphViewer") ? [{ name: "GraphViewer" }] : [] };
  const given = createParser(libraryFor(plan, input.mode).toJSONSchema()).parse(out.content);
  const anyLib = fullParser.parse(out.content);
  const components = [...used(anyLib.root)].sort();
  const outside = input.mode === "router" ? components.filter((c) => !input.allowed.includes(c) && !["Stack"].includes(c)) : [];
  rows.push({ file: f, case: input.case, mode: input.mode, model: out.model.split("/").pop(), routerView: input.routerView, components, outsideAllowed: outside,
    parseErrors: given.meta.errors.map((e) => e.message ?? String(e)), unresolved: given.meta.unresolved, rendered: Boolean(given.root),
    ...edgeCheck(input.case, anyLib.root),
    promptChars: input.system.length, cost: out.cost, seconds: out.seconds });
}
await writeFile(`${dir}/check.json`, JSON.stringify(rows, null, 2));
for (const r of rows) console.log(`${r.case.padEnd(20)} ${r.mode.padEnd(6)} ${r.model.padEnd(22)} errors=${r.parseErrors.length} outside=${JSON.stringify(r.outsideAllowed)} ${r.edgesDrawn ? `edges as stated=${r.edgesAsStated}/${r.edgesExpected} reversed=${r.edgesReversed} ` : ""}prompt=${r.promptChars} uses: ${r.components.join(",")}`);
