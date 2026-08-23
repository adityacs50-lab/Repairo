import { Node, Project, SyntaxKind } from "ts-morph";
import type { ApiChange, ConsumerFile, ImpactMatch } from "./types";
import {
  anchoredFunctionsForPath,
  containsPathSegmentsInOrder,
  functionReferencesTypeName,
  objectLiteralPropertyNames,
  pathLiteralSegments,
  structurallyMatches,
  typeDeclPropertyNames,
  usagePositionOf,
} from "./schema-match";

const TS_LIKE = /\.(ts|tsx|js|jsx|mts|cts)$/i;

function binaryReferencesField(node: Node, field: string): boolean {
  if (!Node.isBinaryExpression(node)) return false;
  for (const side of [node.getLeft(), node.getRight()]) {
    if (Node.isPropertyAccessExpression(side) && side.getName() === field) return true;
  }
  return false;
}

function lineSnippetAndPos(node: Node) {
  const sf = node.getSourceFile();
  const pos = sf.getLineAndColumnAtPos(node.getStart());
  const lines = sf.getFullText().split(/\r?\n/);
  return { line: pos.line, column: pos.column, snippet: (lines[pos.line - 1] ?? "").trim() };
}

function match(
  node: Node,
  filePath: string,
  change: ApiChange,
  symbol: string,
  confidence: ImpactMatch["confidence"],
  reason: string,
): ImpactMatch {
  const { line, column, snippet } = lineSnippetAndPos(node);
  return { file: filePath, line, column, snippet, symbol, changeId: change.id, confidence, reason };
}

