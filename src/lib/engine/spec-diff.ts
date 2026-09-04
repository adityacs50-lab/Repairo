/**
 * Lightweight OpenAPI 3.0 breaking-change diff engine.
 *
 * Standalone by design: this is a separate engine from `diff.ts`, which produces
 * `ApiChange[]` for the AST repair pipeline. This module answers a different
 * question — "what in this spec change would break an existing client?" — and
 * emits a flat, reportable `BreakingChange[]` with source line numbers.
 *
 * Dependencies are deliberately minimal: js-yaml for parsing (YAML 1.2 is a
 * superset of JSON, so the same loader handles .yaml and .json) and
 * lodash.isequal for deep structural comparison. No OpenAPI framework.
 */

import yaml from "js-yaml";
import isEqual from "lodash.isequal";

/** The nine breaking-change rules this engine detects. */
export type BreakingRule =
  | "endpoint-removed"
  | "method-removed"
  | "required-param-added"
  | "request-field-made-required"
  | "param-removed"
  | "response-field-removed"
  | "field-type-changed"
  | "enum-value-removed"
  | "auth-requirement-changed";

export interface BreakingChange {
  rule: BreakingRule;
  severity: "breaking";
  /** The API path, or "*" for spec-global changes (e.g. root security). */
  path: string;
  /** Upper-case HTTP method, or "*" for path-wide or spec-global changes. */
  method: string;
  details: string;
  /** 1-based line in the spec that evidences the change; 0 when unknown. */
  line: number;
}

/** HTTP methods OpenAPI 3.0 defines on a Path Item Object. */
const HTTP_METHODS = [
  "get",
  "put",
  "post",
  "delete",
  "options",
  "head",
  "patch",
  "trace",
] as const;

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asObject(value: unknown): JsonObject | undefined {
  return isObject(value) ? value : undefined;
}

