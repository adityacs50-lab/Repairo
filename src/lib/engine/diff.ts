import type {
  ApiChange,
  ChangeKind,
  ChangeSeverity,
  OpenApiDocument,
  OperationObject,
  PathItem,
  RefObject,
  SchemaObject,
} from "./types";

function isRef(value: unknown): value is RefObject {
  return Boolean(value && typeof value === "object" && "$ref" in value);
}

function resolveSchema(
  doc: OpenApiDocument,
  schema: SchemaObject | RefObject | undefined,
): SchemaObject | undefined {
  if (!schema) return undefined;
  if (isRef(schema)) {
    const name = schema.$ref.split("/").pop();
    if (!name) return undefined;
    return doc.components?.schemas?.[name];
  }
  return schema;
}

function severityFor(kind: ChangeKind): ChangeSeverity {
  switch (kind) {
    case "endpoint-removed":
    case "field-removed":
    case "field-required":
    case "enum-value-removed":
    case "type-changed":
    case "server-url-changed":
      return "breaking";
    case "endpoint-added":
    case "field-added":
    case "enum-value-added":
      return "additive";
    default:
      return "non-breaking";
  }
}

function pushChange(
  changes: ApiChange[],
  partial: Omit<ApiChange, "id" | "severity"> & { severity?: ChangeSeverity },
) {
  const severity = partial.severity ?? severityFor(partial.kind);
  changes.push({
    ...partial,
    severity,
    id: `chg_${String(changes.length + 1).padStart(3, "0")}`,
  });
}

function methodsOf(item: PathItem): Array<[string, OperationObject]> {
  return Object.entries(item).filter(
    (entry): entry is [string, OperationObject] =>
      ["get", "post", "put", "patch", "delete"].includes(entry[0]) &&
      Boolean(entry[1]),
  );
}

function schemaKey(path: string, op: string, side: "request" | "response") {
  return `${path}.${op}.${side}`;
}

function compareSchemas(
  changes: ApiChange[],
  path: string,
  operation: string,
  side: "request" | "response",
  beforeDoc: OpenApiDocument,
  afterDoc: OpenApiDocument,
  beforeSchema: SchemaObject | RefObject | undefined,
  afterSchema: SchemaObject | RefObject | undefined,
) {
  const before = resolveSchema(beforeDoc, beforeSchema);
  const after = resolveSchema(afterDoc, afterSchema);
  if (!before && !after) return;

  const beforeProps = before?.properties ?? {};
  const afterProps = after?.properties ?? {};
  const beforeRequired = new Set(before?.required ?? []);
  const afterRequired = new Set(after?.required ?? []);

  for (const key of Object.keys(beforeProps)) {
    if (!(key in afterProps)) {
      pushChange(changes, {
        kind: "field-removed",
        path,
        operation,
        field: key,
        summary: `Removed ${side} field "${key}" on ${operation.toUpperCase()} ${path}`,
        before: key,
      });
    }
  }

  for (const key of Object.keys(afterProps)) {
    if (!(key in beforeProps)) {
      pushChange(changes, {
        kind: "field-added",
        path,
        operation,
        field: key,
        summary: `Added ${side} field "${key}" on ${operation.toUpperCase()} ${path}`,
        after: key,
      });
    }
  }

  for (const key of afterRequired) {
    if (!beforeRequired.has(key)) {
      pushChange(changes, {
        kind: "field-required",
        path,
        operation,
        field: key,
        summary: `Field "${key}" is now required on ${operation.toUpperCase()} ${path} ${side}`,
        before: "optional",
        after: "required",
      });
    }
  }

  for (const key of Object.keys(beforeProps)) {
    if (!(key in afterProps)) continue;
    const b = resolveSchema(beforeDoc, beforeProps[key]);
    const a = resolveSchema(afterDoc, afterProps[key]);
    if (!b || !a) continue;

    if (b.type && a.type && b.type !== a.type) {
      pushChange(changes, {
        kind: "type-changed",
        path,
        operation,
        field: key,
        summary: `Type changed for "${key}" on ${path}`,
        before: b.type,
        after: a.type,
      });
    }

    const beforeEnum = new Set((b.enum ?? []).map(String));
    const afterEnum = new Set((a.enum ?? []).map(String));

    for (const value of beforeEnum) {
      if (!afterEnum.has(value)) {
        pushChange(changes, {
          kind: "enum-value-removed",
          path,
          operation,
          field: key,
          summary: `Enum value "${value}" removed from "${key}"`,
          before: value,
        });
      }
    }

    for (const value of afterEnum) {
      if (!beforeEnum.has(value)) {
        pushChange(changes, {
          kind: "enum-value-added",
          path,
          operation,
          field: key,
          summary: `Enum value "${value}" added to "${key}"`,
          after: value,
        });
      }
    }
  }

  void schemaKey;
}

