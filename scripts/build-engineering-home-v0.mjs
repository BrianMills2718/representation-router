import { createHash } from "node:crypto";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { renderEngineeringHome } from "../src/engineering-home.mjs";
import { LIFECYCLE_CAPABILITIES, listEngineeringTasks } from "../src/engineering-task-router.mjs";

const args = process.argv.slice(2);
const option = (name) => args.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3) ?? null;
const outputRoot = resolve(option("output") ?? "artifacts/engineering-home-v0");
const releaseSource = option("release-source") ? resolve(option("release-source")) : null;

const workflows = [
  {
    id: "understand",
    sourceDir: resolve("artifacts/review-workbench-v1.2"),
    targetDir: resolve(outputRoot, "workflows/understand")
  },
  {
    id: "review",
    sourceDir: resolve("artifacts/implementation-runner-evidence-gap-v0"),
    targetDir: resolve(outputRoot, "workflows/review")
  },
  {
    id: "studio",
    sourceDir: resolve("artifacts/engineering-studio-v1"),
    targetDir: resolve(outputRoot, "workflows/studio")
  },
  {
    id: "implementation",
    sourceDir: resolve("artifacts/implementation-runner-saved-layouts-v0"),
    targetDir: resolve(outputRoot, "workflows/implementation")
  },
  {
    id: "fix-proof",
    sourceDir: resolve("artifacts/fix-proving-v0"),
    targetDir: resolve(outputRoot, "workflows/fix-proof")
  },
  ...(releaseSource ? [{
    id: "release",
    sourceDir: releaseSource,
    targetDir: resolve(outputRoot, "workflows/release")
  }] : [])
];

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function prereleaseTasks() {
  if (releaseSource) return listEngineeringTasks();
  return listEngineeringTasks().map((task) => task.id === "release" ? {
    ...task,
    availability: "unavailable",
    canDoNow: ["Inspect build/CI artifact evidence while the CI staging Release + Operate proof is being established."],
    missing: [
      "Verified CI staging deployment/rollback evidence has not yet been bundled into this prerelease Home.",
      "Product-owned production deployment target and credentials remain unavailable."
    ],
    routes: [],
    authority: "no-release-route-in-prerelease-home"
  } : task);
}

function prereleaseLifecycle() {
  if (releaseSource) return LIFECYCLE_CAPABILITIES;
  return LIFECYCLE_CAPABILITIES.map((item) => ["release", "operate"].includes(item.id) ? {
    ...item,
    availability: "unavailable",
    note: item.id === "release"
      ? "This prerelease Home does not expose a Release route until exact staging deployment/rollback evidence is bundled."
      : "This prerelease Home does not expose runtime observations until the staging proof is bundled."
  } : item);
}

await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });

const manifest = {
  schemaVersion: "engineering-home-bundle/v0",
  generatedFrom: "CI-built Representation Router surfaces",
  releaseEvidenceBundled: Boolean(releaseSource),
  workflows: []
};

for (const workflow of workflows) {
  const sourceIndex = resolve(workflow.sourceDir, "index.html");
  let indexBytes;
  try {
    indexBytes = await readFile(sourceIndex);
  } catch (error) {
    throw new Error(`Engineering Home requires ${workflow.id} source artifact at ${sourceIndex}. Build prerequisite surfaces first.`, { cause: error });
  }
  await cp(workflow.sourceDir, workflow.targetDir, { recursive: true });
  const copiedIndex = await readFile(resolve(workflow.targetDir, "index.html"));
  const sourceHash = sha256(indexBytes);
  const copiedHash = sha256(copiedIndex);
  if (sourceHash !== copiedHash) throw new Error(`Bundled ${workflow.id} entrypoint does not match its source artifact`);
  manifest.workflows.push({
    id: workflow.id,
    source: workflow.sourceDir,
    target: `workflows/${workflow.id}/index.html`,
    bytes: copiedIndex.length,
    sha256: copiedHash
  });
}

const homeHtml = renderEngineeringHome({ tasks: prereleaseTasks(), lifecycle: prereleaseLifecycle() });
await writeFile(resolve(outputRoot, "index.html"), homeHtml, "utf8");
manifest.home = {
  path: "index.html",
  bytes: Buffer.byteLength(homeHtml),
  sha256: sha256(Buffer.from(homeHtml))
};
await writeFile(resolve(outputRoot, "bundle-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

process.stdout.write(`${JSON.stringify({
  output: outputRoot,
  releaseEvidenceBundled: Boolean(releaseSource),
  home: manifest.home,
  workflows: manifest.workflows
}, null, 2)}\n`);
