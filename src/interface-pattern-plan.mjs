const overlap = (left = [], right = []) => {
  const available = new Set(right);
  return left.filter((value) => available.has(value));
};

export function selectInterfacePatterns(useCase, catalog, { limit = 5 } = {}) {
  const medium = useCase.surfaceContext?.medium;
  return catalog.patterns
    .map((pattern) => {
      const taskMatches = overlap(useCase.tasks, pattern.tasks);
      const intentMatches = overlap(useCase.intent, pattern.intents);
      const structureMatches = overlap(useCase.informationStructure, pattern.informationStructures);
      const mediumMatch = medium && pattern.surfaceContexts.includes(medium);
      const score = taskMatches.length * 4 + intentMatches.length * 3 + structureMatches.length * 3 + (mediumMatch ? 2 : 0);
      const reasons = [];
      if (taskMatches.length) reasons.push(`supports ${taskMatches.join(", ")}`);
      if (intentMatches.length) reasons.push(`serves ${intentMatches.join(", ")}`);
      if (structureMatches.length) reasons.push(`fits ${structureMatches.join(", ")}`);
      if (mediumMatch) reasons.push(`fits ${medium}`);
      return { pattern, score, reasons };
    })
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => right.score - left.score || left.pattern.id.localeCompare(right.pattern.id))
    .slice(0, limit)
    .map(({ pattern, score, reasons }) => ({
      id: pattern.id,
      title: pattern.title,
      family: pattern.family,
      score,
      reason: reasons.join("; "),
      apply: pattern.apply,
      avoid: pattern.avoid,
      implementationHints: pattern.implementationHints,
      sources: pattern.sources.map(({ name, url, role }) => ({ name, url, role }))
    }));
}
