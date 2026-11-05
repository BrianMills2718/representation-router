import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { render } from "../scripts/use-case-fields.mjs";

// Friction schema-enums-undocumented: agents guessed enum values because the allowed values were only in the schema.
test("docs/use-case-fields.md matches the use-case schema (regenerate with node scripts/use-case-fields.mjs)", async () => {
  assert.equal(await readFile(new URL("../docs/use-case-fields.md", import.meta.url), "utf8"), render());
});

test("the field reference lists every enum value an agent must choose from", () => {
  const text = render();
  for (const value of ["`playback`", "`rules`", "`decode-notation`", "`self-contained`", "`semanticLenses[].status`", "`speculative`", "`relationshipEnds[].from`"]) assert.ok(text.includes(value), value);
});
