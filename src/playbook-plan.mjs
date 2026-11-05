function scorePlaybook(playbook, rendererId, viewSpec) {
  if (!playbook.appliesTo.includes(rendererId)) return -Infinity;
  // A playbook for another kind of view is worse than none: a traceability matrix on native-web
  // used to get the explainer playbook and its 17 explainer-only anti-patterns as required lines.
  const family = viewSpec?.representation?.family;
  if (family && playbook.families.length && !playbook.families.includes(family)) return -Infinity;
  let score = 10;
  if (playbook.families.includes(viewSpec?.representation?.family)) score += 6;
  return score;
}

export function selectImplementationPlaybook(rendererId, viewSpec, catalog) {
  if (!rendererId || !catalog?.playbooks?.length) return null;
  const ranked = catalog.playbooks
    .map(playbook => ({ playbook, score: scorePlaybook(playbook, rendererId, viewSpec) }))
    .filter(item => Number.isFinite(item.score))
    .sort((a, b) => b.score - a.score);
  if (!ranked.length) return null;
  const p = ranked[0].playbook;
  return {
    id: p.id,
    buildSteps: p.buildSteps,
    avoid: p.avoid
  };
}
