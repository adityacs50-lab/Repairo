import {
  CallExpression,
  Node,
  ObjectLiteralExpression,
  Project,
  SyntaxKind,
} from "ts-morph";
import type { ApiChange, ConsumerFile, SuggestedFix } from "./types";

export interface AstTransformResult {
  content: string;
  fixes: SuggestedFix[];
  pathHints: string[];
}

/**
 * Matches call expressions that plausibly target a third-party API:
 * vendor SDK clients (openai.chat.completions.create, stripe.refunds.create),
 * generic HTTP clients (fetch, axios), or *client/*api/*sdk instances.
 * Transforms are restricted to arguments of such calls so unrelated
 * object literals, string literals, and config objects are never touched.
 */
const API_CALL_RE =
  /\b(fetch|axios|client|api|sdk|http|request|stripe|openai|anthropic|gemini|supabase|razorpay|octokit|github)\b/i;

function isApiCallExpression(call: CallExpression): boolean {
  // Split camelCase so identifiers like paymentsClient / stripeApi match word-boundary keywords.
  const text = call.getExpression().getText().replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  return API_CALL_RE.test(text);
}

/** Walks up from `node` to find an API-like call that contains it as (part of) an argument. */
function enclosingApiCall(node: Node): CallExpression | undefined {
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

/**
 * Infers the replacement name for a removed field: only when the same
 * path + operation gained exactly one distinct new field in the same
 * change set. Anything more speculative is left for human review.
 */
function inferRenamedField(change: ApiChange, changes: ApiChange[]): string | undefined {
  if (change.after) return change.after;
  if (!change.before && !change.field) return undefined;

  const addedFields = new Set(
    changes
      .filter(
        (c) =>
          c.kind === "field-added" &&
          c.path === change.path &&
          c.operation === change.operation &&
          c.field &&
          c.field !== (change.before || change.field),
      )
      .map((c) => c.field as string),
  );

  return addedFields.size === 1 ? [...addedFields][0] : undefined;
}

/** True if `literal` (or a literal containing it) is passed as an argument to an API-like call. */
function isInApiCallArgument(literal: ObjectLiteralExpression): boolean {
  return enclosingApiCall(literal) !== undefined;
}

function isEnumUsageSite(literal: Node, field: string): boolean {
  // status: "pending" — property assignment named after the changed field
  const propAncestor = literal.getFirstAncestorByKind(SyntaxKind.PropertyAssignment);
  if (propAncestor && propAncestor.getName() === field) return true;

  // charge.status === "pending" — comparison against the changed field
  const binary = literal.getParent();
  if (binary && Node.isBinaryExpression(binary)) {
    const other =
      binary.getLeft() === literal ? binary.getRight() : binary.getLeft();
    if (other.getText().includes(field)) return true;
  }

  // switch (charge.status) { case "pending": ... }
  const caseClause = literal.getFirstAncestorByKind(SyntaxKind.CaseClause);
  if (caseClause) {
    const switchStmt = caseClause.getFirstAncestorByKind(SyntaxKind.SwitchStatement);
    if (switchStmt && switchStmt.getExpression().getText().includes(field)) {
      return true;
    }
  }

  return false;
}

/**
 * Executes deterministic AST transformations scoped to third-party API call
 * sites. Object literals, properties, and string literals that are not part
 * of an API request (or a usage of the changed field) are never modified.
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
    // 1. Field renames inside API request payloads (removed field paired with a replacement)
    const oldField = change.kind === "field-removed" ? change.before || change.field : undefined;
    const newField = oldField ? inferRenamedField(change, changes) : undefined;

    if (oldField && newField && oldField !== newField) {
      const propertyAssignments = sourceFile.getDescendantsOfKind(SyntaxKind.PropertyAssignment);
      for (const prop of propertyAssignments) {
        if (prop.getName() !== oldField) continue;
        const parentObj = prop.getFirstAncestorByKind(SyntaxKind.ObjectLiteralExpression);
        if (!parentObj || !isInApiCallArgument(parentObj)) continue;

        prop.getNameNode().replaceWithText(newField);
        fixes.push({
          changeId: change.id,
          file: filePath,
          description: `Renamed property "${oldField}" → "${newField}" via AST`,
          before: `${oldField}: ...`,
          after: `${newField}: ...`,
          safe: true,
          safetyNotes: [
            "AST PropertyAssignment rename preserving initializer and formatting",
            "Scoped to API call-site arguments only",
          ],
        });
        pathHints.push(oldField);
      }
    }

    // 2. Required field insertion into API request payloads
    if (change.kind === "field-required" && change.field) {
      const fieldName = change.field;

      const objectLiterals = sourceFile.getDescendantsOfKind(SyntaxKind.ObjectLiteralExpression);
      for (const literal of objectLiterals) {
        const call = enclosingApiCall(literal);
        // Only the top-level request object of an API call, not nested literals.
        if (!call || !call.getArguments().includes(literal)) continue;
        if (literal.getProperty(fieldName) !== undefined) continue;

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
          safetyNotes: [
            "Deterministic AST property insertion",
            "Scoped to API call-site request objects only",
          ],
        });
        pathHints.push(fieldName);
      }
    }

    // 3. Enum value updates at usage sites of the changed field
    if (change.kind === "enum-value-removed" && change.before && change.after) {
      const oldVal = change.before;
      const newVal = change.after;

      const stringLiterals = sourceFile.getDescendantsOfKind(SyntaxKind.StringLiteral);
      for (const literal of stringLiterals) {
        if (literal.getLiteralText() !== oldVal) continue;

        const inApiCall = enclosingApiCall(literal) !== undefined;
        const isUsage = change.field ? isEnumUsageSite(literal, change.field) : false;
        if (!inApiCall && !isUsage) continue;

        literal.setLiteralValue(newVal);
        fixes.push({
          changeId: change.id,
          file: filePath,
          description: `Rename enum value "${oldVal}" → "${newVal}" via AST`,
          before: `"${oldVal}"`,
          after: `"${newVal}"`,
          safe: true,
          safetyNotes: [
            "AST string literal enum update",
            "Scoped to API call arguments and usages of the changed field",
          ],
        });
        pathHints.push(oldVal);
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
