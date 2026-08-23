import { Node, SyntaxKind } from "ts-morph";

/** Splits an OpenAPI path into its static (non-parameterized) segments, e.g. "/charges/{id}" -> ["charges"]. */
export function pathLiteralSegments(apiPath: string): string[] {
  return apiPath.split("/").filter((seg) => seg && !/^\{.*\}$/.test(seg));
}

export function containsPathSegmentsInOrder(text: string, segments: string[]): boolean {
  if (segments.length === 0) return false;
  let cursor = 0;
  for (const seg of segments) {
    const idx = text.indexOf(seg, cursor);
    if (idx === -1) return false;
    cursor = idx + seg.length;
  }
  return true;
}

export function objectLiteralPropertyNames(obj: Node): Set<string> {
  const names = new Set<string>();
  if (!Node.isObjectLiteralExpression(obj)) return names;
  for (const prop of obj.getProperties()) {
    if (Node.isPropertyAssignment(prop) || Node.isShorthandPropertyAssignment(prop)) {
      names.add(prop.getName());
    }
  }
  return names;
}

export function typeDeclPropertyNames(decl: Node): Set<string> {
  const names = new Set<string>();
  for (const sig of decl.getDescendantsOfKind(SyntaxKind.PropertySignature)) {
    names.add(sig.getName());
  }
  return names;
}

function intersectionSize(a: Set<string>, b: Set<string>): number {
  let hits = 0;
  for (const name of a) if (b.has(name)) hits++;
  return hits;
}

/** Fraction of `related` that is actually present on `candidate` — a coverage/recall score, not full Jaccard. */
export function coverage(candidate: Set<string>, related: Set<string>): number {
  if (related.size === 0) return 0;
  return intersectionSize(related, candidate) / related.size;
}

/**
 * True once `candidate`'s overlap with `related` is strong enough to treat it as the same
 * schema. Requires at least two shared field names (never lets a single common name like
 * "amount" or "id" — plausible across many unrelated schemas — trigger a false match) and
 * at least half of the known sibling fields to be present.
 */
export function structurallyMatches(candidate: Set<string>, related: Set<string>): boolean {
  if (related.size === 0) return false;
  const hits = intersectionSize(related, candidate);
  return hits >= 2 && hits / related.size >= 0.5;
}

export function tokenize(text: string): string[] {
  return text.split(/[<>[\](),|&.'"\s]+/).filter(Boolean);
}

function typeTokens(typeNode: Node | undefined): string[] {
  if (!typeNode) return [];
  return tokenize(typeNode.getText());
}

/** Functions/methods/arrow functions in this file whose body textually references the
 * given OpenAPI path's static segments — i.e. functions that plausibly make *this*
 * operation's network call, used to scope which types are "this operation's" shape when
 * multiple sibling resources (e.g. Charge vs. Refund) share generic field names. */
export function anchoredFunctionsForPath(sourceFile: Node, apiPath: string): Node[] {
  const segments = pathLiteralSegments(apiPath);
  if (segments.length === 0) return [];
  const candidates = [
    ...sourceFile.getDescendantsOfKind(SyntaxKind.FunctionDeclaration),
    ...sourceFile.getDescendantsOfKind(SyntaxKind.ArrowFunction),
    ...sourceFile.getDescendantsOfKind(SyntaxKind.MethodDeclaration),
  ];
  return candidates.filter((fn) => containsPathSegmentsInOrder(fn.getText(), segments));
}

/**
 * Resolves a property's declared type down to the actual union-of-literals node,
 * following a named type-alias reference when the property's type isn't inline
 * (e.g. `status: ChargeStatus` where `type ChargeStatus = "a" | "b"` is declared
 * separately) — the common, idiomatic pattern of factoring an enum out into its own alias.
 */
export function resolveFieldUnion(scopeNode: Node, fieldName: string, sourceFile: Node): Node | undefined {
  const sig = scopeNode
    .getDescendantsOfKind(SyntaxKind.PropertySignature)
    .find((s) => s.getName() === fieldName);
  const typeNode = sig?.getTypeNode();
  if (!typeNode) return undefined;
  if (Node.isUnionTypeNode(typeNode)) return typeNode;
  if (Node.isTypeReference(typeNode)) {
    const refName = typeNode.getTypeName().getText();
    const alias = (sourceFile as any).getTypeAlias?.(refName);
    const aliasType = alias?.getTypeNode?.();
    if (aliasType && Node.isUnionTypeNode(aliasType)) return aliasType;
  }
  return undefined;
}

export function functionReferencesTypeName(fn: Node, name: string): boolean {
  const returnType = (fn as any).getReturnTypeNode?.();
  if (typeTokens(returnType).includes(name)) return true;
  for (const p of (fn as any).getParameters?.() ?? []) {
    if (typeTokens(p.getTypeNode?.()).includes(name)) return true;
  }
  return false;
}

function declaredName(decl: Node): string | undefined {
  if (Node.isInterfaceDeclaration(decl) || Node.isTypeAliasDeclaration(decl)) {
    return decl.getName();
  }
  return undefined;
}

/**
 * Structural evidence for whether a type declaration represents a request or response
 * shape: is it used as a function/method PARAMETER type (request-like), or as a
 * RETURN type, possibly wrapped in Promise<T> (response-like)? Request and response
 * schemas for the same resource often share most field names by design (a response
 * echoes back what was submitted), so name-overlap alone can't disambiguate them —
 * this looks at how the type is actually used in code instead.
 */
export function usagePositionOf(decl: Node): "request" | "response" | "unknown" {
  const name = declaredName(decl);
  if (!name) return "unknown";
  const sourceFile = decl.getSourceFile();
  const mentions = (typeNode: Node | undefined) => typeTokens(typeNode).includes(name);

  // Return-type usage is checked first: it's a strong, low-noise signal (a function
  // returning Promise<Charge> clearly means Charge is what comes back). Parameter usage
  // is checked second and only as a fallback, since plain helper/predicate functions
  // routinely take an already-fetched response object as their own parameter (e.g.
  // `isChargePending(charge: Charge)`), which would otherwise look request-like.
  const returnTypeHolders = [
    ...sourceFile.getDescendantsOfKind(SyntaxKind.FunctionDeclaration),
    ...sourceFile.getDescendantsOfKind(SyntaxKind.MethodDeclaration),
    ...sourceFile.getDescendantsOfKind(SyntaxKind.ArrowFunction),
  ];
  for (const fn of returnTypeHolders) {
    if (mentions((fn as any).getReturnTypeNode?.())) return "response";
  }

  for (const p of sourceFile.getDescendantsOfKind(SyntaxKind.Parameter)) {
    if (mentions(p.getTypeNode())) return "request";
  }

  return "unknown";
}

export function jsonTypeToTs(jsonType: string | undefined): string {
  switch (jsonType) {
    case "string":
      return "string";
    case "integer":
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "array":
      return "unknown[]";
    case "object":
      return "Record<string, unknown>";
    default:
      return "unknown";
  }
}

export function defaultValueFor(fieldName: string, jsonType: string | undefined): string {
  const lower = fieldName.toLowerCase();
  if (jsonType === "string" && (lower.includes("id") || lower.includes("key") || lower.includes("token"))) {
    return "crypto.randomUUID()";
  }
  switch (jsonType) {
    case "string":
      return '""';
    case "integer":
    case "number":
      return "0";
    case "boolean":
      return "false";
    case "array":
      return "[]";
    case "object":
      return "{}";
    default:
      return "undefined";
  }
}
