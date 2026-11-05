// Gathers every evidence run's check.json and model outputs into src/data.json for the render page.
import { readdir, readFile, writeFile } from "node:fs/promises";
const root = process.argv[2] ?? "evidence";
const rows = [];
// A single run folder (has check.json) or the evidence folder holding several runs.
const single = (await readdir(root)).includes("check.json");
for (const run of single ? [root.split("/").pop()] : (await readdir(root)).sort()) {
  const dir = single ? root : `${root}/${run}`;
  const checks = JSON.parse(await readFile(`${dir}/check.json`, "utf8").catch(() => "[]"));
  for (const r of checks) {
    const output = JSON.parse(await readFile(`${dir}/${r.file}`, "utf8"));
    const input = JSON.parse(await readFile(`${dir}/${r.file.split("--").slice(0, 2).join("--")}.input.json`, "utf8"));
    rows.push({ ...r, run, content: output.content, libraryComponents: input.libraryComponents });
  }
}
await writeFile(new URL("./data.json", import.meta.url), JSON.stringify(rows));
console.log(`${rows.length} answers from ${root}`);
