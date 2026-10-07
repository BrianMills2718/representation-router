import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { generateStructurizrArchitecture } from "../src/providers/structurizr-architecture.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(ROOT, "artifacts/architecture-provider-t3b");

async function readJson(relative) {
  return JSON.parse(await readFile(resolve(ROOT, relative), "utf8"));
}

async function emit(name, fixture) {
  const candidate = await readJson(fixture);
  const directory = resolve(OUT, name);
  await mkdir(directory, { recursive: true });
  const workspace = generateStructurizrArchitecture(candidate);
  await writeFile(resolve(directory, "workspace.dsl"), workspace, "utf8");
  await writeFile(
    resolve(directory, "candidate.json"),
    JSON.stringify(candidate, null, 2) + "\n",
    "utf8"
  );
}

await emit("plan44", "examples/architecture-candidate-plan44-v0.json");
await emit("shared-dashboard", "examples/architecture-candidate-shared-dashboard-v0.json");
