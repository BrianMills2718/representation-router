// Writes docs/use-case-fields.md from schemas/use-case.schema.json: every field, whether it is required,
// and the exact values each enum accepts, so an agent filling a use case does not guess.
// Usage: node scripts/use-case-fields.mjs [--check]   (--check exits 1 when the doc is out of date)
import { readFileSync, writeFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const schema = JSON.parse(readFileSync(new URL("schemas/use-case.schema.json", root), "utf8"));
const docUrl = new URL("docs/use-case-fields.md", root);

function typeOf(node) {
  if (node.enum) return node.enum.map((value) => `\`${value}\``).join(", ");
  if (node.type === "array") {
    const items = node.items ?? {};
    if (items.enum) return `list of: ${items.enum.map((value) => `\`${value}\``).join(", ")}`;
    return `list of ${items.type ?? "object"}`;
  }
  return Array.isArray(node.type) ? node.type.join(" or ") : node.type ?? "object";
}

function rows(properties, required, prefix) {
  const out = [];
  for (const [name, node] of Object.entries(properties ?? {})) {
    const path = `${prefix}${name}`;
    const note = (node.description ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
    out.push(`| \`${path}\` | ${required.includes(name) ? "yes" : ""} | ${typeOf(node)} | ${note} |`);
    if (node.type === "object" && node.properties) out.push(...rows(node.properties, node.required ?? [], `${path}.`));
    if (node.type === "array" && node.items?.properties) out.push(...rows(node.items.properties, node.items.required ?? [], `${path}[].`));
  }
  return out;
}

export function render() {
  return [
    "# Use-case fields",
    "",
    "Generated from `schemas/use-case.schema.json` by `node scripts/use-case-fields.mjs`; do not edit by hand.",
    "A value outside a listed set is rejected, and the error names the allowed values.",
    "",
    "| Field | Required | Values | Note |",
    "| --- | --- | --- | --- |",
    ...rows(schema.properties, schema.required ?? [], ""),
    ""
  ].join("\n");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const text = render();
  if (process.argv.includes("--check")) {
    const current = (() => { try { return readFileSync(docUrl, "utf8"); } catch { return ""; } })();
    const fresh = current === text;
    console.log(`use-case-fields: ${fresh ? "up to date" : "out of date, run node scripts/use-case-fields.mjs"}; exit status ${fresh ? 0 : 1}`);
    process.exit(fresh ? 0 : 1);
  }
  writeFileSync(docUrl, text);
  console.log(`use-case-fields: wrote docs/use-case-fields.md (${text.split("\n").length} lines); exit status 0`);
}
