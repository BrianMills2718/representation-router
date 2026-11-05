import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { renderPreview } from "../web/renderers.js";
import { route, buildViewSpec } from "../src/router.mjs";

const readJson = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
const catalog = await readJson("../catalog/representations.json");
const heuristics = await readJson("../heuristics/core.json");
const render = async (example) => {
  const useCase = await readJson(`../examples/${example}`);
  const container = { innerHTML: "", querySelector: () => null, querySelectorAll: () => [] };
  renderPreview(container, useCase, buildViewSpec(useCase, route(useCase, catalog, heuristics).accepted[0]));
  return container.innerHTML;
};
const number = (html, pattern) => [...html.matchAll(pattern)].map((m) => Number(m[1]));

test("the explainer token moves along the track, drawn under the stage boxes so it never covers a label", async () => {
  const html = await render("multi-stage-method-explanation.json");
  assert.match(html, /<circle class="message-dot explanation-token" r="7"><animateMotion [^>]*path="M/);
  assert.ok(html.indexOf("explanation-token") < html.indexOf("explanation-stage"), "token is drawn before (under) the stages");
});

test("stage boxes stay inside the 640-wide drawing and long labels wrap instead of spilling out", async () => {
  const html = await render("representation-router-self-explainer.json");
  const xs = number(html, /<rect x="([\d.-]+)"/g);
  const widths = number(html, /<rect x="[\d.-]+" y="[\d.-]+" width="([\d.]+)"/g);
  xs.forEach((x, i) => assert.ok(x >= 0 && x + widths[i] <= 640, `box ${i} spans ${x}..${x + widths[i]}`));
  assert.match(html, /<tspan[^>]*>Representation<\/tspan><tspan[^>]*>Candidate<\/tspan>/);
});
