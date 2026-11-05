// Runs the public page's Python tests (public/test) inside `npm test`. They used to run only by hand and
// fell three tests behind the catalog unnoticed (2026-10-26). Skipped, visibly, where the deps are missing.
import assert from "node:assert/strict";
import { test } from "node:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const deps = spawnSync("python3", ["-c", "import fastapi, pydantic, httpx, pytest"], { encoding: "utf8" });
// Skip only when a module is absent; a broken install (any other import error) fails the run instead.
const missing = deps.status !== 0 && /ModuleNotFoundError/.test(deps.stderr) ? deps.stderr.trim().split("\n").pop() : null;

test("public page server tests (public/test) pass", { skip: missing ? `python3 cannot run them: ${missing}` : false }, () => {
  assert.equal(deps.status, 0, `python3 could not import the test deps:\n${deps.stderr}`);
  const run = spawnSync("python3", ["-m", "pytest", "public/test", "-q", "-p", "no:cacheprovider"], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, PYTHONPATH: `${root}public/app`, ROUTER_PUBLIC: "1" }
  });
  assert.equal(run.status, 0, `${run.stdout}\n${run.stderr}`);
  assert.match(run.stdout, /\d+ passed/);
});
