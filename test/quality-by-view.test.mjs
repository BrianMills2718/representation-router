import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { selectQualityMethod } from "../src/quality-plan.mjs";

// Issue #155: every native-web view without its own method got measured-svg-quality (SVG label overlap) because it
// came first in the catalog; a web table was checked like a diagram.
const qualityCatalog = JSON.parse(readFileSync(new URL("../catalog/quality-methods.json", import.meta.url)));
const pick = (renderer, family, pattern) => selectQualityMethod(renderer, { representation: { family, pattern } }, qualityCatalog)?.method;

test("web tables get table checks and link lists get list checks, not SVG checks", () => {
  assert.equal(pick("native-web", "table", "data-table"), "web-table-quality");
  assert.equal(pick("native-web", "list", "link-directory"), "web-list-quality");
  const checks = (id) => qualityCatalog.methods.find((m) => m.id === id).hardChecks;
  assert.ok(checks("web-table-quality").includes("header-row-names-every-column-and-its-unit"));
  // A grouped link list has no columns, units or sort state to check.
  assert.ok(!checks("web-list-quality").some((c) => /column|sort|aligned/.test(c)));
});

test("a method that requires a match never wins a tie for other views", () => {
  for (const [family, pattern] of [["graph", "node-link-graph"], ["flow", "directed-handoff-flow"], ["explorable-explanation", "staged-explanatory-machine"]]) {
    assert.ok(!["web-table-quality", "web-list-quality"].includes(pick("native-web", family, pattern)), pattern);
  }
  assert.equal(pick("native-web", "graph", "node-link-graph"), "measured-svg-quality");
});

test("charts drawn in native web get chart checks; timelines and schedules do not get bar-baseline checks", () => {
  for (const pattern of ["bar-chart", "line-chart", "interval-plot", "heatmap"]) {
    assert.equal(pick("native-web", pattern === "line-chart" ? "temporal" : pattern === "heatmap" ? "matrix" : "comparative", pattern), "quantitative-chart-quality", pattern);
  }
  assert.notEqual(pick("native-web", "temporal", "timeline"), "quantitative-chart-quality");
  assert.notEqual(pick("d3", "temporal", "project-schedule"), "quantitative-chart-quality");
  assert.equal(pick("d3", "comparative", "bar-chart"), "quantitative-chart-quality");
});

test("markdown tables keep the document table method", () => {
  assert.equal(pick("markdown", "table", "decision-table"), "document-table-quality");
});
