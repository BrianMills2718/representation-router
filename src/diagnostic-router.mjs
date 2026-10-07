import { normalizeProblemIntent } from "./problem-intent.mjs";
import { savedLayoutResetDiagnosticAdapter } from "./diagnostic-adapters/saved-layout-reset.mjs";

export const DIAGNOSTIC_ROUTER_VERSION = "diagnostic-router/v0";

const DEFAULT_ADAPTERS = [savedLayoutResetDiagnosticAdapter];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function adapters(values = DEFAULT_ADAPTERS) {
  if (!Array.isArray(values) || values.length === 0) throw new Error("at least one diagnostic adapter is required");
  const ids = new Set();
  for (const adapter of values) {
    if (!adapter?.adapterId || typeof adapter.supports !== "function" || typeof adapter.diagnose !== "function") {
      throw new Error("diagnostic adapters must expose adapterId, supports(), and diagnose()");
    }
    if (ids.has(adapter.adapterId)) throw new Error(`duplicate diagnostic adapter: ${adapter.adapterId}`);
    ids.add(adapter.adapterId);
  }
  return values;
}

export function listDiagnosticCapabilities(options = {}) {
  return adapters(options.adapters ?? DEFAULT_ADAPTERS).map((adapter) => ({
    adapterId: adapter.adapterId,
    version: adapter.version,
    affectedCapability: adapter.affectedCapability,
    title: adapter.authoring?.title ?? adapter.adapterId,
    summary: adapter.authoring?.summary ?? "",
    signalId: adapter.authoring?.signalId ?? null,
    signalValue: adapter.authoring?.signalValue ?? null
  }));
}

export function routeProblemIntent(input, options = {}) {
  let intent;
  try {
    intent = normalizeProblemIntent(clone(input));
  } catch (error) {
    return {
      status: "unsupported",
      problemId: input?.id ?? null,
      reasons: [error instanceof Error ? error.message : String(error)]
    };
  }

  const matchingCapability = adapters(options.adapters ?? DEFAULT_ADAPTERS).filter((adapter) => adapter.affectedCapability === intent.affectedCapability);
  if (matchingCapability.length === 0) {
    return {
      status: "unsupported",
      problemId: intent.id,
      reasons: [`No diagnostic adapter is registered for affected capability ${intent.affectedCapability}.`]
    };
  }

  const supported = [];
  const reasons = [];
  for (const adapter of matchingCapability) {
    const result = adapter.supports(intent);
    if (result?.supported) supported.push(adapter);
    else reasons.push(...(result?.reasons ?? [`${adapter.adapterId} rejected the problem intent.`]));
  }

  if (supported.length === 0) return { status: "unsupported", problemId: intent.id, reasons };
  if (supported.length > 1) {
    return {
      status: "ambiguous",
      problemId: intent.id,
      adapters: supported.map((adapter) => ({ id: adapter.adapterId, version: adapter.version }))
    };
  }

  return {
    status: "diagnosed",
    problemId: intent.id,
    adapter: { id: supported[0].adapterId, version: supported[0].version },
    intent,
    diagnosis: supported[0].diagnose(intent)
  };
}
