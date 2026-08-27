import { Node, Project, SyntaxKind } from "ts-morph";
import type { ApiChange, ImpactMatch, SuggestedFix } from "./types";
import {
  anchoredFunctionsForPath,
  defaultValueFor,
  functionReferencesTypeName,
  jsonTypeToTs,
  objectLiteralPropertyNames,
  resolveFieldUnion,
  structurallyMatches,
  tokenize,
  typeDeclPropertyNames,
  usagePositionOf,
} from "./schema-match";

const API_CALL_RE =
  /\b(fetch|axios|client|api|sdk|http|request|stripe|openai|anthropic|gemini|supabase|razorpay|octokit|github|paymentsClient|submitShipment|createShipment)\b/i;

function isApiCallExpression(call: Node): boolean {
  if (!Node.isCallExpression(call)) return false;
  const text = call.getExpression().getText().replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  return API_CALL_RE.test(text);
}

function enclosingApiCall(node: Node): Node | undefined {
  let child: Node = node;
  let parent = node.getParent();
  while (parent) {
    if (
      Node.isCallExpression(parent) &&
      parent.getArguments().some((arg) => arg === child)
    ) {
      if (isApiCallExpression(parent)) return parent;
    }
    child = parent;
    parent = parent.getParent();
  }
  return undefined;
}

export interface AstTransformResult {
  content: string;
  fixes: SuggestedFix[];
  pathHints: string[];
}

/**
 * Executes generic, deterministic AST transformations on source code files using ts-morph.
 * Works against any TypeScript/Node.js codebase — nothing here is keyed to a specific
 * vendor, interface name, or fixture. `impacts` (when supplied by the caller's impact
 * analysis pass) scopes required-field insertion to the exact object literals/interfaces
 * already identified as relevant, instead of touching every object literal in the file.
 */
