import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateImplementationBrief, validateImplementationReceipt } from "../src/implementation-loop.mjs";
import { renderImplementationLoop } from "../implementation-loop-v0/render.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const out = resolve(root, "artifacts/implementation-loop-v0");

const brief = JSON.parse(await readFile(resolve(root, "examples/implementation-brief-explicit-save-v0.json"), "utf8"));
const receipt = JSON.parse(await readFile(resolve(root, "examples/implementation-receipt-explicit-save-v0.json"), "utf8"));
validateImplementationBrief(brief);
validateImplementationReceipt(receipt, brief);

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await writeFile(resolve(out, "index.html"), renderImplementationLoop({ brief, receipt }), "utf8");
console.log(`Built ${resolve(out, "index.html")}`);
console.log(`Candidate remains pinned to retained artifact ${receipt.artifact.id} from run ${receipt.ci.runId}`);
