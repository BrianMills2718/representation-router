import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderReviewWorkbench } from "../src/review-workbench.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const args = process.argv.slice(2);
const valueAfter = (flag, fallback) => {
  const index = args.indexOf(flag);
  if (index < 0) return fallback;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`Missing value for ${flag}`);
  return value;
};

const inputPath = resolve(root, valueAfter("--input", "review-workbench/pr22.model.json"));
const outputDir = resolve(root, valueAfter("--output", "artifacts/review-workbench-v0"));
const model = JSON.parse(await readFile(inputPath, "utf8"));
const html = renderReviewWorkbench(model);

await mkdir(outputDir, { recursive: true });
await writeFile(resolve(outputDir, "index.html"), html, "utf8");
await writeFile(resolve(outputDir, "model.json"), JSON.stringify(model, null, 2) + "\n", "utf8");

console.log(JSON.stringify({
  output: outputDir,
  entrypoint: resolve(outputDir, "index.html"),
  model: inputPath,
  bytes: Buffer.byteLength(html)
}));
