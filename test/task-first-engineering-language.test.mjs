import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const guidance = await readFile(new URL("../docs/task-first-engineering-language.md", import.meta.url), "utf8");


test("task-first guidance improves engineering capability without expanding core ownership", () => {
  assert.match(guidance, /Lead with the job\. Teach the technical language in context\. Preserve the exact truth underneath\./);
  assert.match(guidance, /End-to-end proving-surface target/i);
  assert.match(guidance, /more legible and accessible \*\*through product-owned working surfaces\*\*/i);
  assert.match(guidance, /does not expand Representation Router's core ownership/i);
  assert.match(guidance, /consuming systems continue to own the workflow, state, execution, and effects/i);
  assert.match(guidance, /not to create a simplified parallel world/i);
  assert.match(guidance, /exact technical detail/i);
  assert.match(guidance, /Capability before terminology/i);
});
