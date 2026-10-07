import { readFileSync } from "node:fs";

const CONTRACT_FILES = Object.freeze({
  "use-case": "use-case.schema.json",
  "agent-recommendation": "agent-recommendation.schema.json",
  "view-spec": "view-spec.schema.json",
  "collection-spec": "collection-spec.schema.json",
  "surface-spec": "surface-spec.schema.json"
});

const SCHEMA_FILES = Object.freeze(
  Object.fromEntries(Object.values(CONTRACT_FILES).map((file) => [file, loadSchema(file)]))
);

const SUPPORTED_KEYWORDS = new Set([
  "$schema",
  "$id",
  "$ref",
  "$defs",
  "title",
  "description",
  "type",
  "required",
  "properties",
  "additionalProperties",
  "enum",
  "const",
  "items",
  "minItems",
  "maxItems",
  "uniqueItems",
  "minLength",
  "maxLength",
  "minimum",
  "maximum",
  "pattern",
  "format",
  "anyOf",
  "oneOf",
  "allOf",
  "if",
  "then",
  "else"
]);

function loadSchema(file) {
  return JSON.parse(readFileSync(new URL(`../schemas/${file}`, import.meta.url), "utf8"));
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function valueTypeMatches(value, type) {
  switch (type) {
    case "null": return value === null;
    case "array": return Array.isArray(value);
    case "object": return isObject(value);
    case "string": return typeof value === "string";
    case "boolean": return typeof value === "boolean";
    case "integer": return Number.isInteger(value);
    case "number": return typeof value === "number" && Number.isFinite(value);
    default: return false;
  }
}

function formatValue(value) {
  if (typeof value === "string") return JSON.stringify(value);
  if (value === undefined) return "undefined";
  return JSON.stringify(value);
}

function childPath(path, key) {
  return /^[A-Za-z_$][A-Za-z0-9_$-]*$/.test(key)
    ? `${path}.${key}`
    : `${path}[${JSON.stringify(key)}]`;
}

function pointerValue(root, fragment) {
  if (fragment === "#" || fragment === "") return root;
  if (!fragment.startsWith("#/")) throw new Error(`Unsupported JSON Schema reference fragment: ${fragment}`);
  return fragment
    .slice(2)
    .split("/")
    .map((part) => part.replaceAll("~1", "/").replaceAll("~0", "~"))
    .reduce((value, part) => value?.[part], root);
}

function resolveRef(ref, context) {
  const hashIndex = ref.indexOf("#");
  const filePart = hashIndex >= 0 ? ref.slice(0, hashIndex) : ref;
  const fragment = hashIndex >= 0 ? ref.slice(hashIndex) : "";
  const rootSchema = filePart ? SCHEMA_FILES[filePart] : context.rootSchema;
  if (!rootSchema) throw new Error(`Unknown JSON Schema reference: ${ref}`);
  const resolved = pointerValue(rootSchema, fragment);
  if (!resolved) throw new Error(`Unresolvable JSON Schema reference: ${ref}`);
  return { schema: resolved, rootSchema, file: filePart || context.file };
}

function validateFormat(format, value) {
  if (format !== "uri" || typeof value !== "string") return true;
  try {
    const parsed = new URL(value);
    return Boolean(parsed.protocol);
  } catch {
    return false;
  }
}

function deepUnique(values) {
  const seen = new Set();
  for (const value of values) {
    const key = JSON.stringify(value);
    if (seen.has(key)) return false;
    seen.add(key);
  }
  return true;
}

function pushError(errors, path, message, keyword) {
  errors.push({ path, message, keyword });
}

function validateNode(schema, value, context, path, errors) {
  if (schema === true) return;
  if (schema === false) {
    pushError(errors, path, "is not allowed by the schema", "falseSchema");
    return;
  }
  if (!isObject(schema)) throw new Error(`Invalid JSON Schema node at ${path}.`);

  if (schema.$ref) {
    const resolved = resolveRef(schema.$ref, context);
    validateNode(resolved.schema, value, resolved, path, errors);
    return;
  }

  if (schema.allOf) {
    for (const branch of schema.allOf) validateNode(branch, value, context, path, errors);
  }

  if (schema.anyOf) {
    const matches = schema.anyOf.filter((branch) => {
      const branchErrors = [];
      validateNode(branch, value, context, path, branchErrors);
      return branchErrors.length === 0;
    });
    if (!matches.length) pushError(errors, path, "must match at least one allowed schema shape", "anyOf");
  }

  if (schema.oneOf) {
    const matches = schema.oneOf.filter((branch) => {
      const branchErrors = [];
      validateNode(branch, value, context, path, branchErrors);
      return branchErrors.length === 0;
    });
    if (matches.length !== 1) pushError(errors, path, `must match exactly one allowed schema shape (matched ${matches.length})`, "oneOf");
  }

  if (schema.if) {
    const predicateErrors = [];
    validateNode(schema.if, value, context, path, predicateErrors);
    if (predicateErrors.length === 0 && schema.then) validateNode(schema.then, value, context, path, errors);
    if (predicateErrors.length > 0 && schema.else) validateNode(schema.else, value, context, path, errors);
  }

  if (schema.const !== undefined && !Object.is(value, schema.const)) {
    pushError(errors, path, `must equal ${formatValue(schema.const)}`, "const");
  }

  if (schema.enum && !schema.enum.some((allowed) => Object.is(value, allowed))) {
    pushError(errors, path, `must be one of ${schema.enum.map(formatValue).join(", ")}`, "enum");
  }

  if (schema.type !== undefined) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((type) => valueTypeMatches(value, type))) {
      pushError(errors, path, `must be ${types.join(" or ")}`, "type");
      return;
    }
  }

  if (typeof value === "string") {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      pushError(errors, path, `must contain at least ${schema.minLength} character(s)`, "minLength");
    }
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      pushError(errors, path, `must contain at most ${schema.maxLength} character(s)`, "maxLength");
    }
    if (schema.pattern !== undefined && !new RegExp(schema.pattern).test(value)) {
      pushError(errors, path, `must match pattern ${schema.pattern}`, "pattern");
    }
    if (schema.format !== undefined && !validateFormat(schema.format, value)) {
      pushError(errors, path, `must match format ${schema.format}`, "format");
    }
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    if (schema.minimum !== undefined && value < schema.minimum) {
      pushError(errors, path, `must be >= ${schema.minimum}`, "minimum");
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      pushError(errors, path, `must be <= ${schema.maximum}`, "maximum");
    }
  }

  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      pushError(errors, path, `must contain at least ${schema.minItems} item(s)`, "minItems");
    }
    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      pushError(errors, path, `must contain at most ${schema.maxItems} item(s)`, "maxItems");
    }
    if (schema.uniqueItems && !deepUnique(value)) {
      pushError(errors, path, "must contain unique items", "uniqueItems");
    }
    if (schema.items) {
      value.forEach((item, index) => validateNode(schema.items, item, context, `${path}[${index}]`, errors));
    }
  }

  if (isObject(value)) {
    for (const required of schema.required ?? []) {
      if (!Object.hasOwn(value, required)) {
        pushError(errors, path, `missing required property ${JSON.stringify(required)}`, "required");
      }
    }

    for (const [key, propertySchema] of Object.entries(schema.properties ?? {})) {
      if (Object.hasOwn(value, key)) validateNode(propertySchema, value[key], context, childPath(path, key), errors);
    }

    if (schema.additionalProperties === false && schema.properties) {
      const allowed = new Set(Object.keys(schema.properties));
      for (const key of Object.keys(value)) {
        if (!allowed.has(key)) pushError(errors, childPath(path, key), "is not an allowed property", "additionalProperties");
      }
    } else if (isObject(schema.additionalProperties)) {
      const declared = new Set(Object.keys(schema.properties ?? {}));
      for (const [key, child] of Object.entries(value)) {
        if (!declared.has(key)) validateNode(schema.additionalProperties, child, context, childPath(path, key), errors);
      }
    }
  }
}