export function diffOpenApi(
  before: OpenApiDocument,
  after: OpenApiDocument,
): ApiChange[] {
  const changes: ApiChange[] = [];
  const beforePaths = before.paths ?? {};
  const afterPaths = after.paths ?? {};

  const beforeServer = before.servers?.[0]?.url;
  const afterServer = after.servers?.[0]?.url;
  if (beforeServer && afterServer && beforeServer !== afterServer) {
    pushChange(changes, {
      kind: "server-url-changed",
      path: "/",
      summary: `API base URL changed from ${beforeServer} to ${afterServer}`,
      before: beforeServer,
      after: afterServer,
    });
  }

  for (const path of Object.keys(beforePaths)) {
    if (!(path in afterPaths)) {
      for (const [method] of methodsOf(beforePaths[path])) {
        pushChange(changes, {
          kind: "endpoint-removed",
          path,
          operation: method,
          summary: `Removed ${method.toUpperCase()} ${path}`,
        });
      }
    }
  }

  for (const path of Object.keys(afterPaths)) {
    if (!(path in beforePaths)) {
      for (const [method] of methodsOf(afterPaths[path])) {
        pushChange(changes, {
          kind: "endpoint-added",
          path,
          operation: method,
          summary: `Added ${method.toUpperCase()} ${path}`,
        });
      }
    }
  }

  for (const path of Object.keys(beforePaths)) {
    if (!(path in afterPaths)) continue;
    const beforeItem = beforePaths[path];
    const afterItem = afterPaths[path];
    const beforeMethods = new Map(methodsOf(beforeItem));
    const afterMethods = new Map(methodsOf(afterItem));

    for (const [method, beforeOp] of beforeMethods) {
      const afterOp = afterMethods.get(method);
      if (!afterOp) {
        pushChange(changes, {
          kind: "endpoint-removed",
          path,
          operation: method,
          summary: `Removed ${method.toUpperCase()} ${path}`,
        });
        continue;
      }

      const beforeReq =
        beforeOp.requestBody?.content?.["application/json"]?.schema;
      const afterReq =
        afterOp.requestBody?.content?.["application/json"]?.schema;
      compareSchemas(
        changes,
        path,
        method,
        "request",
        before,
        after,
        beforeReq,
        afterReq,
      );

      const beforeRes =
        beforeOp.responses?.["200"]?.content?.["application/json"]?.schema ??
        beforeOp.responses?.["201"]?.content?.["application/json"]?.schema;
      const afterRes =
        afterOp.responses?.["200"]?.content?.["application/json"]?.schema ??
        afterOp.responses?.["201"]?.content?.["application/json"]?.schema;
      compareSchemas(
        changes,
        path,
        method,
        "response",
        before,
        after,
        beforeRes,
        afterRes,
      );
    }

    for (const [method] of afterMethods) {
      if (!beforeMethods.has(method)) {
        pushChange(changes, {
          kind: "endpoint-added",
          path,
          operation: method,
          summary: `Added ${method.toUpperCase()} ${path}`,
        });
      }
    }
  }

  return changes;
}
