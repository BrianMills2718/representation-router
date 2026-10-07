import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const guidance = await readFile(new URL("../docs/task-first-engineering-language.md", import.meta.url), "utf8");
const appSource = await readFile(new URL("../review-workbench-v12/src/main.jsx", import.meta.url), "utf8");
const styles = await readFile(new URL("../review-workbench-v12/src/styles.css", import.meta.url), "utf8");
const viteConfig = await readFile(new URL("../review-workbench-v12/vite.config.js", import.meta.url), "utf8");
const architecture = JSON.parse(await readFile(new URL("../review-workbench/pr22.architecture-v1.json", import.meta.url), "utf8"));


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


test("v1.2 primary workbench language describes tasks rather than graph algorithms", () => {
  for (const token of [
    '"Start here"',
    '"System map"',
    '"How it works"',
    '"What happens next"',
    "Show whole diagram",
    "Reset positions",
    "Drag boxes to rearrange",
    "Click a box or line to understand it",
    "What this relationship means",
    "What this does not mean",
    "See related",
    "Technical details"
  ]) assert.ok(appSource.includes(token), token);

  for (const forbidden of ["Lock layout", "Neighbors on", "Neighbors off", ">Fit<"]) {
    assert.equal(appSource.includes(forbidden), false, forbidden);
  }
});


test("useful connection highlighting is automatic instead of a primary configuration toggle", () => {
  assert.ok(appSource.includes("emphasizeConnections"));
  assert.ok(appSource.includes("Selecting something automatically highlights its direct connections"));
  assert.equal(appSource.includes("setNeighbors"), false);
  assert.equal(appSource.includes("setLocked"), false);
});


test("plain-language architecture labels preserve exact internal names under technical disclosure", () => {
  for (const token of [
    "Source of truth",
    "One focused view",
    "Combined working view",
    "The app people use",
    "Person reviewing or operating",
    "ViewSpec",
    "SurfaceSpec",
    "Semantic identity",
    "Provenance",
    "Exact name",
    "Formal relationship"
  ]) assert.ok(appSource.includes(token), token);
});


test("v1.2 keeps direct manipulation presentation-only and human acceptance distinct from automation", () => {
  const semanticBefore = JSON.stringify(architecture.component.nodes.map(({ id, x, y }) => ({ id, x, y })));
  const localLayout = architecture.component.nodes.map((node) => ({ id: node.id, position: { x: node.x, y: node.y } }));
  localLayout[0].position.x += 400;
  const semanticAfter = JSON.stringify(architecture.component.nodes.map(({ id, x, y }) => ({ id, x, y })));
  assert.equal(semanticAfter, semanticBefore);
  assert.notEqual(localLayout[0].position.x, architecture.component.nodes[0].x);
  assert.equal(architecture.state.transitions.some((transition) => transition.from === "verified" && transition.to === "accepted"), false);
  assert.match(appSource, /Passing tests does not skip the human decision/);
});


test("v1.2 is a responsive Vite single-file artifact using the existing graph substrate", () => {
  assert.ok(viteConfig.includes("viteSingleFile"));
  assert.ok(viteConfig.includes("artifacts/review-workbench-v1.2"));
  assert.ok(appSource.includes('from "@xyflow/react"'));
  assert.ok(appSource.includes('@xyflow/react/dist/style.css'));
  assert.equal(appSource.includes("fetch("), false);
  assert.equal(appSource.includes("localStorage"), false);
  assert.ok(styles.includes("@media (max-width: 760px)"));
});