function scanSchemaNode(schema, path, unsupported) {
  if (typeof schema === "boolean") return;
  if (!isObject(schema)) {
    unsupported.push(`${path}: schema node must be an object or boolean`);
    return;
  }

  for (const key of Object.keys(schema)) {
    if (!SUPPORTED_KEYWORDS.has(key)) unsupported.push(`${path}: unsupported keyword ${key}`);
  }

  for (const [key, child] of Object.entries(schema.properties ?? {})) scanSchemaNode(child, `${path}.properties.${key}`, unsupported);
  for (const [key, child] of Object.entries(schema.$defs ?? {})) scanSchemaNode(child, `${path}.$defs.${key}`, unsupported);
  if (isObject(schema.items) || typeof schema.items === "boolean") scanSchemaNode(schema.items, `${path}.items`, unsupported);
  if (isObject(schema.additionalProperties)) scanSchemaNode(schema.additionalProperties, `${path}.additionalProperties`, unsupported);
  for (const keyword of ["anyOf", "oneOf", "allOf"]) {
    (schema[keyword] ?? []).forEach((child, index) => scanSchemaNode(child, `${path}.${keyword}[${index}]`, unsupported));
  }
  for (const keyword of ["if", "then", "else"]) {
    if (schema[keyword] !== undefined) scanSchemaNode(schema[keyword], `${path}.${keyword}`, unsupported);
  }
}

function contractContext(contractName) {
  const file = CONTRACT_FILES[contractName];
  if (!file) throw new Error(`Unknown public contract: ${contractName}`);
  return { file, rootSchema: SCHEMA_FILES[file] };
}

export class ContractValidationError extends Error {
  constructor(contractName, errors) {
    const detail = errors.map((error) => `${error.path}: ${error.message}`).join("\n- ");
    super(`Invalid ${contractName} contract:\n- ${detail}`);
    this.name = "ContractValidationError";
    this.contractName = contractName;
    this.errors = errors;
  }
}

export function validateContract(contractName, value) {
  const context = contractContext(contractName);
  const errors = [];
  validateNode(context.rootSchema, value, context, "$", errors);
  return { valid: errors.length === 0, errors };
}

export function assertContract(contractName, value) {
  const result = validateContract(contractName, value);
  if (!result.valid) throw new ContractValidationError(contractName, result.errors);
  return value;
}

export function collectUnsupportedPublicSchemaKeywords() {
  const unsupported = [];
  for (const [contractName, file] of Object.entries(CONTRACT_FILES)) {
    scanSchemaNode(SCHEMA_FILES[file], contractName, unsupported);
  }
  return unsupported;
}

export function validateSchemaValue(schema, value, name = "schema") {
  const errors = [];
  validateNode(schema, value, { file: name, rootSchema: schema }, "$", errors);
  return { valid: errors.length === 0, errors };
}

export function assertSchemaValue(name, schema, value) {
  const result = validateSchemaValue(schema, value, name);
  if (!result.valid) throw new ContractValidationError(name, result.errors);
  return value;
}

export function collectUnsupportedSchemaKeywords(schema, name = "schema") {
  const unsupported = [];
  scanSchemaNode(schema, name, unsupported);
  return unsupported;
}

export const publicContracts = Object.freeze(Object.keys(CONTRACT_FILES));
