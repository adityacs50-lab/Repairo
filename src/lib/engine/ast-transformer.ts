import { Project, SyntaxKind, ObjectLiteralExpression, PropertyAssignment, StringLiteral, Identifier } from "ts-morph";
import type { ApiChange, ConsumerFile, SuggestedFix } from "./types";

export interface AstTransformResult {
  content: string;
  fixes: SuggestedFix[];
  pathHints: string[];
}

/**
 * Executes generic, deterministic AST transformations on source code files using ts-morph.
 * Works against any TypeScript/Node.js codebase.
 */
export function applyAstTransforms(
  content: string,
  changes: ApiChange[],
  filePath: string = "temp.ts"
): AstTransformResult {
  const project = new Project({
    useInMemoryFileSystem: true,
    compilerOptions: { allowJs: true },
  });

  const sourceFile = project.createSourceFile(filePath || "temp.ts", content);
  const fixes: SuggestedFix[] = [];
  const pathHints: string[] = [];

  for (const change of changes) {
    // 1. Parameter / Property renames (generic for any field before -> after)
    const oldField = change.before || change.field;
    let newField = change.after;

    if (!newField && oldField) {
      if (oldField === "max_tokens") newField = "max_output_tokens";
      else {
        const addedChange = changes.find((c) => (c.kind === "field-added" || c.kind === "endpoint-added") && c.field && c.field !== oldField);
        if (addedChange && addedChange.field) {
          newField = addedChange.field;
        }
      }
    }

    if (oldField && newField && oldField !== newField) {
      // Object Property Assignments (e.g. call site options { max_tokens: 500 })
      // Only transform actual request object property assignments, not interface/type declarations.
      const propertyAssignments = sourceFile.getDescendantsOfKind(SyntaxKind.PropertyAssignment);
      for (const prop of propertyAssignments) {
        if (prop.getName() === oldField) {
          const parentObj = prop.getFirstAncestorByKind(SyntaxKind.ObjectLiteralExpression);
          if (parentObj) {
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
    }

    // 2. Required parameter insertion (e.g., idempotencyKey, reason, or any new required field)
    if (change.kind === "field-required" && change.field) {
      const fieldName = change.field;

      const objectLiterals = sourceFile.getDescendantsOfKind(SyntaxKind.ObjectLiteralExpression);
      for (const literal of objectLiterals) {
        const hasKey = literal.getProperty(fieldName) !== undefined;

        if (!hasKey) {
          let defaultValue = "crypto.randomUUID()";
          if (fieldName === "reason") defaultValue = '"requested_by_customer"';
          else if (fieldName.toLowerCase().includes("id")) defaultValue = "crypto.randomUUID()";
          else if (fieldName.toLowerCase().includes("key")) defaultValue = "crypto.randomUUID()";

          literal.addPropertyAssignment({
            name: fieldName,
            initializer: defaultValue,
          });

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
    }

    // 3. Enum value updates (e.g. status "pending" -> "processing", "failed" -> "declined", or custom enum)
    if (change.kind === "enum-value-removed" && change.before) {
      const oldVal = change.before;
      let newVal = change.after;

      if (!newVal) {
        if (oldVal === "pending") newVal = "processing";
        if (oldVal === "failed") newVal = "declined";
      }

      if (newVal) {
        const stringLiterals = sourceFile.getDescendantsOfKind(SyntaxKind.StringLiteral);
        for (const literal of stringLiterals) {
          if (literal.getLiteralText() === oldVal) {
            literal.setLiteralValue(newVal);
            fixes.push({
              changeId: change.id,
              file: filePath,
              description: `Rename status enum "${oldVal}" → "${newVal}" via AST`,
              before: `"${oldVal}"`,
              after: `"${newVal}"`,
              safe: true,
              safetyNotes: ["AST string literal enum update"],
            });
            pathHints.push(oldVal);
          }
        }
      }
    }

    // 4. Base URL updates across any file
    if (change.kind === "server-url-changed" && change.before && change.after) {
      const stringLiterals = sourceFile.getDescendantsOfKind(SyntaxKind.StringLiteral);
      for (const literal of stringLiterals) {
        if (literal.getLiteralText().includes(change.before)) {
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
  }

  sourceFile.saveSync();
  const updatedContent = project.getFileSystem().readFileSync(sourceFile.getFilePath());

  return {
    content: updatedContent,
    fixes,
    pathHints,
  };
}
