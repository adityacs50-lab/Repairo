import type {
  OpenApiDocument,
  OperationObject,
  ParameterObject,
  PathItem,
  RefObject,
  SchemaObject,
} from "./types";

interface DiscoveryProperty {
  type?: string;
  $ref?: string;
  enum?: Array<string | number | boolean>;
  required?: boolean;
  description?: string;
  items?: DiscoveryProperty;
}

interface DiscoverySchema {
  id?: string;
  type?: string;
  properties?: Record<string, DiscoveryProperty>;
  enum?: Array<string | number | boolean>;
  description?: string;
}

interface DiscoveryMethod {
  id?: string;
  path?: string;
  flatPath?: string;
  httpMethod?: string;
  description?: string;
  parameters?: Record<string, DiscoveryProperty & { location?: string }>;
  request?: { $ref?: string };
  response?: { $ref?: string };
}

interface DiscoveryResource {
  methods?: Record<string, DiscoveryMethod>;
  resources?: Record<string, DiscoveryResource>;
}

export interface DiscoveryDocument {
  kind?: string;
  discoveryVersion?: string;
  name?: string;
  title?: string;
  version?: string;
  description?: string;
  baseUrl?: string;
  rootUrl?: string;
  servicePath?: string;
  schemas?: Record<string, DiscoverySchema>;
  resources?: Record<string, DiscoveryResource>;
  methods?: Record<string, DiscoveryMethod>;
}

export function isDiscoveryDocument(doc: unknown): doc is DiscoveryDocument {
  if (!doc || typeof doc !== "object") return false;
  const d = doc as Record<string, unknown>;
  if ("openapi" in d || "swagger" in d) return false;
  return d.kind === "discovery#restDescription" || "discoveryVersion" in d;
}

function toRef(name: string): RefObject {
  return { $ref: `#/components/schemas/${name}` };
}

function convertProperty(prop: DiscoveryProperty): SchemaObject | RefObject {
  if (prop.$ref) return toRef(prop.$ref);
  const out: SchemaObject = {};
  if (prop.type) out.type = prop.type;
  if (prop.enum) out.enum = prop.enum;
  if (prop.items) out.items = convertProperty(prop.items);
  return out;
}

function isRequiredProperty(prop: DiscoveryProperty): boolean {
  return prop.required === true || /^Required[.!]/.test(prop.description ?? "");
}

function convertSchema(schema: DiscoverySchema): SchemaObject {
  const out: SchemaObject = {};
  if (schema.type) out.type = schema.type;
  if (schema.enum) out.enum = schema.enum;

  if (schema.properties) {
    out.properties = {};
    const required: string[] = [];
    for (const [name, prop] of Object.entries(schema.properties)) {
      out.properties[name] = convertProperty(prop);
      if (isRequiredProperty(prop)) required.push(name);
    }
    if (required.length > 0) out.required = required;
  }
  return out;
}

function convertMethod(method: DiscoveryMethod): OperationObject {
  const operation: OperationObject = {};
  if (method.id) operation.operationId = method.id;
  if (method.description) operation.summary = method.description.split("\n")[0];

  if (method.parameters) {
    const params: ParameterObject[] = [];
    for (const [name, p] of Object.entries(method.parameters)) {
      params.push({
        name,
        in: p.location === "path" ? "path" : "query",
        required: p.required === true,
        schema: convertProperty(p),
      });
    }
    operation.parameters = params;
  }

  if (method.request?.$ref) {
    operation.requestBody = {
      required: true,
      content: { "application/json": { schema: toRef(method.request.$ref) } },
    };
  }

  operation.responses = {
    "200": method.response?.$ref
      ? { content: { "application/json": { schema: toRef(method.response.$ref) } } }
      : { description: "OK" },
  };

  return operation;
}

function collectMethods(
  resources: Record<string, DiscoveryResource> | undefined,
  methods: Record<string, DiscoveryMethod> | undefined,
  paths: Record<string, PathItem>,
) {
  for (const method of Object.values(methods ?? {})) {
    const rawPath = method.flatPath || method.path;
    const httpMethod = method.httpMethod?.toLowerCase();
    if (!rawPath || !httpMethod) continue;

    const pathKey = "/" + rawPath.replace(/^\//, "");
    if (!paths[pathKey]) paths[pathKey] = {};
    paths[pathKey][httpMethod] = convertMethod(method);
  }

  for (const resource of Object.values(resources ?? {})) {
    collectMethods(resource.resources, resource.methods, paths);
  }
}

/**
 * Converts a Google API Discovery document (discovery#restDescription) into
 * the OpenAPI subset the diff engine understands: paths, operations,
 * parameters, request/response schemas, enums, and required fields.
 */
export function convertDiscoveryToOpenApi(doc: DiscoveryDocument): OpenApiDocument {
  const paths: Record<string, PathItem> = {};
  collectMethods(doc.resources, doc.methods, paths);

  const schemas: Record<string, SchemaObject> = {};
  for (const [name, schema] of Object.entries(doc.schemas ?? {})) {
    schemas[name] = convertSchema(schema);
  }

  const serverUrl =
    doc.baseUrl || `${doc.rootUrl ?? ""}${doc.servicePath ?? ""}` || undefined;

  return {
    openapi: "3.0.0",
    info: {
      title: doc.title || doc.name,
      version: doc.version,
      description: doc.description,
    },
    servers: serverUrl ? [{ url: serverUrl.replace(/\/$/, "") }] : undefined,
    paths,
    components: { schemas },
  };
}
