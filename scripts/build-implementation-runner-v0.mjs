import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { build } from "vite";
import {
  describeDryRun,
  prepareImplementationRun,
  validateImplementationRunnerReceipt
} from "../src/implementation-runner.mjs";
import { renderImplementationRunnerSurface } from "../src/implementation-runner-surface.mjs";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const outputArg = args.find((arg) => arg.startsWith("--output="));
const receiptArg = args.find((arg) => arg.startsWith("--receipt="));
const positional = args.filter((arg) => !arg.startsWith("--"));
const briefPath = resolve(positional[0] ?? "examples/implementation-brief-explicit-save-v0.json");
const outputRoot = resolve(outputArg ? outputArg.slice("--output=".length) : "artifacts/implementation-runner-v0");
const defaultSavedReceipt = basename(briefPath) === "implementation-brief-explicit-save-v0.json"
  ? resolve("examples/implementation-runner-receipt-v0.json")
  : null;
const receiptPath = receiptArg ? resolve(receiptArg.slice("--receipt=".length)) : defaultSavedReceipt;

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function optionalJson(path) {
  if (!path) return null;
  try {
    return await readJson(path);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

const brief = await readJson(briefPath);

if (dryRun) {
  const result = describeDryRun(brief);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.status !== "dry-run") process.exitCode = 2;
} else {
  const run = prepareImplementationRun(brief);
  if (run.status !== "ready") {
    process.stderr.write(`${JSON.stringify(run, null, 2)}\n`);
    process.exit(2);
  }

  const generatedDir = resolve(run.runtime.generatedDir);
  const generatedSpecPath = resolve(generatedDir, "candidate-spec.json");
  const candidateOutDir = resolve(outputRoot, "candidate");

  await rm(outputRoot, { recursive: true, force: true });
  await rm(generatedDir, { recursive: true, force: true });
  await mkdir(generatedDir, { recursive: true });
  await writeFile(generatedSpecPath, `${JSON.stringify(run.candidateSpec, null, 2)}\n`, "utf8");

  try {
    await build({
      configFile: resolve(run.runtime.configFile),
      build: {
        outDir: candidateOutDir,
        emptyOutDir: true
      }
    });
  } finally {
    await rm(generatedDir, { recursive: true, force: true });
  }

  await mkdir(outputRoot, { recursive: true });
  const candidateHtmlPath = resolve(candidateOutDir, "index.html");
  const candidateHtml = await readFile(candidateHtmlPath);
  const candidateHtmlSha256 = sha256(candidateHtml);

  const receipt = await optionalJson(receiptPath);
  if (receipt) validateImplementationRunnerReceipt(receipt, run.plan);

  const surfaceHtml = renderImplementationRunnerSurface({
    brief,
    plan: run.plan,
    candidateSpec: run.candidateSpec,
    receipt
  });

  await writeFile(resolve(outputRoot, "index.html"), surfaceHtml, "utf8");
  await writeFile(resolve(outputRoot, "implementation-plan.json"), `${JSON.stringify(run.plan, null, 2)}\n`, "utf8");
  await writeFile(resolve(outputRoot, "candidate-spec.json"), `${JSON.stringify(run.candidateSpec, null, 2)}\n`, "utf8");
  await writeFile(resolve(outputRoot, "brief.json"), `${JSON.stringify(brief, null, 2)}\n`, "utf8");
  await writeFile(resolve(outputRoot, "normalized-brief.json"), `${JSON.stringify(run.normalizedBrief, null, 2)}\n`, "utf8");
  if (receipt) await writeFile(resolve(outputRoot, "execution-receipt.json"), `${JSON.stringify(receipt, null, 2)}\n`, "utf8");

  const manifest = {
    schemaVersion: "implementation-runner-build/v0",
    briefPath,
    briefSchemaVersion: run.plan.briefSchemaVersion,
    featureId: run.plan.featureId,
    planStatus: run.plan.status,
    adapter: run.plan.adapter,
    runtime: run.plan.runtime,
    candidateSpec: run.candidateSpec.schemaVersion,
    candidateHtml: {
      path: "candidate/index.html",
      bytes: candidateHtml.length,
      sha256: candidateHtmlSha256
    },
    executionEvidence: receipt ? "recorded" : "pending",
    humanReview: "pending"
  };
  await writeFile(resolve(outputRoot, "build-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  process.stdout.write(`${JSON.stringify({
    output: outputRoot,
    entrypoint: resolve(outputRoot, "index.html"),
    candidate: candidateHtmlPath,
    candidateHtmlBytes: candidateHtml.length,
    candidateHtmlSha256,
    featureId: run.plan.featureId,
    adapter: run.plan.adapter,
    runtime: run.plan.runtime,
    executionEvidence: manifest.executionEvidence
  }, null, 2)}\n`);
}
