import {
  routeArchitectureCandidate,
  validateArchitectureCandidate
} from "../architecture-candidate.mjs";

const SUPPORTED_CONCERNS = new Set(["system_context", "contract_map", "data_flow"]);

function q(value) {
  return `"${String(value ?? "")
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"')
    .replaceAll("\n", " ")}"`;
}

function ident(value) {
  let result = String(value).replace(/[^A-Za-z0-9_]/g, "_");
  if (!/^[A-Za-z_]/.test(result)) result = `_${result}`;
  return result;
}

function workspaceLabel(candidate) {
  const name = candidate.source_design_ref.path.split("/").at(-1) ?? "architecture";
  return `Architecture projection · ${name.replace(/\.[^.]+$/, "")}`;
}

function relationshipTags(kind, contractRefs) {
  const kindTag = {
    interaction: "Interaction",
    data_flow: "DataFlow",
    artifact_flow: "ArtifactFlow",
    dependency: "Dependency",
    control: "Control"
  }[kind];
  return [
    "RRArchitectureRelationship",
    kindTag,
    ...(contractRefs.length ? ["ContractBound"] : [])
  ];
}

function endpointIdentifiers(relationships) {
  return [...new Set(
    relationships.flatMap((relationship) => [
      ident(relationship.from_ref),
      ident(relationship.to_ref)
    ])
  )].sort();
}

function selectedConcerns(candidate, requested) {
  const routed = routeArchitectureCandidate(candidate, { providerOrder: ["structurizr"] });
  const concerns = requested ?? Object.values(routed.routes)
    .filter((route) => route.selectedProvider === "structurizr")
    .map((route) => route.concern);

  for (const concern of concerns) {
    if (!SUPPORTED_CONCERNS.has(concern)) {
      throw new Error(`Structurizr architecture adapter does not support concern: ${concern}`);
    }
    const route = routed.routes[concern];
    if (!route || route.semanticStatus !== "available") {
      throw new Error(`Structurizr concern is not semantically available: ${concern}`);
    }
  }
  return [...new Set(concerns)];
}