function asArray(value: unknown): unknown[] | undefined {
  return Array.isArray(value) ? value : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/* -------------------------------------------------------------------------- */
/* Parsing with line metadata                                                  */
/* -------------------------------------------------------------------------- */

/**
 * A parsed spec plus a lookup from any parsed node back to its source line.
 *
 * js-yaml's `load()` returns plain JS values with no position information. Its
 * `listener` option, however, fires `open`/`close` around every node as the
 * document is composed, and at `close` the composed value is available on
 * `state.result`. Because js-yaml hands back those very object instances in the
 * final tree, we can key a WeakMap by object identity — no path bookkeeping and
 * no second parse.
 *
 * The `open` event fires at the position where the node's parse began, which for
 * a block mapping value is the line of the key that introduces it. That is the
 * line worth reporting: for a removed `phone_number` field you want the line
 * declaring `phone_number:`, not the line of its nested `type:`.
 */
export interface ParsedSpec {
  doc: JsonObject;
  /**
   * 1-based source line for a node, or 0 if unknown. Scalars cannot be tracked
   * (they are not valid WeakMap keys), so pass ancestors as fallbacks — the
   * first that resolves wins.
   */
  lineOf: (...nodes: unknown[]) => number;
}

export function parseSpecWithLines(source: string): ParsedSpec {
  const lines = new WeakMap<object, number>();
  const openStack: number[] = [];

  const doc = yaml.load(source, {
    listener(event, state: { line: number; result: unknown }) {
      if (event === "open") {
        openStack.push(state.line);
        return;
      }
      const startLine = openStack.pop();
      if (startLine === undefined) return;
      const node = state.result;
      // Only objects/arrays can key a WeakMap. Keep the first (outermost)
      // mapping for a given instance: YAML anchors can reuse one object.
      if (node !== null && typeof node === "object" && !lines.has(node)) {
        lines.set(node, startLine + 1); // state.line is 0-based
      }
    },
  });

  const lineOf = (...nodes: unknown[]): number => {
    for (const node of nodes) {
      if (node !== null && typeof node === "object") {
        const line = lines.get(node as object);
        if (line !== undefined) return line;
      }
    }
    return 0;
  };

  return { doc: asObject(doc) ?? {}, lineOf };
}

/* -------------------------------------------------------------------------- */
/* $ref resolution                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Resolve internal `#/...` refs against the document root.
 *
 * Real specs put nearly every schema behind a `$ref`, so comparing unresolved
 * nodes would report nothing useful. External refs (any target not starting
 * with `#/`) are left unresolved rather than fetched — this engine is offline
 * and synchronous by design.
 */
function makeResolver(root: JsonObject) {
  return function resolve(node: unknown, depth = 0): JsonObject | undefined {
    let current = asObject(node);
    // Bounded to stop a `$ref` cycle from spinning forever.
    let hops = depth;
    while (current && typeof current.$ref === "string" && hops < 32) {
      const ref = current.$ref;
      if (!ref.startsWith("#/")) return current;
      let target: unknown = root;
      for (const rawSegment of ref.slice(2).split("/")) {
        // JSON Pointer escaping: ~1 => "/", ~0 => "~".
        const segment = rawSegment.replace(/~1/g, "/").replace(/~0/g, "~");
        target = asObject(target)?.[segment];
        if (target === undefined) return undefined;
      }
      current = asObject(target);
      hops += 1;
    }
    return current;
  };
}

type Resolver = ReturnType<typeof makeResolver>;

/* -------------------------------------------------------------------------- */
/* Parameters                                                                  */
/* -------------------------------------------------------------------------- */

interface ParamInfo {
  name: string;
  location: string;
  required: boolean;
  node: JsonObject;
}

/**
 * Collect an operation's effective parameters.
 *
 * OpenAPI lets a Path Item declare parameters shared by every operation, which
 * an operation may override by matching (name, in). Comparing only
 * operation-level parameters would miss inherited ones entirely, so merge with
 * operation-level winning.
 */
function collectParams(
  pathItem: JsonObject | undefined,
  operation: JsonObject | undefined,
  resolve: Resolver,
): Map<string, ParamInfo> {
  const merged = new Map<string, ParamInfo>();

  const ingest = (list: unknown) => {
    for (const entry of asArray(list) ?? []) {
      const resolved = resolve(entry);
      if (!resolved) continue;
      const name = asString(resolved.name);
      const location = asString(resolved.in);
      if (!name || !location) continue;
      merged.set(`${location}:${name}`, {
        name,
        location,
        required: resolved.required === true,
        // Prefer the original entry for line lookup: a `$ref`d parameter's
        // definition line is less useful than its use site.
        node: asObject(entry) ?? resolved,
      });
    }
  };

  ingest(pathItem?.parameters);
  ingest(operation?.parameters);
  return merged;
}

/* -------------------------------------------------------------------------- */
/* Schema comparison                                                           */
/* -------------------------------------------------------------------------- */

interface DiffContext {
  path: string;
  method: string;
  emit: (change: BreakingChange) => void;
  baseLine: ParsedSpec["lineOf"];
  headLine: ParsedSpec["lineOf"];
  resolveBase: Resolver;
  resolveHead: Resolver;
}

/**
 * Stable identity for a parsed node, so recursion can be tracked by the schema
 * actually being compared rather than by the field path that reached it.
 */
const nodeIds = new WeakMap<object, number>();
let nextNodeId = 1;
function idOf(node: object): number {
  let id = nodeIds.get(node);
  if (id === undefined) {
    id = nextNodeId++;
    nodeIds.set(node, id);
  }
  return id;
}

function describeType(schema: JsonObject | undefined): string {
  if (!schema) return "unknown";
  const type = asString(schema.type);
  if (type) return type;
  if (schema.properties) return "object";
  if (schema.items) return "array";
  if (schema.enum) return "enum";
  return "unknown";
}

/**
 * Paired walk of a baseline and head schema.
 *
 * `side` decides which rules apply: a removed property only breaks consumers
 * when it disappears from a *response* they read, whereas a newly required
 * property only breaks them when it appears on a *request* they send.
 */
function compareSchemas(
  beforeRaw: unknown,
  afterRaw: unknown,
  side: "request" | "response",
  fieldPath: string,
  ctx: DiffContext,
  seen: Set<string>,
): void {
  const before = ctx.resolveBase(beforeRaw);
  const after = ctx.resolveHead(afterRaw);
  if (!before || !after) return;

  // Cycle guard for self-referential schemas (a Node whose children are Nodes).
  // Keyed by the identity of the resolved pair being compared, NOT by field
  // path: every hop through a recursive $ref produces a *new* path
  // (children[], children[].children[], ...), so a path-keyed guard never fires
  // and the walk overflows the stack. The key is removed on the way out, so
  // this marks only the current branch — a schema reused on sibling branches is
  // still compared in each place it appears.
  const cycleKey = `${idOf(before)}:${idOf(after)}`;
  if (seen.has(cycleKey)) return;
  seen.add(cycleKey);

  const label = fieldPath || "(root)";

  // --- field-type-changed -------------------------------------------------
  const beforeType = describeType(before);
  const afterType = describeType(after);
  if (fieldPath && beforeType !== afterType && beforeType !== "unknown" && afterType !== "unknown") {
    ctx.emit({
      rule: "field-type-changed",
      severity: "breaking",
      path: ctx.path,
      method: ctx.method,
      details: `${side === "request" ? "Request" : "Response"} field '${label}' changed type from '${beforeType}' to '${afterType}'`,
      line: ctx.headLine(afterRaw, after),
    });
  }

  // --- enum-value-removed -------------------------------------------------
  const beforeEnum = asArray(before.enum);
  const afterEnum = asArray(after.enum);
  if (beforeEnum && afterEnum) {
    const dropped = beforeEnum.filter(
      (value) => !afterEnum.some((candidate) => isEqual(candidate, value)),
    );
    if (dropped.length > 0) {
      ctx.emit({
        rule: "enum-value-removed",
        severity: "breaking",
        path: ctx.path,
        method: ctx.method,
        details: `Enum value${dropped.length > 1 ? "s" : ""} ${dropped
          .map((value) => `'${String(value)}'`)
          .join(", ")} removed from ${side} field '${label}'`,
        line: ctx.baseLine(beforeEnum, beforeRaw, before),
      });
    }
  }

  // --- request-field-made-required ---------------------------------------
  if (side === "request") {
    const beforeRequired = new Set(
      (asArray(before.required) ?? []).filter((v): v is string => typeof v === "string"),
    );
    for (const name of asArray(after.required) ?? []) {
      if (typeof name !== "string" || beforeRequired.has(name)) continue;
      const qualified = fieldPath ? `${fieldPath}.${name}` : name;
      ctx.emit({
        rule: "request-field-made-required",
        severity: "breaking",
        path: ctx.path,
        method: ctx.method,
        details: `Request body field '${qualified}' is now required`,
        line: ctx.headLine(after.required, asObject(after.properties)?.[name], after),
      });
    }
  }

  // --- response-field-removed + recursion into properties -----------------
  const beforeProps = asObject(before.properties);
  const afterProps = asObject(after.properties);
  if (beforeProps) {
    for (const [name, beforeChild] of Object.entries(beforeProps)) {
      const qualified = fieldPath ? `${fieldPath}.${name}` : name;
      const afterChild = afterProps?.[name];
      if (afterChild === undefined) {
        if (side === "response") {
          ctx.emit({
            rule: "response-field-removed",
            severity: "breaking",
            path: ctx.path,
            method: ctx.method,
            details: `Response field '${qualified}' was removed`,
            line: ctx.baseLine(beforeChild, beforeProps),
          });
        }
        continue;
      }
      compareSchemas(beforeChild, afterChild, side, qualified, ctx, seen);
    }
  }

  // Array element schemas: `items` is where the real shape lives for lists.
  if (before.items && after.items) {
    compareSchemas(before.items, after.items, side, `${fieldPath}[]`, ctx, seen);
  }

  // Leaving this branch: unmark so the same schema can still be compared where
  // it legitimately appears elsewhere in the tree.
  seen.delete(cycleKey);
}

/** First JSON-ish media type schema on a Request Body / Response object. */
function schemaOfBody(body: unknown, resolve: Resolver): unknown {
  const resolved = resolve(body);
  const content = asObject(resolved?.content);
  if (!content) return undefined;
  const preferred = content["application/json"];
  if (preferred !== undefined) return asObject(preferred)?.schema;
  for (const media of Object.values(content)) {
    const schema = asObject(media)?.schema;
    if (schema !== undefined) return schema;
  }
  return undefined;
}

/* -------------------------------------------------------------------------- */
/* Main diff                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Compare two OpenAPI 3.0 documents and return every breaking change found.
 *
 * Line numbers point at the document that carries the evidence: removals cite
 * the baseline (where the thing still exists), additions and type changes cite
 * the head (where the new shape is).
 */
export function diffSpecs(baselineSource: string, headSource: string): BreakingChange[] {
  const base = parseSpecWithLines(baselineSource);
  const head = parseSpecWithLines(headSource);

  const resolveBase = makeResolver(base.doc);
  const resolveHead = makeResolver(head.doc);

  const changes: BreakingChange[] = [];
  const emit = (change: BreakingChange) => changes.push(change);

  const basePaths = asObject(base.doc.paths) ?? {};
  const headPaths = asObject(head.doc.paths) ?? {};

  /* --- auth-requirement-changed (spec-global) ---------------------------- */
  const baseSchemes = asObject(base.doc.components)?.securitySchemes;
  const headSchemes = asObject(head.doc.components)?.securitySchemes;
  if (!isEqual(baseSchemes, headSchemes)) {
    emit({
      rule: "auth-requirement-changed",
      severity: "breaking",
      path: "*",
      method: "*",
      details: "Security schemes under components.securitySchemes were modified",
      line: head.lineOf(headSchemes, head.doc.components) || base.lineOf(baseSchemes),
    });
  }
  if (!isEqual(base.doc.security, head.doc.security)) {
    emit({
      rule: "auth-requirement-changed",
      severity: "breaking",
      path: "*",
      method: "*",
      details: "Root-level security requirements were modified",
      line: head.lineOf(head.doc.security) || base.lineOf(base.doc.security),
    });
  }

  for (const [apiPath, basePathItemRaw] of Object.entries(basePaths)) {
    const basePathItem = asObject(basePathItemRaw);
    if (!basePathItem) continue;
    const headPathItem = asObject(headPaths[apiPath]);

    const baseMethods = HTTP_METHODS.filter((m) => isObject(basePathItem[m]));

    /* --- endpoint-removed: the whole path is gone ------------------------ */
    if (!headPathItem) {
      // One change per method that vanished with the path, so `method` stays
      // meaningful and each broken call site is reported individually.
      if (baseMethods.length === 0) {
        emit({
          rule: "endpoint-removed",
          severity: "breaking",
          path: apiPath,
          method: "*",
          details: `Endpoint '${apiPath}' was removed`,
          line: base.lineOf(basePathItemRaw, basePaths),
        });
      }
      for (const method of baseMethods) {
        emit({
          rule: "endpoint-removed",
          severity: "breaking",
          path: apiPath,
          method: method.toUpperCase(),
          details: `Endpoint '${method.toUpperCase()} ${apiPath}' was removed`,
          line: base.lineOf(basePathItem[method], basePathItemRaw, basePaths),
        });
      }
      continue;
    }

    for (const method of baseMethods) {
      const baseOp = asObject(basePathItem[method]);
      const headOp = asObject(headPathItem[method]);
      const methodLabel = method.toUpperCase();

      /* --- method-removed: path survives, method does not ---------------- */
      if (!headOp) {
        emit({
          rule: "method-removed",
          severity: "breaking",
          path: apiPath,
          method: methodLabel,
          details: `Method '${methodLabel}' was removed from '${apiPath}'`,
          line: base.lineOf(basePathItem[method], basePathItemRaw),
        });
        continue;
      }

      const ctx: DiffContext = {
        path: apiPath,
        method: methodLabel,
        emit,
        baseLine: base.lineOf,
        headLine: head.lineOf,
        resolveBase,
        resolveHead,
      };

      /* --- operation-level auth ----------------------------------------- */
      if (!isEqual(baseOp?.security, headOp.security)) {
        emit({
          rule: "auth-requirement-changed",
          severity: "breaking",
          path: apiPath,
          method: methodLabel,
          details: `Security requirements changed for '${methodLabel} ${apiPath}'`,
          line: head.lineOf(headOp.security, headOp) || base.lineOf(baseOp?.security),
        });
      }

      /* --- parameters ---------------------------------------------------- */
      const baseParams = collectParams(basePathItem, baseOp, resolveBase);
      const headParams = collectParams(headPathItem, headOp, resolveHead);

      for (const [key, param] of baseParams) {
        if (!headParams.has(key)) {
          emit({
            rule: "param-removed",
            severity: "breaking",
            path: apiPath,
            method: methodLabel,
            details: `${param.location} parameter '${param.name}' was removed`,
            line: base.lineOf(param.node),
          });
        }
      }

      for (const [key, param] of headParams) {
        const previous = baseParams.get(key);
        if (!previous && param.required) {
          emit({
            rule: "required-param-added",
            severity: "breaking",
            path: apiPath,
            method: methodLabel,
            details: `New required ${param.location} parameter '${param.name}' was added`,
            line: head.lineOf(param.node),
          });
        } else if (previous && !previous.required && param.required) {
          // An existing optional parameter becoming mandatory breaks callers
          // just as hard as a brand-new one.
          emit({
            rule: "required-param-added",
            severity: "breaking",
            path: apiPath,
            method: methodLabel,
            details: `${param.location} parameter '${param.name}' is now required`,
            line: head.lineOf(param.node),
          });
        }
        // Compare the parameter's own schema for type/enum narrowing.
        if (previous) {
          compareSchemas(
            previous.node.schema,
            param.node.schema,
            "request",
            `${param.location} parameter '${param.name}'`,
            ctx,
            new Set(),
          );
        }
      }

      /* --- request body -------------------------------------------------- */
      compareSchemas(
        schemaOfBody(baseOp?.requestBody, resolveBase),
        schemaOfBody(headOp.requestBody, resolveHead),
        "request",
        "",
        ctx,
        new Set(),
      );

      /* --- responses ----------------------------------------------------- */
      const baseResponses = asObject(resolveBase(baseOp?.responses)) ?? {};
      const headResponses = asObject(resolveHead(headOp.responses)) ?? {};
      for (const [status, baseResponse] of Object.entries(baseResponses)) {
        const headResponse = headResponses[status];
        if (headResponse === undefined) continue; // status removal is not one of the nine rules
        compareSchemas(
          schemaOfBody(baseResponse, resolveBase),
          schemaOfBody(headResponse, resolveHead),
          "response",
          "",
          ctx,
          new Set(),
        );
      }
    }
  }

  return changes;
}

/** Convenience wrapper for the two-file case. */
export function diffSpecFiles(
  baselinePath: string,
  headPath: string,
  readFile: (p: string) => string,
): BreakingChange[] {
  return diffSpecs(readFile(baselinePath), readFile(headPath));
}
