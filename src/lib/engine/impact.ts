import {
  Node,
  Project,
  SyntaxKind,
  type CallExpression,
  type ObjectLiteralExpression,
  type SourceFile,
} from "ts-morph";
import type { ApiChange, ConsumerFile, ImpactMatch } from "./types";

function uniqueImpacts(impacts: ImpactMatch[]): ImpactMatch[] {
  const seen = new Set<string>();
  return impacts.filter((impact) => {
    const key = `${impact.file}:${impact.line}:${impact.column}:${impact.symbol}:${impact.changeId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function impactAt(sourceFile: SourceFile, file: string, node: Node, change: ApiChange, symbol: string, reason: string, confidence: ImpactMatch["confidence"]): ImpactMatch {
  const location = sourceFile.getLineAndColumnAtPos(node.getStart());
  const call = node.getFirstAncestorByKind(SyntaxKind.CallExpression);
  const context = call ?? node;
  return {
    file, line: location.line, column: location.column,
    snippet: context.getText().split(/\r?\n/).find((line) => line.trim())?.trim().slice(0, 160) ?? "",
    symbol, changeId: change.id, confidence, reason,
  };
}

/** Returns an object literal only when it is an argument to an actual call. */
function callForArgumentsObject(object: ObjectLiteralExpression): CallExpression | undefined {
  const parent = object.getParent();
  return Node.isCallExpression(parent) && parent.getArguments().includes(object) ? parent : undefined;
}

function operationTokens(change: ApiChange): string[] {
  const segments = change.path.split("/").filter(Boolean).filter((segment) => !/^v?\d+(?:\.\d+)?$/i.test(segment));
  const lastSegment = segments.at(-1)?.replace(/[{}]/g, "") ?? "";
  if (!lastSegment) return [];
  const singular = lastSegment.endsWith("s") ? lastSegment.slice(0, -1) : lastSegment;
  const camel = (value: string) => value.replace(/[-_ ]+(.)/g, (_, char: string) => char.toUpperCase());
  return [lastSegment, singular, camel(lastSegment), camel(singular)].filter(Boolean);
}

function resolvedOperationNames(
  expression: Node,
  seen = new Set<string>(),
): string[] {
  const names = new Set<string>([expression.getText()]);
  const symbol =
    expression.getSymbol()?.getAliasedSymbol() ?? expression.getSymbol();

  if (!symbol) return [...names];

  names.add(symbol.getName());

  for (const declaration of symbol.getDeclarations()) {
    const key = `${declaration.getSourceFile().getFilePath()}:${declaration.getStart()}`;
    if (seen.has(key)) continue;
    seen.add(key);

    if (Node.isVariableDeclaration(declaration)) {
      const initializer = declaration.getInitializer();
      if (initializer) {
        for (const name of resolvedOperationNames(initializer, seen)) {
          names.add(name);
        }
      }
    }
  }

  return [...names];
}

function callMatchesOperation(
  call: CallExpression,
  change: ApiChange,
): boolean {
  const tokens = operationTokens(change);
  if (tokens.length === 0) return false;

  const names = resolvedOperationNames(call.getExpression());
  return tokens.some((token) => {
    const lowerToken = token.toLowerCase();
    return names.some((name) => name.toLowerCase().includes(lowerToken));
  });
}

function requestObjects(sourceFile: SourceFile, change: ApiChange): Array<{ object: ObjectLiteralExpression; call: CallExpression }> {
  return sourceFile.getDescendantsOfKind(SyntaxKind.ObjectLiteralExpression).flatMap((object) => {
    const call = callForArgumentsObject(object);
    return call && callMatchesOperation(call, change) ? [{ object, call }] : [];
  });
}

/**
 * Resolves OpenAPI changes against executable TypeScript/JavaScript syntax.
 * Field changes are limited to object literals passed to matching calls, so
 * comments and type declarations cannot become false-positive API usages.
 */
export function findImpactedCode(changes: ApiChange[], files: ConsumerFile[]): ImpactMatch[] {
  const project = new Project({ useInMemoryFileSystem: true, compilerOptions: { allowJs: true, checkJs: false } });
  const sourceFiles = files.map((file, index) => ({
    file,
    sourceFile: project.createSourceFile(`/consumer/${index}/${file.path.replace(/^\/+/, "")}`, file.content),
  }));
  const impacts: ImpactMatch[] = [];

  for (const { file, sourceFile } of sourceFiles) {
    for (const change of changes) {
      if (change.kind === "field-removed" && change.field) {
        for (const { object } of requestObjects(sourceFile, change)) {
          for (const property of object.getProperties()) {
            const propertyName = Node.isPropertyAssignment(property) || Node.isShorthandPropertyAssignment(property) ? property.getName() : undefined;
            if (propertyName === change.field) {
              impacts.push(impactAt(sourceFile, file.path, property, change, change.field, `Request passes removed field "${change.field}"`, "high"));
            }
          }
        }
      }

      if (change.kind === "field-required" && change.field) {
        for (const { object, call } of requestObjects(sourceFile, change)) {
          if (!object.getProperty(change.field)) {
            impacts.push(impactAt(sourceFile, file.path, call, change, change.field, `Call site must supply newly required field "${change.field}"`, "high"));
          }
        }
      }

      if (change.kind === "enum-value-removed" && change.before) {
        for (const literal of sourceFile.getDescendantsOfKind(SyntaxKind.StringLiteral)) {
          if (literal.getLiteralText() === change.before) {
            impacts.push(impactAt(sourceFile, file.path, literal, change, change.before, `Code references removed enum value "${change.before}"`, "medium"));
          }
        }
      }

      if (change.kind === "server-url-changed" && change.before) {
        for (const literal of sourceFile.getDescendantsOfKind(SyntaxKind.StringLiteral)) {
          if (literal.getLiteralText().includes(change.before)) {
            impacts.push(impactAt(sourceFile, file.path, literal, change, change.before, "Consumer still points at the previous API base URL", "high"));
          }
        }
      }
    }
  }
  return uniqueImpacts(impacts);
}
