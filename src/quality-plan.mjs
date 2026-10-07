function matchScore(method, rendererId, viewSpec, context = {}) {
  // Composition-layer methods apply on top of the renderer method, never instead of it.
  if (method.layer === "composition") return -Infinity;
  if (!method.appliesTo.includes(rendererId)) return -Infinity;
  let score = 10;
  const family = viewSpec?.representation?.family;
  const pattern = viewSpec?.representation?.pattern;
  const substrate = context.renderingSubstrate;
  if (substrate && method.when.includes(substrate)) score += 6;
  if (family && method.when.includes(family)) score += 4;
  if (pattern && method.when.includes(pattern)) score += 3;
  if (rendererId === 'd3' && family === 'explorable-explanation' && method.id === 'measured-svg-quality') score += 4;
  return score;
}

export function selectQualityMethod(rendererId, viewSpec, qualityCatalog, context = {}) {
  if (!qualityCatalog?.methods?.length || !rendererId) return null;
  const ranked = qualityCatalog.methods
    .map(method => ({ method, score: matchScore(method, rendererId, viewSpec, context) }))
    .filter(item => Number.isFinite(item.score))
    .sort((a,b) => b.score-a.score);
  // The one-page composition layer (Librande) applies to every human-facing
  // surface regardless of renderer: its checks are appended so the disposition
  // step cannot skip the whole-page questions while passing the mark-level ones.
  const composition = compositionMethod(qualityCatalog);
  if (!ranked.length) {
    // No renderer-specific method covers this renderer. Returning null here used
    // to crash the caller; instead keep the whole-page checks and say plainly
    // which renderer has no mark-level method, so the gap is visible, not silent.
    if (!composition) return null;
    return {
      method: null,
      uncoveredRenderer: rendererId,
      compositionMethod: composition.id,
      workflow: [...(composition.workflow ?? [])],
      hardChecks: [...(composition.hardChecks ?? [])],
      softChecks: [...(composition.softChecks ?? [])],
      usabilityChecks: [...(composition.usabilityChecks ?? [])],
      repairOrder: [...(composition.repairOrder ?? [])]
    };
  }
  const { method } = ranked[0];
  const merge = (a, b) => [...(a ?? []), ...(b ?? []).filter((id) => !(a ?? []).includes(id))];
  return {
    method: method.id,
    compositionMethod: composition?.id ?? null,
    workflow: merge(method.workflow, composition?.workflow),
    hardChecks: merge(method.hardChecks, composition?.hardChecks),
    softChecks: merge(method.softChecks, composition?.softChecks),
    usabilityChecks: merge(method.usabilityChecks ?? [], composition?.usabilityChecks),
    repairOrder: merge(method.repairOrder, composition?.repairOrder)
  };
}

export function compositionMethod(qualityCatalog) {
  return (qualityCatalog?.methods ?? []).find((method) => method.layer === "composition") ?? null;
}
