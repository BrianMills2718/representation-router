import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { routeProblemIntent } from "../src/diagnostic-router.mjs";
import { renderFixProvingSurface } from "../src/fix-proving-surface.mjs";

const outputRoot = resolve("artifacts/fix-proving-v0");
const problemPath = resolve("examples/problem-intent-saved-layout-reset-v0.json");
const optionalReceiptPath = resolve("examples/fix-proving-runner-receipt-v0.json");

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

async function optionalJson(path) {
  try { return JSON.parse(await readFile(path, "utf8")); }
  catch (error) { if (error?.code === "ENOENT") return null; throw error; }
}

await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });

const problem = JSON.parse(await readFile(problemPath, "utf8"));
const routed = routeProblemIntent(problem);
if (routed.status !== "diagnosed") {
  throw new Error(`Fix proving problem was not diagnosed: ${JSON.stringify(routed)}`);
}

const diagnosis = routed.diagnosis;
const brief = diagnosis.implementationBrief;
const briefPath = resolve(outputRoot, "implementation-brief.json");
await writeFile(resolve(outputRoot, "problem-intent.json"), `${JSON.stringify(problem, null, 2)}\n`, "utf8");
await writeFile(resolve(outputRoot, "diagnosis.json"), `${JSON.stringify(diagnosis, null, 2)}\n`, "utf8");
await writeFile(briefPath, `${JSON.stringify(brief, null, 2)}\n`, "utf8");

const receipt = await optionalJson(optionalReceiptPath);
const args = [
  "scripts/build-implementation-runner-v0.mjs",
  briefPath,
  `--output=${resolve(outputRoot, "runner")}`
];
if (receipt) args.push(`--receipt=${optionalReceiptPath}`);
const child = spawnSync(process.execPath, args, { stdio: "inherit" });
if (child.status !== 0) throw new Error(`Implementation Runner failed for the Fix proving brief with exit code ${child.status}`);

const runnerCandidate = await readFile(resolve(outputRoot, "runner/candidate/index.html"));
const runnerSurface = await readFile(resolve(outputRoot, "runner/index.html"));
const surface = renderFixProvingSurface({ problem, diagnosis, receipt });
await writeFile(resolve(outputRoot, "index.html"), surface, "utf8");

const manifest = {
  schemaVersion: "fix-proving-build/v0",
  problemId: problem.id,
  diagnosticAdapter: diagnosis.diagnosticAdapter,
  derivedBrief: {
    schemaVersion: brief.schemaVersion,
    featureId: brief.featureId,
    baselineRevision: brief.baselineRevision
  },
  runner: {
    surface: { bytes: runnerSurface.length, sha256: sha256(runnerSurface) },
    candidate: { bytes: runnerCandidate.length, sha256: sha256(runnerCandidate) }
  },
  rootSurface: {
    bytes: Buffer.byteLength(surface),
    sha256: sha256(Buffer.from(surface))
  },
  executionEvidence: receipt ? "recorded" : "pending",
  humanReview: "pending"
};
await writeFile(resolve(outputRoot, "build-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

process.stdout.write(`${JSON.stringify({ output: outputRoot, manifest }, null, 2)}\n`);
