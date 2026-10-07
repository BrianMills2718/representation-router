const LAYOUT_SCHEMA_VERSION = "review-workbench-layout/v1";
const KEY_PREFIX = "representation-router:layout";

function requireNonEmptyString(value, label) {
  if (typeof value !== "string" || !value.trim()) throw new TypeError(`${label} must be a non-empty string`);
  return value;
}

function requireStorage(storage) {
  if (!storage || typeof storage.getItem !== "function" || typeof storage.setItem !== "function" || typeof storage.removeItem !== "function") {
    throw new TypeError("storage must provide getItem, setItem, and removeItem");
  }
  return storage;
}

function finiteCoordinate(value, label) {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new TypeError(`${label} must be a finite number`);
  return value;
}

function normalizePositions(nodes) {
  if (!Array.isArray(nodes)) throw new TypeError("nodes must be an array");
  const seen = new Set();
  return nodes.map((node, index) => {
    const id = requireNonEmptyString(node?.id, `nodes[${index}].id`);
    if (seen.has(id)) throw new TypeError(`node ids must be unique: ${id}`);
    seen.add(id);
    return {
      id,
      x: finiteCoordinate(node?.position?.x, `nodes[${index}].position.x`),
      y: finiteCoordinate(node?.position?.y, `nodes[${index}].position.y`)
    };
  });
}

export function createLayoutStorageKey({ workbenchId, subjectRevision, lens }) {
  const workbench = requireNonEmptyString(workbenchId, "workbenchId");
  const revision = requireNonEmptyString(subjectRevision, "subjectRevision");
  const view = requireNonEmptyString(lens, "lens");
  return `${KEY_PREFIX}:${encodeURIComponent(workbench)}:${encodeURIComponent(revision)}:${encodeURIComponent(view)}`;
}

export function createLayoutRecord({ workbenchId, subjectRevision, lens, nodes, savedAt = new Date().toISOString() }) {
  return {
    schemaVersion: LAYOUT_SCHEMA_VERSION,
    workbenchId: requireNonEmptyString(workbenchId, "workbenchId"),
    subjectRevision: requireNonEmptyString(subjectRevision, "subjectRevision"),
    lens: requireNonEmptyString(lens, "lens"),
    savedAt: requireNonEmptyString(savedAt, "savedAt"),
    positions: normalizePositions(nodes)
  };
}

export function parseLayoutRecord(raw, { workbenchId, subjectRevision, lens }) {
  if (typeof raw !== "string" || !raw.trim()) return { status: "missing", record: null };
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { status: "invalid", record: null, reason: "invalid-json" };
  }

  if (!parsed || parsed.schemaVersion !== LAYOUT_SCHEMA_VERSION) return { status: "invalid", record: null, reason: "schema-version" };
  if (parsed.workbenchId !== workbenchId || parsed.lens !== lens) return { status: "invalid", record: null, reason: "identity-mismatch" };
  if (parsed.subjectRevision !== subjectRevision) return { status: "stale", record: parsed, reason: "revision-mismatch" };
  if (!Array.isArray(parsed.positions)) return { status: "invalid", record: null, reason: "positions" };

  try {
    const positions = normalizePositions(parsed.positions.map((item) => ({ id: item.id, position: { x: item.x, y: item.y } })));
    return { status: "restored", record: { ...parsed, positions } };
  } catch {
    return { status: "invalid", record: null, reason: "positions" };
  }
}

export function applyLayoutPositions(defaultNodes, record) {
  if (!Array.isArray(defaultNodes)) throw new TypeError("defaultNodes must be an array");
  const positionMap = new Map((record?.positions ?? []).map((item) => [item.id, item]));
  return defaultNodes.map((node) => {
    const saved = positionMap.get(node.id);
    return {
      ...node,
      position: saved ? { x: saved.x, y: saved.y } : { ...node.position },
      data: node.data ? { ...node.data } : node.data
    };
  });
}

export function saveLayout(storage, input) {
  try {
    requireStorage(storage);
    const record = createLayoutRecord(input);
    const key = createLayoutStorageKey(input);
    storage.setItem(key, JSON.stringify(record));
    return { status: "saved", key, record };
  } catch (error) {
    return { status: "unavailable", error };
  }
}

export function loadLayout(storage, { workbenchId, subjectRevision, lens, defaultNodes }) {
  const safeDefaults = applyLayoutPositions(defaultNodes, null);
  try {
    requireStorage(storage);
    const key = createLayoutStorageKey({ workbenchId, subjectRevision, lens });
    const raw = storage.getItem(key);
    const parsed = parseLayoutRecord(raw, { workbenchId, subjectRevision, lens });
    if (parsed.status !== "restored") return { ...parsed, key, nodes: safeDefaults };
    return { ...parsed, key, nodes: applyLayoutPositions(defaultNodes, parsed.record) };
  } catch (error) {
    return { status: "unavailable", error, nodes: safeDefaults };
  }
}

export function clearLayout(storage, { workbenchId, subjectRevision, lens }) {
  try {
    requireStorage(storage);
    const key = createLayoutStorageKey({ workbenchId, subjectRevision, lens });
    storage.removeItem(key);
    return { status: "cleared", key };
  } catch (error) {
    return { status: "unavailable", error };
  }
}

export const layoutPersistenceContract = Object.freeze({
  schemaVersion: LAYOUT_SCHEMA_VERSION,
  keyPrefix: KEY_PREFIX,
  effect: "surface-local-presentation-only",
  revisionBinding: "exact-subject-revision",
  staleRevisionBehavior: "ignore-and-use-default-layout"
});
