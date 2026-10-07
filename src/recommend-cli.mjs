import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { buildAgentRecommendation } from "./agent-recommendation.mjs";
import { assertContract, ContractValidationError } from "./schema-validation.mjs";

const args = process.argv.slice(2);
if (!args.length) {
  console.error("Usage: node src/recommend-cli.mjs <use-case.json> [--framework react] [--text-source] [--formal-modeling] [--editing] [--custom] [--multi-view] [--freeform] [--existing react-flow,d3]");
  process.exit(1);
}

function has(flag) { return args.includes(flag); }
function valueAfter(flag) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

const readJson = async (path) => JSON.parse(await readFile(resolve(path), "utf8"));
const rootJson = async (path) => JSON.parse(await readFile(new URL(`../${path}`, import.meta.url), "utf8"));

async function main() {
  const useCase = await readJson(args[0]);
  assertContract("use-case", useCase);

  const [representationCatalog, representationRelations, heuristics, interactionCatalog, implementationCatalog, interfacePatternCatalog, qualityCatalog, playbookCatalog, compositionCatalog] = await Promise.all([
    rootJson("catalog/representations.json"),
    rootJson("catalog/representation-relations.json"),
    rootJson("heuristics/core.json"),
    rootJson("catalog/interaction-patterns.json"),
    rootJson("catalog/implementations.json"),
    rootJson("catalog/interface-patterns.json"),
    rootJson("catalog/quality-methods.json"),
    rootJson("catalog/implementation-playbooks.json"),
    rootJson("catalog/composition-heuristics.json")
  ]);
  const context = {
    framework: valueAfter("--framework") ?? "unknown",
    preferTextSource: has("--text-source"),
    formalModeling: has("--formal-modeling"),
    requiresEditing: has("--editing") ? true : undefined,
    customVisualization: has("--custom"),
    multipleSynchronizedViews: has("--multi-view"),
    freeformCanvas: has("--freeform"),
    existingImplementations: (valueAfter("--existing") ?? "").split(",").filter(Boolean),
    assumptions: []
  };

  const recommendation = buildAgentRecommendation({
    useCase,
    representationCatalog,
    representationRelations,
    heuristics,
    interactionCatalog,
    implementationCatalog,
    interfacePatternCatalog,
    qualityCatalog,
    playbookCatalog,
    compositionCatalog,
    context
  });

  assertContract("agent-recommendation", recommendation);
  console.log(JSON.stringify(recommendation, null, 2));
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
