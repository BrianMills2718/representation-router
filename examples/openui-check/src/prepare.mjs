// Builds, for each case and mode, the exact system prompt OpenUI generates from the library the model may use.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { openuiPromptOptions } from "@openuidev/react-ui";
import { cases } from "./cases.mjs";
import { libraryFor } from "./libraries.mjs";

const RR = process.env.RR ?? new URL("../../..", import.meta.url).pathname.replace(/\/$/, "");
const { buildAgentRecommendation } = await import(`${RR}/src/agent-recommendation.mjs`);
const { buildGenerativeUiPlan } = await import(`${RR}/src/generative-ui-plan.mjs`);
const json = async (p) => JSON.parse(await readFile(`${RR}/${p}`, "utf8"));
const catalogs = {
  representationCatalog: await json("catalog/representations.json"),
  representationRelations: await json("catalog/representation-relations.json"),
  heuristics: await json("heuristics/core.json"),
  interactionCatalog: await json("catalog/interaction-patterns.json"),
  implementationCatalog: await json("catalog/implementations.json"),
  interfacePatternCatalog: await json("catalog/interface-patterns.json"),
  qualityCatalog: await json("catalog/quality-methods.json"),
  playbookCatalog: await json("catalog/implementation-playbooks.json"),
  compositionCatalog: await json("catalog/composition-heuristics.json")
};
const componentCatalog = await json("catalog/generative-ui-components.json");
const out = process.argv[2];
await mkdir(out, { recursive: true });

for (const c of cases) {
  const useCase = await json(c.useCase);
  const recommendation = buildAgentRecommendation({ useCase, ...catalogs, context: { generativeUi: true } });
  const plan = buildGenerativeUiPlan(recommendation, componentCatalog, { relations: catalogs.representationRelations, constraints: useCase.constraints });
  for (const mode of (process.env.MODES ?? "router,plain").split(",")) {
    const library = libraryFor(plan, mode);
    const options = mode === "router"
      ? { ...openuiPromptOptions, additionalRules: [...(openuiPromptOptions.additionalRules ?? []), plan.instruction] }
      : openuiPromptOptions;
    const system = library.prompt(options);
    await writeFile(`${out}/${c.id}--${mode}.input.json`, JSON.stringify({
      case: c.id, mode, routerView: plan.representation, allowed: [...plan.components, ...plan.customComponents.map((x) => x.name)],
      libraryComponents: Object.keys(library.components), instruction: mode === "router" ? plan.instruction : null,
      system, user: c.question
    }, null, 2));
    console.log(`${c.id} ${mode}: view=${plan.representation} library=${Object.keys(library.components).length} components, prompt ${system.length} chars`);
  }
}