function uniqueImpacts(impacts: ImpactMatch[]): ImpactMatch[] {
  const seen = new Set<string>();
  return impacts.filter((impact) => {
    const key = `${impact.file}:${impact.line}:${impact.column}:${impact.changeId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Minimal literal-text scan for non-JS/TS consumer files (no AST available). */
function findImpactedCodeTextFallback(changes: ApiChange[], file: ConsumerFile): ImpactMatch[] {
  const impacts: ImpactMatch[] = [];
  const lines = file.content.split(/\r?\n/);
  for (const change of changes) {
    const needle = change.kind === "server-url-changed" ? change.before : change.field;
    if (!needle) continue;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(needle)) {
        impacts.push({
          file: file.path,
          line: i + 1,
          column: lines[i].indexOf(needle) + 1,
          snippet: lines[i].trim(),
          symbol: needle,
          changeId: change.id,
          confidence: "low",
          reason: `Textual reference to "${needle}" (non-TS/JS file, no AST analysis available)`,
        });
      }
    }
  }
  return impacts;
}

export function findImpactedCode(changes: ApiChange[], files: ConsumerFile[]): ImpactMatch[] {
  const impacts: ImpactMatch[] = [];

  for (const file of files) {
    if (!TS_LIKE.test(file.path)) {
      impacts.push(...findImpactedCodeTextFallback(changes, file));
      continue;
    }

    const project = new Project({
      useInMemoryFileSystem: true,
      compilerOptions: { allowJs: true, jsx: 2 as any },
    });

    let sourceFile;
    try {
      sourceFile = project.createSourceFile(file.path || "temp.ts", file.content);
    } catch {
      continue;
    }

    const propertySignatures = sourceFile.getDescendantsOfKind(SyntaxKind.PropertySignature);
    const propertyAssignments = sourceFile
      .getDescendantsOfKind(SyntaxKind.PropertyAssignment)
      .concat(sourceFile.getDescendantsOfKind(SyntaxKind.ShorthandPropertyAssignment) as any);
    const stringLiterals = sourceFile.getDescendantsOfKind(SyntaxKind.StringLiteral);
    const objectLiterals = sourceFile.getDescendantsOfKind(SyntaxKind.ObjectLiteralExpression);
    const typeDecls = [
      ...sourceFile.getDescendantsOfKind(SyntaxKind.InterfaceDeclaration),
      ...sourceFile.getDescendantsOfKind(SyntaxKind.TypeAliasDeclaration),
    ];

    for (const change of changes) {
      switch (change.kind) {
        case "server-url-changed": {
          if (!change.before) break;
          for (const lit of stringLiterals) {
            if (lit.getLiteralText().includes(change.before)) {
              impacts.push(
                match(lit, file.path, change, change.before, "high", "Consumer still points at the previous API base URL"),
              );
            }
          }
          for (const tmpl of sourceFile.getDescendantsOfKind(SyntaxKind.TemplateExpression)) {
            if (tmpl.getText().includes(change.before)) {
              impacts.push(
                match(tmpl, file.path, change, change.before, "high", "Consumer still points at the previous API base URL"),
              );
            }
          }
          break;
        }

        case "field-removed":
        case "field-added": {
          if (!change.field) break;
          const confidence = change.kind === "field-removed" ? "high" : "low";
          const reason =
            change.kind === "field-removed"
              ? `References removed field "${change.field}"`
              : `Optional new field "${change.field}" available for adoption`;
          for (const sig of propertySignatures) {
            if (sig.getName() === change.field) impacts.push(match(sig, file.path, change, change.field, confidence, reason));
          }
          for (const prop of propertyAssignments) {
            if (prop.getName() === change.field) impacts.push(match(prop, file.path, change, change.field, confidence, reason));
          }
          break;
        }

        case "field-required": {
          if (!change.field) break;
          const reason = `Call sites must supply newly required field "${change.field}"`;
          let directHit = false;
          for (const sig of propertySignatures) {
            if (sig.getName() === change.field) {
              impacts.push(match(sig, file.path, change, change.field, "high", reason));
              directHit = true;
            }
          }
          for (const prop of propertyAssignments) {
            if (prop.getName() === change.field) {
              impacts.push(match(prop, file.path, change, change.field, "high", reason));
              directHit = true;
            }
          }

          // Field doesn't exist anywhere yet — structurally identify the interface/object
          // literal that represents this schema via overlap with its sibling field names.
          if (!directHit && change.relatedFields && change.relatedFields.length > 0) {
            const related = new Set(change.relatedFields.filter((f) => f !== change.field));

            const anchoredFns = anchoredFunctionsForPath(sourceFile, change.path);
            for (const decl of typeDecls) {
              const props = typeDeclPropertyNames(decl);
              if (props.has(change.field)) continue;
              if (!structurallyMatches(props, related)) continue;
              // Request/response shapes often share most field names by design — require
              // usage position (parameter vs. return type) to agree with the change's side.
              if (change.side) {
                const usage = usagePositionOf(decl);
                if (usage !== "unknown" && usage !== change.side) continue;
              }
              // Sibling resources (Charge vs. Refund) can share generic field names too —
              // when we can find the function(s) that call this specific path, require it.
              const declName =
                Node.isInterfaceDeclaration(decl) || Node.isTypeAliasDeclaration(decl) ? decl.getName() : undefined;
              if (anchoredFns.length > 0 && declName && !anchoredFns.some((fn) => functionReferencesTypeName(fn, declName))) {
                continue;
              }
              impacts.push(
                match(
                  decl,
                  file.path,
                  change,
                  change.field,
                  "medium",
                  `Type definition is missing required field "${change.field}"`,
                ),
              );
            }

            for (const lit of objectLiterals) {
              // A response value is never a hand-authored object literal.
              if (change.side === "response") continue;
              const props = objectLiteralPropertyNames(lit);
              if (props.has(change.field)) continue;
              if (structurallyMatches(props, related)) {
                impacts.push(match(lit, file.path, change, change.field, "medium", reason));
              }
            }
          }

          if (!directHit && (!change.relatedFields || change.relatedFields.length === 0)) {
            // No structural signal at all — fall back to path/method anchoring on the raw call.
            const segments = pathLiteralSegments(change.path);
            if (segments.length > 0) {
              for (const call of sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)) {
                if (containsPathSegmentsInOrder(call.getText(), segments)) {
                  impacts.push(match(call, file.path, change, change.field, "low", reason));
                }
              }
            }
          }
          break;
        }

        case "enum-value-removed":
        case "enum-value-added": {
          const value = change.kind === "enum-value-removed" ? change.before : change.after;
          if (!value) break;
          const confidence = change.kind === "enum-value-removed" ? "high" : "low";
          const reason =
            change.kind === "enum-value-removed"
              ? `Code references removed enum value "${value}"`
              : `New enum value "${value}" may need handling`;

          for (const lit of stringLiterals) {
            if (lit.getLiteralText() !== value) continue;
            const parent = lit.getParent();
            const relevant =
              (parent && Node.isLiteralTypeNode(parent)) ||
              (parent && Node.isPropertyAssignment(parent) && change.field && parent.getName() === change.field) ||
              (parent && binaryReferencesField(parent, change.field ?? "")) ||
              !change.field;
            if (relevant) {
              impacts.push(match(lit, file.path, change, value, confidence, reason));
            }
          }
          break;
        }

        case "type-changed": {
          if (!change.field) break;
          for (const sig of propertySignatures) {
            if (sig.getName() === change.field) {
              impacts.push(
                match(sig, file.path, change, change.field, "medium", `Type changed for field "${change.field}"`),
              );
            }
          }
          for (const prop of propertyAssignments) {
            if (prop.getName() === change.field) {
              impacts.push(
                match(prop, file.path, change, change.field, "medium", `Type changed for field "${change.field}"`),
              );
            }
          }
          break;
        }

        default:
          break;
      }
    }
  }

  return uniqueImpacts(impacts);
}