export function generateStructurizrArchitecture(input, options = {}) {
  const candidate = validateArchitectureCandidate(input);
  const concerns = selectedConcerns(candidate, options.concerns);
  const contracts = new Map(candidate.contracts.map((item) => [item.contract_id, item]));
  const boundariesBySubject = new Map();
  for (const boundary of candidate.boundaries) {
    for (const subjectRef of boundary.subject_refs) {
      const existing = boundariesBySubject.get(subjectRef) ?? [];
      existing.push(boundary);
      boundariesBySubject.set(subjectRef, existing);
    }
  }

  const lines = [
    `workspace ${q(workspaceLabel(candidate))} ${q("Generated from ArchitectureViewCandidate; source Design remains authoritative.")} {`,
    "",
    "  !identifiers flat",
    "",
    "  model {"
  ];

  for (const item of candidate.elements) {
    const identifier = ident(item.design_id);
    const keyword = item.kind === "actor" ? "person" : "softwareSystem";
    const tags = [
      "RRArchitecture",
      item.kind === "actor" ? "RRActor" : "RRSystem",
      ...(item.kind === "external_system" ? ["RRExternalSystem"] : [])
    ];

    lines.push(`    ${identifier} = ${keyword} ${q(item.label)} ${q(item.description ?? "")} {`);
    lines.push(`      tags ${q(tags.join(","))}`);
    lines.push("      properties {");
    const elementBoundaries = boundariesBySubject.get(item.design_id) ?? [];
    lines.push(`        "rr.design_id" ${q(item.design_id)}`);
    lines.push(`        "rr.kind" ${q(item.kind)}`);
    lines.push(`        "rr.owner_boundary" ${q(item.owner_boundary)}`);
    lines.push(`        "rr.source_design_repository" ${q(candidate.source_design_ref.repository)}`);
    lines.push(`        "rr.source_design_revision" ${q(candidate.source_design_ref.revision)}`);
    lines.push(`        "rr.source_refs" ${q(JSON.stringify(item.source_refs))}`);
    if (elementBoundaries.length) {
      lines.push(`        "rr.boundary_refs" ${q(elementBoundaries.map((boundary) => boundary.boundary_id).join(","))}`);
      lines.push(`        "rr.boundary_kinds" ${q(elementBoundaries.map((boundary) => boundary.kind).join(","))}`);
    }
    lines.push("      }");
    lines.push("    }");
  }

  for (const relationship of candidate.relationships) {
    const source = ident(relationship.from_ref);
    const target = ident(relationship.to_ref);
    const relationshipId = ident(relationship.relationship_id);
    const contractLabels = relationship.contract_refs
      .map((ref) => contracts.get(ref)?.label)
      .filter(Boolean);
    const technology = contractLabels.join(", ");
    const tags = relationshipTags(relationship.kind, relationship.contract_refs);

    let declaration = `    ${relationshipId} = ${source} -> ${target} ${q(relationship.label)}`;
    if (technology) declaration += ` ${q(technology)}`;
    declaration += " {";
    lines.push(declaration);
    lines.push(`      tags ${q(tags.join(","))}`);
    lines.push("      properties {");
    lines.push(`        "rr.relationship_id" ${q(relationship.relationship_id)}`);
    lines.push(`        "rr.source_design_repository" ${q(candidate.source_design_ref.repository)}`);
    lines.push(`        "rr.source_design_revision" ${q(candidate.source_design_ref.revision)}`);
    lines.push(`        "rr.source_refs" ${q(JSON.stringify(relationship.source_refs))}`);
    if (relationship.contract_refs.length) {
      lines.push(`        "rr.contract_refs" ${q(relationship.contract_refs.join(","))}`);
      const contractSourceRefs = relationship.contract_refs.flatMap(
        (ref) => contracts.get(ref)?.source_refs ?? []
      );
      lines.push(`        "rr.contract_source_refs" ${q(JSON.stringify(contractSourceRefs))}`);
    }
    lines.push("      }");
    lines.push("    }");
  }

  lines.push("  }", "", "  views {");

  const contractRelationships = candidate.relationships.filter(
    (relationship) => relationship.contract_refs.length > 0
  );
  const flowRelationships = candidate.relationships.filter(
    (relationship) => ["data_flow", "artifact_flow"].includes(relationship.kind)
  );
  const contractEndpoints = endpointIdentifiers(contractRelationships);
  const flowEndpoints = endpointIdentifiers(flowRelationships);

  if (concerns.includes("system_context")) {
    lines.push(
      '    systemLandscape "architecture-context" "System-level architecture generated from source Design semantics." {',
      "      include *",
      "      autoLayout lr 250 180",
      '      title "Architecture context"',
      "    }",
      ""
    );
  }

  if (concerns.includes("contract_map")) {
    lines.push(
      '    systemLandscape "architecture-contracts" "Only relationships carrying typed architecture contracts." {',
      `      include ${contractEndpoints.join(" ")}`,
      '      exclude "relationship.tag!=ContractBound"',
      "      autoLayout lr 250 180",
      '      title "Typed architecture contracts"',
      "    }",
      ""
    );
  }

  if (concerns.includes("data_flow")) {
    lines.push(
      '    systemLandscape "architecture-flows" "Only source-declared data and artifact flows." {',
      `      include ${flowEndpoints.join(" ")}`,
      '      exclude "relationship.tag==Interaction"',
      '      exclude "relationship.tag==Dependency"',
      '      exclude "relationship.tag==Control"',
      "      autoLayout lr 250 180",
      '      title "Architecture data and artifact flows"',
      "    }",
      ""
    );
  }

  lines.push(
    "    styles {",
    '      element "Element" {',
    "        shape RoundedBox",
    "        background #172033",
    "        color #eef4ff",
    "        stroke #34445e",
    "      }",
    '      element "Person" {',
    "        shape Person",
    "        background #2c2a20",
    "        color #eef4ff",
    "        stroke #9b8a50",
    "      }",
    '      element "RRExternalSystem" {',
    "        background #202b36",
    "        stroke #718096",
    "      }",
    '      relationship "Relationship" {',
    "        color #8795a8",
    "        routing Orthogonal",
    "        fontSize 16",
    "        width 240",
    "      }",
    '      relationship "ContractBound" {',
    "        color #8c71b7",
    "        thickness 3",
    "      }",
    '      relationship "ArtifactFlow" {',
    "        color #4f9c87",
    "      }",
    "    }",
    "  }",
    "",
    "  configuration {",
    "    scope none",
    "    visibility private",
    "  }",
    "}",
    ""
  );

  return lines.join("\n");
}