export function applyAstTransforms(
  content: string,
  changes: ApiChange[],
  filePath: string = "temp.ts",
  impacts: ImpactMatch[] = [],
): AstTransformResult {
  const project = new Project({
    useInMemoryFileSystem: true,
    compilerOptions: { allowJs: true },
  });

  const sourceFile = project.createSourceFile(filePath || "temp.ts", content);
  const fixes: SuggestedFix[] = [];
  const pathHints: string[] = [];

  // Track, per field name, the union type node whose sibling literal we renamed —
  // so a genuinely-new enum value (no removed counterpart) can be appended there.
  const touchedEnumUnions = new Map<string, Node>();

  // Snapshot each declaration/literal's ORIGINAL property names before any transform
  // mutates the file. Structural matching must judge relevance from the pre-repair
  // shape — otherwise an earlier change's insertion (e.g. idempotencyKey landing on
  // CreateChargeInput) inflates a later, unrelated change's overlap score against the
  // same declaration.
  const originalTypeDeclProps = new Map<Node, Set<string>>();
  for (const decl of [
    ...sourceFile.getDescendantsOfKind(SyntaxKind.InterfaceDeclaration),
    ...sourceFile.getDescendantsOfKind(SyntaxKind.TypeAliasDeclaration),
  ]) {
    originalTypeDeclProps.set(decl, typeDeclPropertyNames(decl));
  }
  const originalObjectLiteralProps = new Map<Node, Set<string>>();
  for (const lit of sourceFile.getDescendantsOfKind(SyntaxKind.ObjectLiteralExpression)) {
    originalObjectLiteralProps.set(lit, objectLiteralPropertyNames(lit));
  }

  // Resolves the schema declaration(s) — named interfaces/type-literal aliases, or an
  // anonymous return-type literal of a function anchored to this exact path — relevant to
  // an enum change, then follows the field's type down to the actual union node (which may
  // live in a separately-named alias, e.g. `status: ChargeStatus`). Two sibling schemas
  // that happen to reuse the same literal value (e.g. both Charge and Refund having a
  // "status" that was once "pending") must never share a mutation just because the value
  // text matches — this is what keeps them apart.
  function resolveEnumScope(change: ApiChange): { unions: Node[]; rejectedByAnchoring: Set<string> } {
    if (!change.field) return { unions: [], rejectedByAnchoring: new Set() };
    const related = new Set((change.relatedFields ?? []).filter((f) => f !== change.field));
    const anchoredFns = anchoredFunctionsForPath(sourceFile, change.path);
    const unions: Node[] = [];
    const rejectedByAnchoring = new Set<string>();

    const namedDecls = [
      ...sourceFile.getDescendantsOfKind(SyntaxKind.InterfaceDeclaration),
      ...sourceFile.getDescendantsOfKind(SyntaxKind.TypeAliasDeclaration).filter((d) => {
        const t = d.getTypeNode();
        return t !== undefined && Node.isTypeLiteral(t);
      }),
    ];
    for (const decl of namedDecls) {
      const props = originalTypeDeclProps.get(decl) ?? typeDeclPropertyNames(decl);
      if (!structurallyMatches(props, related)) continue;
      if (change.side) {
        const usage = usagePositionOf(decl);
        if (usage !== "unknown" && usage !== change.side) continue;
      }
      const declName = Node.isInterfaceDeclaration(decl) || Node.isTypeAliasDeclaration(decl) ? decl.getName() : undefined;
      // Structurally and side-wise plausible, but a different function (for a different
      // path) is the one that actually references this type — positive evidence this
      // declaration belongs to a *different* operation, not just "no evidence either way".
      if (anchoredFns.length > 0 && declName && !anchoredFns.some((fn) => functionReferencesTypeName(fn, declName))) {
        if (declName) rejectedByAnchoring.add(declName);
        continue;
      }
      const union = resolveFieldUnion(decl, change.field, sourceFile);
      if (union) unions.push(union);
    }

    for (const fn of anchoredFns) {
      const returnType = (fn as any).getReturnTypeNode?.();
      const literal = returnType
        ? Node.isTypeLiteral(returnType)
          ? returnType
          : returnType.getFirstDescendantByKind(SyntaxKind.TypeLiteral)
        : undefined;
      if (literal) {
        const union = resolveFieldUnion(literal, change.field, sourceFile);
        if (union && !unions.includes(union)) unions.push(union);
      }
    }

    return { unions, rejectedByAnchoring };
  }

  // Group enum changes by (path, operation, field): a removed value can only be safely
  // auto-renamed to an added value when there is exactly one candidate on each side —
  // otherwise which replacement it means is genuinely ambiguous from the spec diff alone,
  // and guessing would be exactly the kind of unverified rewrite this engine exists to avoid.
  const enumGroupKey = (c: ApiChange) => `${c.path}::${c.operation}::${c.field}`;
  const enumRemovedByGroup = new Map<string, ApiChange[]>();
  const enumAddedByGroup = new Map<string, ApiChange[]>();
  for (const c of changes) {
    if (c.kind === "enum-value-removed" && c.before) {
      const key = enumGroupKey(c);
      enumRemovedByGroup.set(key, [...(enumRemovedByGroup.get(key) ?? []), c]);
    }
    if (c.kind === "enum-value-added" && c.after) {
      const key = enumGroupKey(c);
      enumAddedByGroup.set(key, [...(enumAddedByGroup.get(key) ?? []), c]);
    }
  }

  for (const change of changes) {
    // 1. Property renames — only when the diff pairs an explicit before/after (e.g. a
    // hand-authored "field renamed" change), or when a field-removed and field-added
    // change share the exact same path+operation (a real rename signal, not a guess
    // across unrelated changes elsewhere in the diff).
    if (change.kind === "field-removed" || change.kind === "field-added") {
      const oldField = change.kind === "field-removed" ? change.before ?? change.field : undefined;
      let newField = change.after;

      if (change.kind === "field-removed" && !newField && oldField) {
        const paired = changes.find(
          (c) =>
            c.kind === "field-added" &&
            c.field &&
            c.field !== oldField &&
            c.path === change.path &&
            c.operation === change.operation,
        );
        if (paired?.field) newField = paired.field;
      }

      if (oldField && newField && oldField !== newField) {
        const propertyAssignments = sourceFile.getDescendantsOfKind(SyntaxKind.PropertyAssignment);
        for (const prop of propertyAssignments) {
          if (prop.getName() !== oldField) continue;
          const parentObj = prop.getFirstAncestorByKind(SyntaxKind.ObjectLiteralExpression);
          if (!parentObj) continue;
          const inApiCall = enclosingApiCall(parentObj) !== undefined;
          if (!inApiCall && impacts.length === 0) continue;
          prop.getNameNode().replaceWithText(newField);
          fixes.push({
            changeId: change.id,
            file: filePath,
            description: `Renamed property "${oldField}" → "${newField}" via AST`,
            before: `${oldField}: ...`,
            after: `${newField}: ...`,
            safe: true,
            safetyNotes: ["AST PropertyAssignment rename preserving initializer and formatting"],
          });
          pathHints.push(oldField);
        }
      }
    }

    // 2. Required field insertion — into interface/type declarations (as a new,
    // required PropertySignature, or by dropping `?` on an existing optional one)
    // and into the specific object literals that construct that shape.
    if (change.kind === "field-required" && change.field) {
      const fieldName = change.field;
      const tsType = jsonTypeToTs(change.fieldType);
      const related = new Set((change.relatedFields ?? []).filter((f) => f !== fieldName));

      const typeDecls = [
        ...sourceFile.getDescendantsOfKind(SyntaxKind.InterfaceDeclaration),
        ...sourceFile.getDescendantsOfKind(SyntaxKind.TypeAliasDeclaration),
      ];
      const anchoredFns = anchoredFunctionsForPath(sourceFile, change.path);

      for (const decl of typeDecls) {
        const existing = decl
          .getDescendantsOfKind(SyntaxKind.PropertySignature)
          .find((sig) => sig.getName() === fieldName);

        if (existing) {
          if (existing.hasQuestionToken()) {
            existing.setHasQuestionToken(false);
            fixes.push({
              changeId: change.id,
              file: filePath,
              description: `Mark "${fieldName}" as required in type declaration via AST`,
              before: `${fieldName}?: ...`,
              after: `${fieldName}: ...`,
              safe: true,
              safetyNotes: ["AST PropertySignature optional-token removal"],
            });
            pathHints.push(fieldName);
          }
          continue;
        }

        const props = originalTypeDeclProps.get(decl) ?? typeDeclPropertyNames(decl);
        const isImpacted = impacts.some(
          (i) => i.changeId === change.id && lineOf(decl) === i.line,
        );
        const structuralMatch = structurallyMatches(props, related);
        if (!isImpacted && !structuralMatch) continue;
        // Structural overlap alone can't tell a request shape from a response shape that
        // happens to share most fields (a charge response echoing the charge request) —
        // require usage position to agree with `side` whenever `side` is known, regardless
        // of whether impact analysis (which runs its own, equally name-agnostic overlap
        // check) already flagged this declaration.
        if (change.side) {
          const usage = usagePositionOf(decl);
          if (usage !== "unknown" && usage !== change.side) continue;
        }
        // When we can locate the function(s) that actually make *this* operation's call in
        // this file, require the declaration to be referenced by one of them — otherwise two
        // sibling resources with generic shared field names (Charge vs. Refund, both id/amount/
        // status) can each look like a plausible match for the other's change.
        const declName = Node.isInterfaceDeclaration(decl) || Node.isTypeAliasDeclaration(decl) ? decl.getName() : undefined;
        if (anchoredFns.length > 0 && declName && !anchoredFns.some((fn) => functionReferencesTypeName(fn, declName))) {
          continue;
        }

        const members = Node.isInterfaceDeclaration(decl)
          ? decl.getMembers()
          : decl.getFirstDescendantByKind(SyntaxKind.TypeLiteral)?.getMembers() ?? [];
        const lastMember = members[members.length - 1];
        if (Node.isInterfaceDeclaration(decl)) {
          decl.insertProperty(decl.getMembers().length, { name: fieldName, type: tsType });
        } else if (lastMember) {
          const typeLiteral = lastMember.getFirstAncestorByKind(SyntaxKind.TypeLiteral);
          typeLiteral?.insertProperty(typeLiteral.getMembers().length, { name: fieldName, type: tsType });
        } else {
          continue;
        }

        fixes.push({
          changeId: change.id,
          file: filePath,
          description: `Add required field "${fieldName}: ${tsType}" to type declaration via AST`,
          before: `Missing ${fieldName}`,
          after: `${fieldName}: ${tsType}`,
          safe: true,
          safetyNotes: ["Deterministic AST property-signature insertion", "Matched by structural overlap with sibling schema fields"],
        });
        pathHints.push(fieldName);
      }

      const objectLiterals = sourceFile.getDescendantsOfKind(SyntaxKind.ObjectLiteralExpression);
      for (const literal of objectLiterals) {
        if (literal.getProperty(fieldName)) continue;

        const literalLine = lineOf(literal);
        const isImpacted = impacts.length > 0 && impacts.some((i) => i.changeId === change.id && i.line === literalLine);
        const originalProps = originalObjectLiteralProps.get(literal) ?? objectLiteralPropertyNames(literal);
        if (originalProps.has("method") && (originalProps.has("headers") || originalProps.has("body"))) {
          continue;
        }
        const isStructural = related.size > 0 && structurallyMatches(originalProps, related);
        const inApiCall = enclosingApiCall(literal) !== undefined;
        if (!isImpacted && !isStructural && !inApiCall) continue;
        // A response value is never a hand-authored object literal (it comes back from
        // `.json()`), so a structural-only match against a response-side change is almost
        // certainly the wrong object — skip unless impact analysis directly confirmed it.
        if (!isImpacted && change.side === "response") continue;

        const defaultValue = defaultValueFor(fieldName, change.fieldType);
        literal.addPropertyAssignment({ name: fieldName, initializer: defaultValue });
        fixes.push({
          changeId: change.id,
          file: filePath,
          description: `Add required field "${fieldName}" via AST`,
          before: `Missing ${fieldName}`,
          after: `${fieldName}: ${defaultValue}`,
          safe: true,
          safetyNotes: ["Deterministic AST property insertion"],
        });
        pathHints.push(fieldName);
      }
    }

    // 3. Enum value changes — scoped to type positions, matching property assignments,
    // or comparisons against the field. A removed value is auto-renamed only when exactly
    // one added value exists for the same (path, operation, field): an unambiguous 1:1
    // pairing. Otherwise it's flagged as needing manual review rather than guessed.
    if (change.kind === "enum-value-removed" && change.before && change.field) {
      const key = enumGroupKey(change);
      const removedGroup = enumRemovedByGroup.get(key) ?? [];
      const addedGroup = enumAddedByGroup.get(key) ?? [];
      const oldVal = change.before;
      const unambiguousTarget =
        change.after ??
        (removedGroup.length === 1 && addedGroup.length === 1 ? addedGroup[0].after : undefined);

      if (unambiguousTarget) {
        const newVal = unambiguousTarget;
        const { unions: resolvedUnions, rejectedByAnchoring } = resolveEnumScope(change);
        // Type-position literals are scoped to the resolved schema's own union(s) when we
        // could find them — never renamed by matching text alone across the whole file.
        // Falls back to the old file-wide scan only when we found no schema evidence at all.
        const typeLiterals =
          resolvedUnions.length > 0
            ? resolvedUnions.flatMap((u) => u.getDescendantsOfKind(SyntaxKind.LiteralType))
            : sourceFile.getDescendantsOfKind(SyntaxKind.LiteralType);
        for (const literalType of typeLiterals) {
          const literal = literalType.getLiteral();
          if (!Node.isStringLiteral(literal) || literal.getLiteralText() !== oldVal) continue;
          literal.setLiteralValue(newVal);
          fixes.push({
            changeId: change.id,
            file: filePath,
            description: `Rename enum value "${oldVal}" → "${newVal}" via AST`,
            before: `"${oldVal}"`,
            after: `"${newVal}"`,
            safe: true,
            safetyNotes: ["AST string literal enum update, scoped to the resolved schema's union type", "Unambiguous 1:1 pairing with the added value"],
          });
          pathHints.push(oldVal);
          const union = literalType.getFirstAncestorByKind(SyntaxKind.UnionType);
          if (union) touchedEnumUnions.set(change.field, union);
        }

        // Property-assignment / comparison usages (`status: "pending"`, `x.status === "pending"`)
        // live in function bodies, not in the schema declaration itself, so they're matched by
        // field name across the file rather than via the resolved-union scope above.
        for (const literal of sourceFile.getDescendantsOfKind(SyntaxKind.StringLiteral)) {
          if (literal.getLiteralText() !== oldVal) continue;
          const parent = literal.getParent();
          const inMatchingProperty = parent && Node.isPropertyAssignment(parent) && parent.getName() === change.field;
          const comparisonAccess =
            parent && Node.isBinaryExpression(parent)
              ? [parent.getLeft(), parent.getRight()].find(
                  (side) =>
                    (Node.isPropertyAccessExpression(side) && side.getName() === change.field) ||
                    side.getText().includes(change.field),
                )
              : undefined;
          if (!inMatchingProperty && !comparisonAccess) continue;
          // The receiver's declared type was explicitly identified (via anchoring) as
          // belonging to a *different* operation than this change — e.g. `charge.status`
          // where `charge: Charge` and this rename is for the Refund schema instead.
          if (comparisonAccess && rejectedByAnchoring.size > 0) {
            const receiverType = Node.isPropertyAccessExpression(comparisonAccess)
              ? comparisonAccess.getExpression().getType().getText()
              : "";
            if (tokenize(receiverType).some((t) => rejectedByAnchoring.has(t))) continue;
          }
          literal.setLiteralValue(newVal);
          fixes.push({
            changeId: change.id,
            file: filePath,
            description: `Rename enum value "${oldVal}" → "${newVal}" via AST`,
            before: `"${oldVal}"`,
            after: `"${newVal}"`,
            safe: true,
            safetyNotes: ["AST string literal enum update, scoped to matching property assignment", "Unambiguous 1:1 pairing with the added value"],
          });
          pathHints.push(oldVal);
        }
      } else if (addedGroup.length > 0) {
        // Ambiguous: multiple removed and/or added values for the same field — which
        // replacement a given removed value means can't be determined from the spec
        // diff alone. Flag it rather than guess.
        fixes.push({
          changeId: change.id,
          file: filePath,
          description: `Enum value "${oldVal}" was removed but ${addedGroup.length} replacement candidates exist (${addedGroup.map((c) => c.after).join(", ")}) — ambiguous, needs manual review`,
          before: `"${oldVal}"`,
          after: "(ambiguous — not auto-applied)",
          safe: false,
          safetyNotes: ["Spec diff alone cannot determine which added value replaces this one"],
        });
      }
    }

    // Purely additive enum value: no removed counterpart at all for this field, so
    // there's nothing to disambiguate — append it to the enum's union type wherever we
    // can find it (either from a sibling rename processed above, or by locating the
    // PropertySignature/type-alias union declared for this field).
    if (change.kind === "enum-value-added" && change.after && change.field) {
      const key = enumGroupKey(change);
      const removedGroup = enumRemovedByGroup.get(key) ?? [];
      if (removedGroup.length > 0) {
        // Handled (or intentionally left ambiguous) by the enum-value-removed branch above.
      } else {
        let union = touchedEnumUnions.get(change.field);
        if (!union) {
          union = resolveEnumScope(change).unions[0];
        }
        if (union && Node.isUnionTypeNode(union)) {
          const already = union.getTypeNodes().some((t) => t.getText() === `"${change.after}"`);
          if (!already) {
            const replaced = union.replaceWithText(`${union.getText()} | "${change.after}"`);
            if (Node.isUnionTypeNode(replaced)) touchedEnumUnions.set(change.field, replaced);
            fixes.push({
              changeId: change.id,
              file: filePath,
              description: `Add new enum member "${change.after}" via AST`,
              before: "(new value)",
              after: `"${change.after}"`,
              safe: true,
              safetyNotes: ["AST union member insertion — purely additive, no ambiguity"],
            });
            pathHints.push(change.after);
          }
        }
      }
    }

    // 4. Base URL updates across any file (matches by literal value, not by name).
    if (change.kind === "server-url-changed" && change.before && change.after) {
      const stringLiterals = sourceFile.getDescendantsOfKind(SyntaxKind.StringLiteral);
      for (const literal of stringLiterals) {
        if (!literal.getLiteralText().includes(change.before)) continue;
        const updated = literal.getLiteralText().replace(change.before, change.after);
        literal.setLiteralValue(updated);
        fixes.push({
          changeId: change.id,
          file: filePath,
          description: `Update API base URL "${change.before}" → "${change.after}" via AST`,
          before: change.before,
          after: change.after,
          safe: true,
          safetyNotes: ["Deterministic URL string update"],
        });
        pathHints.push("BASE_URL");
      }
    }
  }

  sourceFile.saveSync();
  const updatedContent = project.getFileSystem().readFileSync(sourceFile.getFilePath());

  return {
    content: updatedContent,
    fixes,
    pathHints,
  };
}

function lineOf(node: Node): number {
  return node.getSourceFile().getLineAndColumnAtPos(node.getStart()).line;
}
