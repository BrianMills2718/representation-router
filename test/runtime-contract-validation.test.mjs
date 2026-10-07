import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

import { buildCollectionSpec } from "../src/collection-spec.mjs";
import { buildViewSpec } from "../src/router.mjs";
import { buildSurfaceSpec } from "../src/surface-spec.mjs";
import {
  assertContract,
  collectUnsupportedPublicSchemaKeywords,
  ContractValidationError,
  publicContracts,
  validateContract
} from "../src/schema-validation.mjs";

const validUseCase = {
  id: "runtime-validation",
  concern: "Which contract boundary is being exercised?",
  intent: ["inspect"],
  informationStructure: ["table"],
  tasks: ["inspect"],
  entities: ["contract"],
  relationships: [],
  scale: { items: 1, density: "low" },
  interaction: { mode: "read-only", dynamics: "static" },
  constraints: { provenance: true },
  successCriteria: ["The visible contract can be traced to the checked input."]
};

const validViewSpec = {
  version: "0.1",
  id: "runtime-validation--table",
  concern: validUseCase.concern,
  viewpoint: {
    stakeholder: "reviewer",
    intent: validUseCase.intent,
    tasks: validUseCase.tasks
  },
  projection: {
    entities: validUseCase.entities,
    relationships: validUseCase.relationships,
    focus: null,
    operations: []
  },
  representation: {
    pattern: "table",
    family: "table",
    dynamics: "static",
    layout: null
  },
  interactions: [],
  provenance: {
    enabled: true,
    linkVisualMarksToModel: true,
    showDerivedCalculation: true,
    showEvidence: true
  },
  rationale: ["A table supports direct inspection."],
  successCriteria: validUseCase.successCriteria
};

test("runtime validator covers every keyword used by public schemas", () => {
  assert.deepEqual(publicContracts, [
    "use-case",
    "agent-recommendation",
    "view-spec",
    "collection-spec",
    "surface-spec"
  ]);
  assert.deepEqual(collectUnsupportedPublicSchemaKeywords(), []);
});

test("valid public contracts pass schema-driven runtime validation", () => {
  assert.equal(validateContract("use-case", validUseCase).valid, true);
  assert.equal(validateContract("view-spec", validViewSpec).valid, true);

  const collectionSpec = buildCollectionSpec([validViewSpec], { medium: "dashboard" });
  assert.equal(validateContract("collection-spec", collectionSpec).valid, true);

  const surfaceSpec = buildSurfaceSpec([validViewSpec], {
    id: "runtime-validation-surface",
    sourceBindings: [
      {
        sourceId: "repo",
        owner: "source repository",
        revision: "abc123",
        role: "implementation"
      }
    ]
  });
  assert.equal(validateContract("surface-spec", surfaceSpec).valid, true);

  const recommendation = {
    availability: { status: "available", present: [], missing: [], note: null },
    primary: null,
    alternatives: [],
    alternativesDetailed: [],
    avoid: [],
    rationale: ["No suitable representation was selected in this fixture."],
    assumptions: [],
    interfacePatterns: []
  };
  assert.equal(validateContract("agent-recommendation", recommendation).valid, true);
});

test("ViewSpec construction repairs an empty scoring explanation with a truthful fallback rationale", () => {
  const candidate = {
    id: "table",
    family: "table",
    dynamics: ["static"],
    capabilities: [],
    maxItemsWithoutAggregation: 100,
    defaultLayout: null
  };
  const viewSpec = buildViewSpec(validUseCase, {
    candidate,
    rejected: false,
    score: 0,
    reasons: [],
    rejectedBecause: []
  });

  assert.equal(viewSpec.rationale.length, 1);
  assert.match(viewSpec.rationale[0], /Selected representation table/);
  assert.equal(validateContract("view-spec", viewSpec).valid, true);
});

test("runtime validation errors identify the failing contract path", () => {
  const malformed = structuredClone(validUseCase);
  delete malformed.interaction.mode;
  malformed.scale.items = -1;

  assert.throws(
    () => assertContract("use-case", malformed),
    (error) => {
      assert.equal(error instanceof ContractValidationError, true);
      assert.match(error.message, /\$\.interaction: missing required property "mode"/);
      assert.match(error.message, /\$\.scale\.items: must be >= 0/);
      return true;
    }
  );
});

test("runtime validation rejects undeclared properties instead of silently accepting drift", () => {
  const malformed = { ...validViewSpec, inventedContractField: true };
  const result = validateContract("view-spec", malformed);
  assert.equal(result.valid, false);
  assert.deepEqual(
    result.errors.find((error) => error.keyword === "additionalProperties"),
    {
      path: "$.inventedContractField",
      message: "is not an allowed property",
      keyword: "additionalProperties"
    }
  );
});

test("recommend CLI rejects malformed use cases before routing", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "representation-router-contract-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const path = join(directory, "invalid-use-case.json");
  const malformed = structuredClone(validUseCase);
  delete malformed.interaction.mode;
  await writeFile(path, JSON.stringify(malformed), "utf8");

  const result = spawnSync(process.execPath, ["src/recommend-cli.mjs", path], {
    cwd: new URL("..", import.meta.url),
    encoding: "utf8"
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Invalid use-case contract/);
  assert.match(result.stderr, /\$\.interaction: missing required property "mode"/);
  assert.equal(result.stdout, "");
});
