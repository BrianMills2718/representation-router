import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { buildCollectionSpec } from "../src/collection-spec.mjs";
import { buildViewSpec, route } from "../src/router.mjs";

const readJson = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
const catalog = await readJson("../catalog/representations.json");
const heuristics = await readJson("../heuristics/core.json");

async function viewFor(name) {
  const useCase = await readJson(`../examples/${name}.json`);
  const ranked = route(useCase, catalog, heuristics).accepted[0];
  return buildViewSpec(useCase, ranked);
}

test("portfolio collection preserves shared interaction and semantic contracts across heterogeneous views", async () => {
  const views = await Promise.all([
    "portfolio-qualitative-analysis",
    "portfolio-cybernetic-influence",
    "portfolio-agent-ontology"
  ].map(viewFor));
  const spec = buildCollectionSpec(views, {
    id: "portfolio-selected-work",
    medium: "portfolio",
    preview: "desktop hover temporarily enlarges one card",
    activate: "click or Enter pins one card",
    exit: "Escape restores the collection",
    semanticBindings: [
      { semanticClass: "document", mark: "page-with-fold" },
      { semanticClass: "entity", mark: "circle" },
      { semanticClass: "claim", mark: "bordered-claim-card" },
      { semanticClass: "evidence", mark: "diamond" }
    ]
  });
  assert.equal(spec.medium, "portfolio");
  assert.equal(spec.heterogeneousRepresentations, true);
  assert.equal(spec.interactionContract.essentialInformationRequiresHover, false);
  assert.equal(spec.semanticContract.sameClassSameMark, true);
  assert.equal(spec.semanticContract.uiFocusDistinctFromSemanticEncoding, true);
  assert.ok(spec.qualityContract.reviews.includes("novice-comprehension"));
  assert.equal(spec.interactionContract.selectionDetail.includeIncomingRelationships, true);
  assert.equal(spec.interactionContract.selectionDetail.includeOutgoingRelationships, true);
  assert.equal(spec.interactionContract.selectionDetail.includeEvidence, true);
  assert.match(spec.interactionContract.selectionDetail.emptyStateRule, /Do not report no detail/);
  assert.equal(spec.qualityContract.unavailableViewsMasqueradeAsCompleted, false);
});
