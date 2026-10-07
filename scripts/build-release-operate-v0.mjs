import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { extname, relative, resolve, sep } from "node:path";
import {
  buildDeploymentReceipt,
  buildReleasePlan,
  buildRollbackReceipt,
  buildRuntimeObservation,
  validateReleaseIntent
} from "../src/release-operate.mjs";
import { renderReleaseOperateSurface } from "../src/release-operate-surface.mjs";

const args = process.argv.slice(2);
const positional = args.filter((arg) => !arg.startsWith("--"));
const option = (name) => args.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3) ?? null;
const intentPath = resolve(positional[0] ?? "examples/release-intent-ci-staging-v0.json");
const outputRoot = resolve(option("output") ?? "artifacts/release-operate-v0");
const stagingRoot = resolve(outputRoot, "staging");
const currentDir = resolve(stagingRoot, "current");
const rollbackSnapshotDir = resolve(stagingRoot, "rollback-snapshot");

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

async function walkFiles(root, current = root) {
  const names = await readdir(current);
  const output = [];
  for (const name of names.sort()) {
    const path = resolve(current, name);
    const info = await stat(path);
    if (info.isDirectory()) output.push(...await walkFiles(root, path));
    else if (info.isFile()) output.push(path);
  }
  return output;
}

async function snapshotDirectory(root) {
  const files = [];
  for (const absolute of await walkFiles(root)) {
    const bytes = await readFile(absolute);
    files.push({
      path: relative(root, absolute).split(sep).join("/"),
      bytes: bytes.length,
      sha256: sha256(bytes)
    });
  }
  const bundleMaterial = files.map((file) => `${file.path}\0${file.bytes}\0${file.sha256}\n`).join("");
  return {
    root,
    bundleSha256: sha256(Buffer.from(bundleMaterial)),
    files
  };
}

async function replaceDirectory(source, target) {
  await rm(target, { recursive: true, force: true });
  await mkdir(target, { recursive: true });
  await cp(source, target, { recursive: true });
}

function contentType(path) {
  const extension = extname(path).toLowerCase();
  if (extension === ".html") return "text/html; charset=utf-8";
  if (extension === ".json") return "application/json; charset=utf-8";
  if (extension === ".css") return "text/css; charset=utf-8";
  if (extension === ".js" || extension === ".mjs") return "text/javascript; charset=utf-8";
  return "application/octet-stream";
}

async function serveAndObserve(root, definitions, phase) {
  const server = createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
      const rawPath = decodeURIComponent(requestUrl.pathname);
      const requested = rawPath.endsWith("/") ? `${rawPath}index.html` : rawPath;
      const relativePath = requested.replace(/^\/+/, "");
      const absolute = resolve(root, relativePath);
      if (!(absolute === root || absolute.startsWith(`${root}${sep}`))) {
        response.writeHead(403);
        response.end("forbidden");
        return;
      }
      const bytes = await readFile(absolute);
      response.writeHead(200, { "content-type": contentType(absolute) });
      response.end(bytes);
    } catch (error) {
      response.writeHead(error?.code === "ENOENT" ? 404 : 500);
      response.end(error?.code === "ENOENT" ? "not found" : "server error");
    }
  });

  await new Promise((accept, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", accept);
  });
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const checks = [];
  try {
    for (const definition of definitions) {
      const response = await fetch(`${baseUrl}${definition.path}`);
      const body = await response.text();
      const markerPassed = definition.marker ? body.includes(definition.marker) : true;
      checks.push({
        id: definition.id,
        path: definition.path,
        status: response.status === 200 && markerPassed ? "passed" : "failed",
        httpStatus: response.status,
        assertion: definition.marker
          ? `Response contains ${JSON.stringify(definition.marker)}.`
          : "Route responded successfully."
      });
    }
  } finally {
    await new Promise((accept) => server.close(accept));
  }
  return { baseUrl, checks, phase };
}

async function homeChecks(root) {
  const definitions = [
    { id: "home-root", path: "/", marker: "What are you trying to do?" },
    { id: "understand-workflow", path: "/workflows/understand/index.html" },
    { id: "review-workflow", path: "/workflows/review/index.html" },
    { id: "studio-workflow", path: "/workflows/studio/index.html" },
    { id: "implementation-workflow", path: "/workflows/implementation/index.html" },
    { id: "fix-proof-workflow", path: "/workflows/fix-proof/index.html" }
  ];
  if (await exists(resolve(root, "workflows/release/index.html"))) {
    definitions.push({ id: "release-proof-workflow", path: "/workflows/release/index.html", marker: "Release it safely" });
  }
  return definitions;
}

const intent = validateReleaseIntent(await readJson(intentPath));
const sourceDir = resolve(intent.subject.sourcePath);
const previousDir = resolve(intent.rollback.previousSourcePath);
const sourceSnapshot = await snapshotDirectory(sourceDir);
const previousSnapshot = await snapshotDirectory(previousDir);
const plan = buildReleasePlan(intent, { source: sourceSnapshot, previous: previousSnapshot });

