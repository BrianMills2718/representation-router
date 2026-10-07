import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { buildViewSpec, route } from "./router.mjs";
import { assertContract, ContractValidationError } from "./schema-validation.mjs";

async function readJson(path) { return JSON.parse(await readFile(resolve(path), "utf8")); }

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("Usage: node src/cli.mjs <use-case.json>");
  process.exit(1);
}

async function main() {
  const useCase = await readJson(inputPath);
  assertContract("use-case", useCase);

  const [catalog, heuristics] = await Promise.all([
    readJson("catalog/representations.json"), readJson("heuristics/core.json")
  ]);
  const result = route(useCase, catalog, heuristics);

  console.log("Ranked candidates\n=================");
  for (const [index, item] of result.accepted.entries()) {
    console.log(`${index + 1}. ${item.candidate.id} — ${item.score}`);
    for (const reason of item.reasons) console.log(`   • ${reason}`);
  }
  if (result.rejected.length) {
    console.log("\nHard-rejected candidates\n========================");
    for (const item of result.rejected) console.log(`- ${item.candidate.id}: ${item.rejectedBecause.join("; ")}`);
  }
  if (!result.accepted.length) {
    console.error("\nNo valid representation candidates remain.");
    process.exitCode = 2;
    return;
  }
  console.log("\nGenerated ViewSpec\n==================");
  const viewSpec = buildViewSpec(useCase, result.accepted[0]);
  assertContract("view-spec", viewSpec);
  console.log(JSON.stringify(viewSpec, null, 2));
}

try {
  await main();
} catch (error) {
  if (error instanceof ContractValidationError) {
    console.error(error.message);
  } else {
    console.error(error?.stack ?? error?.message ?? String(error));
  }
  process.exitCode = 1;
}
