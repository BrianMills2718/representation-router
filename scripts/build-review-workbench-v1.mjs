import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderReviewWorkbenchV1 } from "../src/review-workbench-v1.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const basePath = resolve(root, "review-workbench/pr22.model.json");
const architecturePath = resolve(root, "review-workbench/pr22.architecture-v1.json");
const outputDir = resolve(root, "artifacts/review-workbench-v1");
const outputPath = resolve(outputDir, "index.html");

const [base, architecture] = await Promise.all([
  readFile(basePath, "utf8").then(JSON.parse),
  readFile(architecturePath, "utf8").then(JSON.parse)
]);

const html = renderReviewWorkbenchV1(base, architecture);
await mkdir(outputDir, { recursive: true });
await writeFile(outputPath, html);
console.log(JSON.stringify({ output: outputPath, bytes: Buffer.byteLength(html), lenses: ["overview", "component", "sequence", "state", "requirements", "evidence", "review"] }));
