import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { buildAgentRecommendation } from "./agent-recommendation.mjs";
import { buildPagePlan } from "./page-plan.mjs";
import { buildGenerativeUiPlan, buildTurnAnswer } from "./generative-ui-plan.mjs";
import { assertContract, ContractValidationError } from "./schema-validation.mjs";

const args = process.argv.slice(2);
if (!args.length) {
  console.error("Usage: node src/recommend-cli.mjs <use-case.json> [--framework react] [--text-source] [--formal-modeling] [--editing] [--custom] [--multi-view] [--freeform] [--existing react-flow,d3] [--genui openui] [--compact] [--out recommendation.json]\n\n--genui <library>  print the components a generative-UI library (OpenUI) may use for the chosen view, plus the prompt line for its model.\n--compact          print only the view and allowed components, routed without the page plan: fast enough for every chat turn.\n\nRun through npm as `npm run --silent recommend -- ...` (or pass --out) so the output is plain JSON without npm's banner.");
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
  const genui = valueAfter("--genui");
  if (has("--compact")) {
    const componentCatalog = await rootJson("catalog/generative-ui-components.json");
    await emit(buildTurnAnswer(useCase, representationCatalog, heuristics, componentCatalog, { library: genui ?? "openui" }));
    return;
  }
  const context = {
    framework: valueAfter("--framework") ?? "unknown",
    preferTextSource: has("--text-source"),
    formalModeling: has("--formal-modeling"),
    requiresEditing: has("--editing") ? true : undefined,
    customVisualization: has("--custom"),
    multipleSynchronizedViews: has("--multi-view"),
    freeformCanvas: has("--freeform"),
    existingImplementations: (valueAfter("--existing") ?? "").split(",").filter(Boolean),
    generativeUi: Boolean(genui),
    assumptions: []
  };

  // A page of several sections gets one page plan, with each section's recommendation inside it.
  if (useCase.parts?.length && !genui) {
    await emit(buildPagePlan({ useCase, representationCatalog, representationRelations, heuristics, interactionCatalog, implementationCatalog, interfacePatternCatalog, qualityCatalog, playbookCatalog, compositionCatalog, context }));
    return;
  }

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
  for (const assumption of recommendation.assumptions ?? []) {
    if (assumption.startsWith("Ignored required capabilities")) console.error(`Warning: ${assumption}`);
  }
  if (genui) {
    await emit(buildGenerativeUiPlan(recommendation, await rootJson("catalog/generative-ui-components.json"), { library: genui, relations: representationRelations, constraints: useCase.constraints }));
    return;
  }
  await emit(recommendation);
}

async function emit(value) {
  const json = JSON.stringify(value, null, 2);
  const out = valueAfter("--out");
  if (out) {
    await writeFile(resolve(out), json + "\n", "utf8");
    console.error(`Written to ${resolve(out)}`);
  } else {
    console.log(json);
  }
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
