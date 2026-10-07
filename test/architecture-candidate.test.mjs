import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import {
  deriveArchitectureConcernAvailability,
  routeArchitectureCandidate,
  semanticArchitectureCandidateErrors,
  validateArchitectureCandidate
} from "../src/architecture-candidate.mjs";
import { generateStructurizrArchitecture } from "../src/providers/structurizr-architecture.mjs";

const readJson = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));

const plan44 = await readJson("../examples/architecture-candidate-plan44-v0.json");
const dashboard = await readJson("../examples/architecture-candidate-shared-dashboard-v0.json");

const clone = (value) => structuredClone(value);

test("two real Company Planning architecture candidates validate at the RR boundary", () => {
  assert.equal(validateArchitectureCandidate(plan44), plan44);
  assert.equal(validateArchitectureCandidate(dashboard), dashboard);
  assert.equal(plan44.source_design_ref.repository, "BrianMills2718/company-planning");
  assert.equal(dashboard.source_design_ref.repository, "BrianMills2718/company-planning");
});

test("experimental candidate schema rejects source-side representation/provider policy", () => {
  const invalid = clone(plan44);
  invalid.representation_eligibility = { system_context: true };

  assert.throws(
    () => validateArchitectureCandidate(invalid),
    /representation_eligibility|allowed property/
  );
});

test("RR semantic validation rejects contract/relationship endpoint drift", () => {
  const invalid = clone(plan44);
  invalid.contracts[0].consumer_ref = "actor:contributor";

  const errors = semanticArchitectureCandidateErrors(invalid);
  assert.ok(errors.some((error) => error.startsWith("relationship_contract_endpoint_mismatch:")));
  assert.throws(
    () => validateArchitectureCandidate(invalid),
    /relationship_contract_endpoint_mismatch/
  );
});

test("Plan 44 availability is derived from semantic facts, not a source diagram checklist", () => {
  const availability = deriveArchitectureConcernAvailability(plan44);

  assert.equal(availability.system_context.available, true);
  assert.equal(availability.contract_map.available, true);
  assert.equal(availability.data_flow.available, true);
  assert.equal(availability.component.available, false);
  assert.equal(availability.sequence.available, false);
  assert.equal(availability.deployment.available, false);
});

test("provider routing keeps semantic availability distinct from adapter support", () => {
  const routed = routeArchitectureCandidate(dashboard);

  assert.equal(routed.routes.system_context.semanticStatus, "available");
  assert.equal(routed.routes.system_context.selectedProvider, "structurizr");
  assert.equal(routed.routes.contract_map.selectedProvider, "structurizr");
  assert.equal(routed.routes.data_flow.selectedProvider, "structurizr");

  assert.equal(routed.routes.deployment.semanticStatus, "available");
  assert.equal(routed.routes.deployment.providerStatus, "unavailable");
  assert.equal(routed.routes.deployment.selectedProvider, null);

  assert.equal(routed.routes.sequence.semanticStatus, "unavailable");
  assert.equal(routed.routes.sequence.providerStatus, "not_applicable");
});

test("Structurizr adapter maps contracts onto relationships instead of fake systems", () => {
  const workspace = generateStructurizrArchitecture(plan44);

  assert.match(workspace, /"ProjectReviewProjectionV2"/);
  assert.match(
    workspace,
    /system_company_planning -> system_representation_router "projects concern-specific planning semantics" "ProjectReviewProjectionV2"/
  );
  assert.doesNotMatch(workspace, /= softwareSystem "ProjectReviewProjectionV2"/);
  assert.doesNotMatch(workspace, /= person "ProjectReviewProjectionV2"/);
});


test("Structurizr adapter preserves exact source identity, revision, provenance, and boundary refs", () => {
  const workspace = generateStructurizrArchitecture(dashboard);

  assert.match(workspace, /"rr\.source_design_repository" "BrianMills2718\/company-planning"/);
  assert.match(workspace, new RegExp(`"rr\\.source_design_revision" "${dashboard.source_design_ref.revision}"`));
  assert.match(workspace, /"rr\.source_refs"/);
  assert.match(workspace, /"rr\.contract_source_refs"/);
  assert.match(workspace, /"rr\.boundary_refs"/);
  assert.match(workspace, /"rr\.boundary_kinds" "[^"]*deployment[^"]*"/);
});

test("Structurizr adapter emits only implemented source-available concerns", () => {
  const workspace = generateStructurizrArchitecture(dashboard);

  assert.match(workspace, /systemLandscape "architecture-context"/);
  assert.match(workspace, /systemLandscape "architecture-contracts"/);
  assert.match(workspace, /systemLandscape "architecture-flows"/);

  assert.doesNotMatch(workspace, /dynamic /);
  assert.doesNotMatch(workspace, /deployment /);
  assert.doesNotMatch(workspace, /component /);

  assert.match(workspace, /exclude "relationship\.tag==Dependency"/);
  assert.match(workspace, /"initiative-dashboard-projection\.v1"/);
});

test("requesting a semantically available but unsupported deployment view fails closed", () => {
  assert.throws(
    () => generateStructurizrArchitecture(dashboard, { concerns: ["deployment"] }),
    /does not support concern: deployment/
  );
});

test("Structurizr generation is deterministic for both real candidates", () => {
  for (const candidate of [plan44, dashboard]) {
    assert.equal(
      generateStructurizrArchitecture(candidate),
      generateStructurizrArchitecture(clone(candidate))
    );
  }
});

test("RR architecture boundary code contains no Company Planning or Plan 44 source coupling", async () => {
  const routerSource = await readFile(new URL("../src/architecture-candidate.mjs", import.meta.url), "utf8");
  const adapterSource = await readFile(new URL("../src/providers/structurizr-architecture.mjs", import.meta.url), "utf8");
  const source = routerSource + "\n" + adapterSource;

  for (const forbidden of [
    "PlanningReviewSurfaceV1",
    "RR_PROJECT_TEMPLATE_PROJECTION",
    "Plan #44",
    "company-planning/docs",
    "SHARED_DASHBOARD_PUBLICATION_CONTRACT"
  ]) {
    assert.equal(source.includes(forbidden), false, `RR boundary must not depend on source-specific marker: ${forbidden}`);
  }
});
