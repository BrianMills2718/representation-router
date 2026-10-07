import { renderProjectTemplate as renderProjectTemplateV1 } from "./project-template-core-legacy.mjs";
import { renderProjectTemplateV2 } from "./project-template-v2.mjs";
import { RR_PROJECT_TEMPLATE_CSS } from "./project-template-theme.mjs";

export function renderProjectTemplate(projectionInput, surfaceBundleInput, options = {}) {
  const renderer = projectionInput?.schema_version === "project-review-projection.v2"
    ? renderProjectTemplateV2
    : renderProjectTemplateV1;
  const html = renderer(projectionInput, surfaceBundleInput, options);
  const themed = html.replace(/<style>[\s\S]*?<\/style>/, `<style>\n${RR_PROJECT_TEMPLATE_CSS}\n</style>`);
  if (themed === html) throw new Error("project template shell style block not found");
  return themed;
}
