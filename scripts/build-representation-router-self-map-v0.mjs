import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { build } from "vite";

const generatedDir = resolve("representation-router-self-map-v0/generated");
const outputDir = resolve("artifacts/representation-router-self-map-v0");
const snapshot = {
  schemaVersion: "rr-self-map-build-snapshot/v0",
  repository: "brianmills-spec/representation-router",
  branch: process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || "feature/review-workbench-v0",
  sourceRevision: process.env.RR_SOURCE_REVISION || process.env.GITHUB_SHA || "local",
  pullRequest: process.env.RR_PULL_REQUEST || "23",
  runId: process.env.GITHUB_RUN_ID || "local"
};

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

await rm(generatedDir, { recursive: true, force: true });
await mkdir(generatedDir, { recursive: true });
await writeFile(resolve(generatedDir, "snapshot.json"), `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");

try {
  await build({ configFile: resolve("representation-router-self-map-v0/vite.config.js") });
} finally {
  await rm(generatedDir, { recursive: true, force: true });
}

const htmlPath = resolve(outputDir, "index.html");
const html = await readFile(htmlPath);
const manifest = {
  schemaVersion: "rr-self-map-artifact/v0",
  snapshot,
  entrypoint: {
    path: "index.html",
    bytes: html.length,
    sha256: sha256(html)
  },
  humanReview: "pending"
};
await writeFile(resolve(outputDir, "build-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
