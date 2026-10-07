const patternAdapters = {
  "requirements-traceability-matrix": "matrix",
  "adjacency-matrix": "matrix",
  "node-link-graph": "graph",
  // n-ary facts (keep-n-ary-relations-whole): the hub graph renders through the shared graph
  // viewer's hyperedges; PAOH and UpSet are matrix layouts (participants by facts, sets by members)
  "relation-hub-graph": "graph",
  "paoh-hypergraph": "matrix",
  "upset-plot": "matrix",
  "hierarchy-tree": "hierarchy",
  "layered-architecture-view": "architecture",
  "sequence-diagram": "sequence",
  timeline: "timeline",
  "data-table": "table",
  "master-detail": "master-detail",
  "state-machine-view": "state",
  "explorable-simulation": "simulation",
  "staged-explanatory-machine": "explanation",
  "scroll-linked-explainer": "explanation",
  "small-multiples": "small-multiples",
  "directed-handoff-flow": "flow",
  "process-swimlane": "process",
  "bpmn-process": "process",
  "data-model-diagram": "data-model",
  "schema-explorer": "master-detail",
  "project-schedule": "timeline",
  "geospatial-map": "spatial",
  "magnitude-flow": "flow",
  "composite-linked-view": "composite",
  "port-graph": "flow",
  "uml-component-diagram": "architecture",
  "uml-class-diagram": "data-model"
};

const titleCase = (value = "item") => value
  .replaceAll("-", " ")
  .replace(/\b\w/g, (char) => char.toUpperCase());

function labels(kinds = [], count = 5) {
  const source = kinds.length ? kinds : ["item"];
  return Array.from({ length: count }, (_, index) => {
    const kind = source[index % source.length];
    const cycle = Math.floor(index / source.length) + 1;
    return `${titleCase(kind)} ${cycle}`;
  });
}
function graphData(useCase) {
  const nodeLabels = labels(useCase.entities, 6);
  const relationship = titleCase(useCase.relationships?.[0] ?? "relates-to");
  return {
    nodes: nodeLabels.map((label, index) => ({ id: `n${index + 1}`, label })),
    edges: nodeLabels.slice(1).map((_, index) => ({
      source: `n${(index % 3) + 1}`,
      target: `n${index + 2}`,
      label: relationship
    }))
  };
}

function matrixData(useCase) {
  const rowKind = useCase.entities?.[0] ?? "row";
  const columnKind = useCase.entities?.[1] ?? useCase.entities?.[0] ?? "column";
  const rows = labels([rowKind], 5);
  const columns = labels([columnKind], 5);
  return {
    rows,
    columns,
    cells: rows.flatMap((row, r) => columns.map((column, c) => ({
      row, column, active: (r + c * 2) % 3 !== 0
    })))
  };
}
function sequenceData(useCase) {
  const actors = labels(useCase.entities, 4);
  const relation = titleCase(useCase.relationships?.[0] ?? "message");
  return {
    actors,
    messages: actors.slice(0, -1).flatMap((actor, index) => [
      { from: actor, to: actors[index + 1], label: `${relation} ${index + 1}` },
      ...(index === actors.length - 2 ? [] : [{ from: actors[index + 1], to: actor, label: "Acknowledge" }])
    ])
  };
}

function flowData(useCase) {
  const items = labels(useCase.entities, 6);
  return {
    columns: ["source", "resource", "destination"],
    flows: items.slice(0, 4).map((label, index) => ({
      source: items[index % items.length],
      resource: titleCase(useCase.relationships?.[0] ?? `resource-${index + 1}`),
      destination: items[(index + 2) % items.length],
      value: index + 1
    }))
  };
}

function processData(useCase) {
  const activities = labels(useCase.entities, 6);
  return {
    lanes: ["Owner A", "Owner B", "Owner C"],
    activities: activities.map((label, index) => ({ id: `a${index + 1}`, label, lane: index % 3 })),
    transitions: activities.slice(1).map((_, index) => ({ source: `a${index + 1}`, target: `a${index + 2}`, kind: index === 2 ? "gateway" : "sequence" }))
  };
}

function dataModelData(useCase) {
  const concepts = labels(useCase.entities, 6);
  return {
    entities: concepts.map((label, index) => ({ id: `d${index + 1}`, label, attributes: [`field_${index + 1}`, "status"] })),
    relationships: concepts.slice(1).map((_, index) => ({ source: `d${index + 1}`, target: `d${index + 2}`, cardinality: index % 2 ? "1:*" : "1:1" }))
  };
}

