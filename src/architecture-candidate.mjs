import { readFileSync } from "node:fs";
import {
  assertSchemaValue,
  collectUnsupportedSchemaKeywords
} from "./schema-validation.mjs";

const candidateSchema = JSON.parse(
  readFileSync(new URL("../schemas/architecture-view-candidate.v0.schema.json", import.meta.url), "utf8")
);

const REQUIRED_EXCLUDED_DOMAINS = Object.freeze(["intent", "work", "evidence", "review"]);

export const architectureProviders = Object.freeze({
  structurizr: Object.freeze({
    id: "structurizr",
    adapterVersion: "structurizr-architecture.v0",
    concerns: Object.freeze(["system_context", "contract_map", "data_flow"]),
    note: "Experimental repo-native architecture provider. Parser/render and visual superiority remain unproven."
  })
});

function duplicates(values) {
  const seen = new Set();
  const result = new Set();
  for (const value of values) {
    if (seen.has(value)) result.add(value);
    seen.add(value);
  }
  return [...result].sort();
}

export class ArchitectureCandidateSemanticError extends Error {
  constructor(errors) {
    super(`Invalid architecture-view-candidate.v0 semantics:\n- ${errors.join("\n- ")}`);
    this.name = "ArchitectureCandidateSemanticError";
    this.errors = errors;
  }
}

export function semanticArchitectureCandidateErrors(candidate) {
  const errors = [];
  const elementIds = candidate.elements.map((item) => item.design_id);
  const boundaryIds = candidate.boundaries.map((item) => item.boundary_id);
  const contractIds = candidate.contracts.map((item) => item.contract_id);
  const relationshipIds = candidate.relationships.map((item) => item.relationship_id);
  const behaviorIds = candidate.behaviors.map((item) => item.behavior_id);

  for (const [namespace, ids] of [
    ["element", elementIds],
    ["boundary", boundaryIds],
    ["contract", contractIds],
    ["relationship", relationshipIds],
    ["behavior", behaviorIds]
  ]) {
    for (const id of duplicates(ids)) errors.push(`duplicate_${namespace}_id:${id}`);
  }

  const elements = new Set(elementIds);
  const contracts = new Map(candidate.contracts.map((item) => [item.contract_id, item]));
  const relationships = new Map(candidate.relationships.map((item) => [item.relationship_id, item]));

  for (const boundary of candidate.boundaries) {
    for (const ref of boundary.subject_refs) {
      if (!elements.has(ref)) errors.push(`dangling_boundary_subject:${boundary.boundary_id}:${ref}`);
    }
  }

  for (const contract of candidate.contracts) {
    if (!elements.has(contract.producer_ref)) {
      errors.push(`dangling_contract_producer:${contract.contract_id}:${contract.producer_ref}`);
    }
    if (!elements.has(contract.consumer_ref)) {
      errors.push(`dangling_contract_consumer:${contract.contract_id}:${contract.consumer_ref}`);
    }
    if (contract.producer_ref === contract.consumer_ref) {
      errors.push(`self_contract_endpoint:${contract.contract_id}`);
    }
  }

  for (const relationship of candidate.relationships) {
    if (!elements.has(relationship.from_ref)) {
      errors.push(`dangling_relationship_from:${relationship.relationship_id}:${relationship.from_ref}`);
    }
    if (!elements.has(relationship.to_ref)) {
      errors.push(`dangling_relationship_to:${relationship.relationship_id}:${relationship.to_ref}`);
    }
    if (relationship.from_ref === relationship.to_ref) {
      errors.push(`self_relationship:${relationship.relationship_id}`);
    }

    for (const contractRef of relationship.contract_refs) {
      const contract = contracts.get(contractRef);
      if (!contract) {
        errors.push(`dangling_relationship_contract:${relationship.relationship_id}:${contractRef}`);
        continue;
      }
      if (contract.producer_ref !== relationship.from_ref || contract.consumer_ref !== relationship.to_ref) {
        errors.push(`relationship_contract_endpoint_mismatch:${relationship.relationship_id}:${contractRef}`);
      }
    }
  }

  for (const behavior of candidate.behaviors) {
    for (const ref of behavior.relationship_refs) {
      if (!relationships.has(ref)) {
        errors.push(`dangling_behavior_relationship:${behavior.behavior_id}:${ref}`);
      }
    }
  }

  const excluded = [...candidate.excluded_domains].sort();
  const expected = [...REQUIRED_EXCLUDED_DOMAINS].sort();
  if (JSON.stringify(excluded) !== JSON.stringify(expected)) {
    errors.push("excluded_domains_must_be_exactly:intent,work,evidence,review");
  }

  return errors;
}