await rm(outputRoot, { recursive: true, force: true });
await mkdir(stagingRoot, { recursive: true });

await replaceDirectory(previousDir, rollbackSnapshotDir);
const retainedPreviousSnapshot = await snapshotDirectory(rollbackSnapshotDir);
if (retainedPreviousSnapshot.bundleSha256 !== previousSnapshot.bundleSha256) throw new Error("retained rollback snapshot does not match previous staging source");

await replaceDirectory(previousDir, currentDir);
const initializedSnapshot = await snapshotDirectory(currentDir);
if (initializedSnapshot.bundleSha256 !== previousSnapshot.bundleSha256) throw new Error("initial staging snapshot does not match previous version");

await replaceDirectory(sourceDir, currentDir);
const deployedSnapshot = await snapshotDirectory(currentDir);
const deployment = buildDeploymentReceipt({ plan, deployedSnapshot });
const deployChecks = await homeChecks(currentDir);
const deployedObserved = await serveAndObserve(currentDir, deployChecks, "after-deployment");
const deployedObservation = buildRuntimeObservation({ plan, ...deployedObserved });

await replaceDirectory(rollbackSnapshotDir, currentDir);
const rolledBackSnapshot = await snapshotDirectory(currentDir);
const rollbackObserved = await serveAndObserve(currentDir, [
  { id: "previous-root", path: "/" }
], "after-rollback");
const rollbackObservation = buildRuntimeObservation({ plan, ...rollbackObserved });
const rollback = buildRollbackReceipt({
  plan,
  fromSnapshot: deployedSnapshot,
  restoredSnapshot: rolledBackSnapshot,
  observation: rollbackObservation
});

await replaceDirectory(sourceDir, currentDir);
const finalSnapshot = await snapshotDirectory(currentDir);
const finalDeployment = buildDeploymentReceipt({ plan, deployedSnapshot: finalSnapshot, transition: "rollback-to-released" });
const finalObserved = await serveAndObserve(currentDir, deployChecks, "after-reapply");
const finalObservation = buildRuntimeObservation({ plan, ...finalObserved });

const html = renderReleaseOperateSurface({
  intent,
  plan,
  deployment,
  deployedObservation,
  rollback,
  rollbackObservation,
  finalDeployment,
  finalObservation,
  finalSnapshot
});
await writeFile(resolve(outputRoot, "index.html"), html, "utf8");
await writeFile(resolve(outputRoot, "release-intent.json"), `${JSON.stringify(intent, null, 2)}\n`, "utf8");
await writeFile(resolve(outputRoot, "release-plan.json"), `${JSON.stringify(plan, null, 2)}\n`, "utf8");
await writeFile(resolve(outputRoot, "deployment-receipt.json"), `${JSON.stringify(deployment, null, 2)}\n`, "utf8");
await writeFile(resolve(outputRoot, "runtime-observation.json"), `${JSON.stringify(deployedObservation, null, 2)}\n`, "utf8");
await writeFile(resolve(outputRoot, "rollback-receipt.json"), `${JSON.stringify(rollback, null, 2)}\n`, "utf8");
await writeFile(resolve(outputRoot, "rollback-observation.json"), `${JSON.stringify(rollbackObservation, null, 2)}\n`, "utf8");
await writeFile(resolve(outputRoot, "final-deployment-receipt.json"), `${JSON.stringify(finalDeployment, null, 2)}\n`, "utf8");
await writeFile(resolve(outputRoot, "final-runtime-observation.json"), `${JSON.stringify(finalObservation, null, 2)}\n`, "utf8");

const manifest = {
  schemaVersion: "release-operate-build/v0",
  releaseId: intent.releaseId,
  target: intent.target,
  source: sourceSnapshot,
  previous: previousSnapshot,
  finalStaging: finalSnapshot,
  surface: {
    path: "index.html",
    bytes: Buffer.byteLength(html),
    sha256: sha256(Buffer.from(html))
  },
  execution: {
    githubRunId: process.env.GITHUB_RUN_ID ?? null,
    githubCheckoutRevision: process.env.GITHUB_SHA ?? null
  },
  production: "not-connected-or-authorized",
  humanReview: "pending"
};
await writeFile(resolve(outputRoot, "build-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

process.stdout.write(`${JSON.stringify({
  output: outputRoot,
  surface: manifest.surface,
  sourceBundleSha256: sourceSnapshot.bundleSha256,
  previousBundleSha256: previousSnapshot.bundleSha256,
  finalBundleSha256: finalSnapshot.bundleSha256,
  rollbackProved: rollback.hashMatch,
  observations: finalObservation.checks.length,
  production: manifest.production
}, null, 2)}\n`);
