// Public-hosting adapter around the REAL router: reads {"useCase": {...}} as JSON on stdin, validates it against the
// router's own use-case contract, ranks every catalog representation (src/router.mjs route), builds the full agent
// recommendation (src/agent-recommendation.mjs), and prints one compact JSON object on stdout.
// It reads only the repository's fixed catalog files; it never reads a path from its input.
import { readFileSync } from "node:fs";
import { route } from "../src/router.mjs";
import { buildAgentRecommendation } from "../src/agent-recommendation.mjs";
import { assertContract, ContractValidationError } from "../src/schema-validation.mjs";

const load = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), "utf8"));

function readStdin() {
  return readFileSync(0, "utf8");
}

try {
  const input = JSON.parse(readStdin());
  const useCase = input.useCase;
  assertContract("use-case", useCase);

  const catalog = load("catalog/representations.json");
  const heuristics = load("heuristics/core.json");
  const ranked = route(useCase, catalog, heuristics, { limit: catalog.length });
  const recommendation = buildAgentRecommendation({
    useCase,
    representationCatalog: catalog,
    representationRelations: load("catalog/representation-relations.json"),
    heuristics,
    interactionCatalog: load("catalog/interaction-patterns.json"),
    implementationCatalog: load("catalog/implementations.json"),
    interfacePatternCatalog: load("catalog/interface-patterns.json"),
    qualityCatalog: load("catalog/quality-methods.json"),
    playbookCatalog: load("catalog/implementation-playbooks.json"),
    compositionCatalog: load("catalog/composition-heuristics.json"),
    context: { framework: "unknown", assumptions: [] },
  });
  assertContract("agent-recommendation", recommendation);

  const plan = recommendation.compositionPlan;
  const out = {
    catalogSize: catalog.length,
    ranking: ranked.accepted.map((r) => ({ id: r.candidate.id, family: r.candidate.family, score: r.score, reasons: r.reasons, mobileSuitability: r.candidate.mobileSuitability })),
    rejected: ranked.rejected.map((r) => ({ id: r.candidate.id, family: r.candidate.family, reasons: r.rejectedBecause })),
    recommendation: {
      availability: recommendation.availability?.status ?? null,
      primary: recommendation.primary
        ? {
            representation: recommendation.primary.representation,
            layout: recommendation.primary.implementation?.layout ?? null,
            interaction: (recommendation.primary.interaction ?? []).map((i) => (typeof i === "string" ? i : i.id ?? i.title ?? JSON.stringify(i))),
          }
        : null,
      alternatives: recommendation.alternativesDetailed ?? [],
      avoid: recommendation.avoid ?? [],
      rationale: recommendation.rationale ?? [],
      interfacePatterns: (recommendation.interfacePatterns ?? []).slice(0, 4).map((p) => ({ id: p.id, title: p.title, family: p.family, reason: p.reason, apply: (p.apply ?? []).slice(0, 3) })),
      checks: recommendation.quality
        ? { method: recommendation.quality.method, hard: recommendation.quality.hardChecks ?? [], soft: (recommendation.quality.softChecks ?? []).slice(0, 12), usability: recommendation.quality.usabilityChecks ?? [] }
        : null,
      compositionPlan: plan
        ? {
            question: plan.question,
            form: plan.primary?.form ?? null,
            secondary: plan.secondary ?? [],
            readingOrder: plan.readingOrder ?? [],
            hierarchy: plan.hierarchy ?? null,
            emphasis: plan.emphasis ?? null,
            densityBudget: plan.densityBudget ?? null,
            coldReadTarget: plan.coldReadTarget ?? null,
          }
        : null,
      viewSpec: recommendation.viewSpec
        ? { pattern: recommendation.viewSpec.representation?.pattern, family: recommendation.viewSpec.representation?.family, dynamics: recommendation.viewSpec.representation?.dynamics, layout: recommendation.viewSpec.representation?.layout }
        : null,
    },
  };
  process.stdout.write(JSON.stringify(out));
} catch (error) {
  const message = error instanceof ContractValidationError ? error.message : (error?.message ?? String(error));
  process.stderr.write(message);
  process.exit(2);
}
