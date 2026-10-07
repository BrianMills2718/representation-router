import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { renderProjectTemplate } from "../src/project-template.mjs";

const args = process.argv.slice(2);
const valueAfter = (flag) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : null;
};

const root = fileURLToPath(new URL("../", import.meta.url));
const projectionArg = valueAfter("--projection");
const projectionPath = resolve(projectionArg ?? `${root}/examples/twitter-prospecting-project-template-v2.json`);
// A real projection must bring its own surfaces. Falling back to the example bundle
// silently put another project's diagrams into the output (found 2026-10-01 building
// the AI Astronauts hive brain). Pass --no-surfaces to render the plan with every
// expected surface shown as missing.
const surfacesArg = valueAfter("--surfaces");
const noSurfaces = args.includes("--no-surfaces");
if (projectionArg && !surfacesArg && !noSurfaces) {
  console.error("--projection was given without --surfaces. Pass the project's surfaces bundle, or --no-surfaces to render every expected surface as missing.");
  process.exit(1);
}
const surfacesPath = surfacesArg ? resolve(surfacesArg) : (noSurfaces ? null : `${root}/examples/twitter-prospecting-project-surfaces-v2.json`);
const outputPath = resolve(valueAfter("--output") ?? `${root}/artifacts/project-template/index.html`);
const productPath = valueAfter("--product-html") ?? (projectionArg ? null : `${root}/examples/resolved-product-artifacts/twitter-prospecting/ab2cfba0e8c43f0198716dee4414dedf2212d478/index.html`);

const projection = JSON.parse(await readFile(projectionPath, "utf8"));
const surfaces = surfacesPath ? JSON.parse(await readFile(surfacesPath, "utf8")) : { intended: {}, actual: {}, bundleState: {} };
const productHtml = productPath ? await readFile(resolve(productPath), "utf8") : null;
const html = renderProjectTemplate(projection, surfaces, { productHtml });

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, html, "utf8");
console.log(`Wrote ${outputPath}`);
