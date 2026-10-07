import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { buildSurfaceSpec } from "../src/surface-spec.mjs";

const fixture = JSON.parse(await readFile(
  new URL("../examples/e2e-dodaf-semantic-path-convergence.json", import.meta.url),
  "utf8"
));

const viewById = (id) => fixture.viewSpecs.find((view) => view.id === id);

test("real DoDAF proving case spans the software lifecycle without moving lifecycle relations into SurfaceSpec", () => {
  const spec = buildSurfaceSpec(fixture.viewSpecs, fixture.surfaceOptions);

  assert.equal(spec.id, "dodaf-semantic-path-convergence-e2e");
  assert.deepEqual(spec.purpose.lifecycleStages, [
    "planning",
    "architecture",
    "implementation",
    "verification",
    "product-use",
    "review",
    "release"
  ]);
  assert.equal(spec.views[0].viewSpecId, "lifecycle-trace");
  assert.equal(spec.views[0].role, "primary");
  assert.ok(spec.views.some((view) => view.viewSpecId === "product-ui-review" && view.role === "complementary"));

  const trace = viewById("lifecycle-trace");
  assert.deepEqual(trace.projection.relationships, [
    "planned-by",
    "decided-by",
    "implemented-by",
    "verified-by",
    "published-as",
    "reviewed-under"
  ]);
  assert.equal(spec.views.every((view) => !("projection" in view)), true);
  assert.equal("traceability" in spec, false);
});

test("real proving case pins planning, product, evidence, and gate sources to exact revisions", () => {
  const spec = buildSurfaceSpec(fixture.viewSpecs, fixture.surfaceOptions);
  const bindings = Object.fromEntries(spec.sourceBindings.map((binding) => [binding.sourceId, binding]));

  assert.equal(bindings["current-plan"].revision, fixture.source_snapshot.planning_revision);
  assert.equal(bindings["product-gate"].revision, fixture.source_snapshot.planning_revision);
  assert.equal(bindings["golden-journey-ui"].revision, fixture.source_snapshot.product_revision);
  assert.equal(bindings["projection-registry"].revision, fixture.source_snapshot.product_revision);
  assert.equal(bindings["product-tests"].revision, fixture.source_snapshot.product_revision);
  assert.equal(bindings["release-receipt"].role, "evidence");
  assert.equal(bindings["projection-registry"].role, "semantic-authority");
  assert.equal(bindings["current-plan"].role, "workflow-authority");
});

test("deployed and tested product does not become an approval action", () => {
  const spec = buildSurfaceSpec(fixture.viewSpecs, fixture.surfaceOptions);
  const gate = viewById("gate-state");
  const product = viewById("product-ui-review");

  assert.equal(spec.actions.some((action) => action.effect === "authoritative-write"), false);
  assert.ok(spec.actions.some((action) => action.effect === "surface-local"));
  assert.ok(product.availability.missing.includes("Gate A approval"));
  assert.ok(gate.availability.present.includes("ui-approval pending"));
  assert.ok(gate.availability.present.includes("backend-start ineligible"));
  assert.match(spec.notes.join(" "), /approval remains external/i);
});

test("real proving case preserves stable focus across pivots but clears it on source revision change", () => {
  const spec = buildSurfaceSpec(fixture.viewSpecs, fixture.surfaceOptions);

  assert.equal(spec.stateContract.selectionIdentity, "semantic-id");
  assert.equal(spec.stateContract.persistAcrossViewPivots, true);
  assert.equal(spec.stateContract.whenSelectionNotRepresented, "retain-and-mark-not-represented");
  assert.equal(spec.stateContract.sourceRevisionChange, "clear-semantic-focus");
  assert.equal(spec.stateContract.sharedFilters, "compatible-views-only");
});
