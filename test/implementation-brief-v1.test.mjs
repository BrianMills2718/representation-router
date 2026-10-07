import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import {
  CANONICAL_IMPLEMENTATION_BRIEF,
  IMPLEMENTATION_BRIEF_V0,
  IMPLEMENTATION_BRIEF_V1,
  constraintValue,
  decisionValue,
  normalizeImplementationBrief
} from "../src/implementation-brief.mjs";

const saved = JSON.parse(await readFile(new URL("../examples/implementation-brief-explicit-save-v0.json", import.meta.url), "utf8"));
const evidence = JSON.parse(await readFile(new URL("../examples/implementation-brief-evidence-gap-focus-v1.json", import.meta.url), "utf8"));

function copy(value) { return JSON.parse(JSON.stringify(value)); }

test("legacy implementation-brief/v0 normalizes without rewriting its source contract", () => {
  const normalized = normalizeImplementationBrief(saved);
  assert.equal(saved.schemaVersion, IMPLEMENTATION_BRIEF_V0);
  assert.equal(normalized.schemaVersion, CANONICAL_IMPLEMENTATION_BRIEF);
  assert.equal(normalized.sourceSchemaVersion, IMPLEMENTATION_BRIEF_V0);
  assert.equal(normalized.featureId, "saved-graph-layouts");
  assert.equal(decisionValue(normalized, "remember-mode"), "explicit-save");
  assert.equal(constraintValue(normalized, "storage-scope"), "browser-local");
  assert.equal(normalized.authority.repositoryWrite, false);
});

test("implementation-brief/v1 carries feature-specific decisions without generic validator vocabulary", () => {
  const normalized = normalizeImplementationBrief(evidence);
  assert.equal(evidence.schemaVersion, IMPLEMENTATION_BRIEF_V1);
  assert.equal(normalized.sourceSchemaVersion, IMPLEMENTATION_BRIEF_V1);
  assert.equal(normalized.featureId, "evidence-gap-focus");
  assert.equal(decisionValue(normalized, "default-focus"), "gaps-first");
  assert.equal(decisionValue(normalized, "grouping"), "by-requirement");
  assert.equal(constraintValue(normalized, "source-authority"), "read-only-source-owned");
});

test("v1 generic validation rejects duplicate decision ids and authority expansion", () => {
  const duplicate = copy(evidence);
  duplicate.decisions.push({ ...duplicate.decisions[0] });
  assert.throws(() => normalizeImplementationBrief(duplicate), /duplicate decision id/);

  const authority = copy(evidence);
  authority.authority.repositoryWrite = true;
  assert.throws(() => normalizeImplementationBrief(authority), /must not grant repository/);
});

test("v1 generic validation does not reject a feature-specific value before adapter routing", () => {
  const candidate = copy(evidence);
  candidate.decisions.find((item) => item.id === "grouping").value = "feature-specific-future-value";
  const normalized = normalizeImplementationBrief(candidate);
  assert.equal(decisionValue(normalized, "grouping"), "feature-specific-future-value");
});