function spatialData(useCase) {
  return {
    points: labels(useCase.entities, 6).map((label, index) => ({ id: `p${index + 1}`, label, x: (index * 29) % 100, y: (index * 43) % 100 })),
    regions: ["Region A", "Region B"]
  };
}

function compositeData(useCase) {
  return {
    finding: useCase.concern,
    primary: graphData(useCase),
    secondary: matrixData(useCase),
    inspector: tableData(useCase)
  };
}

function timelineData(useCase) {
  return {
    events: labels(useCase.entities, 6).map((label, index) => ({
      id: `e${index + 1}`,
      label,
      step: index + 1
    }))
  };
}

function stateData() {
  const states = ["Idle", "Ready", "Active", "Review", "Complete"];
  return {
    states: states.map((label, index) => ({ id: `s${index + 1}`, label })),
    transitions: states.slice(1).map((_, index) => ({ source: `s${index + 1}`, target: `s${index + 2}` }))
  };
}
function hierarchyData(useCase) {
  const kinds = useCase.entities?.length ? useCase.entities : ["system", "subsystem", "component"];
  return {
    levels: kinds.slice(0, 4).map((kind, index) => ({
      label: titleCase(kind),
      items: labels([kind], Math.min(4, index + 2))
    }))
  };
}

function tableData(useCase) {
  const columns = (useCase.entities?.length ? useCase.entities : ["item", "status", "owner"])
    .slice(0, 4)
    .map(titleCase);
  return {
    columns,
    rows: Array.from({ length: 6 }, (_, r) => Object.fromEntries(columns.map((column, c) => [
      column,
      c === 0 ? `${column} ${r + 1}` : `${titleCase(useCase.relationships?.[c - 1] ?? "value")} ${r + 1}`
    ])))
  };
}

function smallMultiplesData(useCase) {
  return {
    facets: labels(useCase.entities, 6).map((label, index) => ({
      label,
      values: [2, 4, 3, 6, 5].map((value, step) => value + ((index + step) % 3) - 1)
    }))
  };
}
function simulationData(useCase) {
  return {
    actors: labels(useCase.entities, 5),
    steps: Array.from({ length: 7 }, (_, step) => ({
      step,
      values: [0, 1, 2, 3, 4].map((actorIndex) => 20 + ((step * 13 + actorIndex * 17) % 65))
    }))
  };
}

function explanationData(useCase) {
  const stageLabels = (useCase.entities?.length ? useCase.entities : ["input", "transform", "review", "output"]).slice(0, 8);
  return {
    stages: stageLabels.map((label, index) => ({ id: `stage${index + 1}`, label: titleCase(label), step: index + 1 })),
    payload: titleCase(useCase.focus || useCase.entities?.[0] || "example item"),
    relationships: (useCase.relationships ?? []).slice(0, 6).map(titleCase)
  };
}

function dataForAdapter(adapter, useCase) {
  if (adapter === "graph") return graphData(useCase);
  if (adapter === "flow") return flowData(useCase);
  if (adapter === "process") return processData(useCase);
  if (adapter === "data-model") return dataModelData(useCase);
  if (adapter === "spatial") return spatialData(useCase);
  if (adapter === "composite") return compositeData(useCase);
  if (adapter === "matrix") return matrixData(useCase);
  if (adapter === "sequence") return sequenceData(useCase);
  if (adapter === "timeline") return timelineData(useCase);
  if (adapter === "state") return stateData(useCase);
  if (adapter === "hierarchy" || adapter === "architecture") return hierarchyData(useCase);
  if (adapter === "table" || adapter === "master-detail") return tableData(useCase);
  if (adapter === "small-multiples") return smallMultiplesData(useCase);
  if (adapter === "simulation") return simulationData(useCase);
  if (adapter === "explanation") return explanationData(useCase);
  return { labels: labels(useCase.entities, 5) };
}

export function adapterForPattern(pattern) {
  return patternAdapters[pattern] ?? "generic";
}
export function buildRenderPlan(useCase, viewSpec) {
  const pattern = viewSpec?.representation?.pattern;
  if (!pattern) throw new Error("ViewSpec representation.pattern is required.");
  const adapter = adapterForPattern(pattern);
  const hasInstanceData = Boolean(useCase.modelData);
  return {
    version: "0.1",
    adapter,
    pattern,
    dynamics: viewSpec.representation.dynamics,
    title: viewSpec.concern || useCase.concern || titleCase(pattern),
    isSchematic: !hasInstanceData,
    note: hasInstanceData
      ? "Preview is backed by supplied model data."
      : "Schematic preview: this use case describes model types and constraints, not instance-level project data.",
    focus: useCase.focus ?? null,
    data: hasInstanceData ? useCase.modelData : dataForAdapter(adapter, useCase)
  };
}
