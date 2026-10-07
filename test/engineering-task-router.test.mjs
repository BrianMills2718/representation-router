import assert from "node:assert/strict";
import { test } from "node:test";
import { LIFECYCLE_CAPABILITIES, getEngineeringTask, listEngineeringTasks, routeEngineeringTask } from "../src/engineering-task-router.mjs";

test("engineering home exposes exactly the five task-first jobs with honest availability", () => {
  const tasks = listEngineeringTasks();
  assert.deepEqual(tasks.map((task) => task.id), ["build", "fix", "understand", "review", "release"]);
  assert.equal(getEngineeringTask("understand").availability, "ready");
  assert.equal(getEngineeringTask("review").availability, "ready");
  assert.equal(getEngineeringTask("build").availability, "partial");
  assert.equal(getEngineeringTask("fix").availability, "partial");
  assert.equal(getEngineeringTask("release").availability, "partial");
});

test("plain-language task routing selects a supported task without changing its availability", () => {
  const review = routeEngineeringTask("I need to review whether this change has enough evidence");
  assert.equal(review.status, "matched");
  assert.equal(review.task.id, "review");
  assert.equal(review.task.availability, "ready");

  const release = routeEngineeringTask("deploy this to production");
  assert.equal(release.status, "matched");
  assert.equal(release.task.id, "release");
  assert.equal(release.task.availability, "partial");
  assert.ok(release.task.routes.some((route) => route.id === "release-proof" && route.href === "workflows/release/index.html"));
  assert.ok(release.task.missing.some((item) => /production deployment target/i.test(item)));
});

test("ambiguous and unrecognized requests do not get guessed into a workflow", () => {
  const ambiguous = routeEngineeringTask("build and review");
  assert.equal(ambiguous.status, "ambiguous");
  assert.deepEqual(ambiguous.candidates.map((item) => item.id), ["build", "review"]);

  const unknown = routeEngineeringTask("organize my grocery list");
  assert.equal(unknown.status, "unrecognized");
  assert.deepEqual(unknown.candidates, []);
});

test("Build and Fix route through Engineering Studio while remaining honestly partial", () => {
  const build = getEngineeringTask("build");
  assert.ok(build.routes.some((route) => route.id === "engineering-studio" && route.href === "workflows/studio/index.html"));
  assert.ok(build.missing.some((item) => /broader feature\/implementation adapter coverage/i.test(item)));

  const fix = getEngineeringTask("fix");
  assert.ok(fix.routes.some((route) => route.id === "engineering-studio-fix" && route.href === "workflows/studio/index.html"));
  assert.ok(fix.routes.some((route) => route.id === "fix-proof" && route.href === "workflows/fix-proof/index.html"));
  assert.ok(fix.missing.some((item) => /broader diagnostic adapter coverage/i.test(item)));
  assert.ok(fix.missing.some((item) => /logs\/traces\/telemetry/i.test(item)));
});

test("Release routes only to CI staging evidence and keeps production unavailable", () => {
  const release = getEngineeringTask("release");
  assert.equal(release.authority, "repository-ci-staging-only-no-production-authority");
  assert.ok(release.canDoNow.some((item) => /rollback/i.test(item)));
  assert.ok(release.routes.some((route) => route.href === "workflows/release/index.html"));
  assert.ok(release.missing.some((item) => /production/i.test(item)));
});

test("lifecycle strip records staging release/observation progress without claiming production readiness", () => {
  assert.match(LIFECYCLE_CAPABILITIES.find((item) => item.id === "outcome").note, /Engineering Studio v1/);
  assert.match(LIFECYCLE_CAPABILITIES.find((item) => item.id === "implement").note, /diagnostic-to-implementation/);
  assert.equal(LIFECYCLE_CAPABILITIES.find((item) => item.id === "review").availability, "ready");
  assert.equal(LIFECYCLE_CAPABILITIES.find((item) => item.id === "release").availability, "partial");
  assert.equal(LIFECYCLE_CAPABILITIES.find((item) => item.id === "operate").availability, "partial");
  assert.match(LIFECYCLE_CAPABILITIES.find((item) => item.id === "release").note, /production is not connected/i);
  assert.match(LIFECYCLE_CAPABILITIES.find((item) => item.id === "operate").note, /external telemetry/i);
});