export function validateArchitectureCandidate(candidate) {
  const unsupported = collectUnsupportedSchemaKeywords(candidateSchema, "architecture-view-candidate-v0");
  if (unsupported.length) {
    throw new Error(`Architecture candidate schema uses unsupported validator keywords:\n- ${unsupported.join("\n- ")}`);
  }

  assertSchemaValue("architecture-view-candidate-v0", candidateSchema, candidate);
  const errors = semanticArchitectureCandidateErrors(candidate);
  if (errors.length) throw new ArchitectureCandidateSemanticError(errors);
  return candidate;
}

function concern(id, available, reason, present = [], missing = []) {
  return Object.freeze({
    id,
    semanticStatus: available ? "available" : "unavailable",
    available,
    reason,
    present: Object.freeze([...present]),
    missing: Object.freeze([...missing])
  });
}

export function deriveArchitectureConcernAvailability(input) {
  const candidate = validateArchitectureCandidate(input);
  const relationshipKinds = new Set(candidate.relationships.map((item) => item.kind));
  const deploymentBoundaries = candidate.boundaries.filter((item) => item.kind === "deployment");

  return Object.freeze({
    system_context: concern(
      "system_context",
      candidate.elements.length > 0 && candidate.relationships.length > 0,
      candidate.elements.length > 0 && candidate.relationships.length > 0
        ? "System-level elements and typed relationships are present."
        : "System context requires system-level elements plus relationships.",
      ["elements", "relationships"],
      candidate.relationships.length ? [] : ["relationships"]
    ),
    contract_map: concern(
      "contract_map",
      candidate.contracts.length > 0,
      candidate.contracts.length > 0
        ? "Typed relationship contracts are present."
        : "No typed architecture contracts are present.",
      candidate.contracts.length ? ["contracts"] : [],
      candidate.contracts.length ? [] : ["contracts"]
    ),
    data_flow: concern(
      "data_flow",
      relationshipKinds.has("data_flow") || relationshipKinds.has("artifact_flow"),
      relationshipKinds.has("data_flow") || relationshipKinds.has("artifact_flow")
        ? "Data/artifact-flow relationships are present."
        : "No data_flow or artifact_flow relationships are present.",
      ["relationships"],
      relationshipKinds.has("data_flow") || relationshipKinds.has("artifact_flow")
        ? []
        : ["data_flow|artifact_flow relationship"]
    ),
    component: concern(
      "component",
      false,
      "Candidate v0 intentionally excludes component hierarchy until a real source defines parent/containment semantics.",
      [],
      ["component hierarchy"]
    ),
    sequence: concern(
      "sequence",
      candidate.behaviors.length > 0,
      candidate.behaviors.length > 0
        ? "Ordered architecture behavior references are present."
        : "No architecture behaviors are present.",
      candidate.behaviors.length ? ["behaviors"] : [],
      candidate.behaviors.length ? [] : ["behaviors"]
    ),
    deployment: concern(
      "deployment",
      deploymentBoundaries.length > 0,
      deploymentBoundaries.length > 0
        ? "Deployment boundary semantics are present."
        : "No deployment boundary semantics are present.",
      deploymentBoundaries.length ? ["deployment boundaries"] : [],
      deploymentBoundaries.length ? [] : ["deployment boundary"]
    )
  });
}

export function routeArchitectureCandidate(input, options = {}) {
  const candidate = validateArchitectureCandidate(input);
  const availability = deriveArchitectureConcernAvailability(candidate);
  const providerOrder = options.providerOrder ?? Object.keys(architectureProviders);
  const routes = {};

  for (const [id, semantic] of Object.entries(availability)) {
    if (!semantic.available) {
      routes[id] = {
        concern: id,
        semanticStatus: "unavailable",
        providerStatus: "not_applicable",
        selectedProvider: null,
        candidateProviders: [],
        reason: semantic.reason
      };
      continue;
    }

    const candidates = providerOrder.filter((providerId) => {
      const provider = architectureProviders[providerId];
      return provider?.concerns.includes(id);
    });

    routes[id] = {
      concern: id,
      semanticStatus: "available",
      providerStatus: candidates.length ? "available" : "unavailable",
      selectedProvider: candidates[0] ?? null,
      candidateProviders: candidates,
      reason: candidates.length
        ? `${semantic.reason} Selected ${candidates[0]} from currently implemented experimental adapters.`
        : `${semantic.reason} No current experimental provider adapter supports this concern.`
    };
  }

  return {
    candidateVersion: candidate.candidate_version,
    sourceDesignRef: candidate.source_design_ref,
    routes
  };
}
