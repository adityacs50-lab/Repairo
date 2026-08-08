import { Project, SyntaxKind, SourceFile, CallExpression } from "ts-morph";
import type { ApiChange, ConsumerFile, ImpactMatch, SuggestedFix } from "./types";

export interface AstTransformResult {
  content: string;
  fixes: SuggestedFix[];
  pathHints: string[];
}

/**
 * Executes deterministic AST transformations to repair deprecated API calls.
 * Uses ts-morph to guarantee syntax-preserving modifications without LLM hallucinations.
 */
export function applyAstTransforms(
  content: string,
  changes: ApiChange[],
  filePath = ""
): AstTransformResult {
  const project = new Project({ useInMemoryFileSystem: true });
  const sourceFile = project.createSourceFile(filePath || "temp.ts", content);
  
  const fixes: SuggestedFix[] = [];
  const pathHints: string[] = [];

  for (const change of changes) {
    if (change.kind === "field-required" && change.field === "idempotencyKey") {
      // Find where CreateChargeInput or createCharge is called and insert idempotencyKey if missing
      const objectLiterals = sourceFile.getDescendantsOfKind(SyntaxKind.ObjectLiteralExpression);
      
      for (const literal of objectLiterals) {
        // Very basic heuristic for demo: if it has customerId but no idempotencyKey
        const hasCustomerId = literal.getProperty("customerId") !== undefined;
        const hasIdempotencyKey = literal.getProperty("idempotencyKey") !== undefined;
        
        if (hasCustomerId && !hasIdempotencyKey) {
          literal.addPropertyAssignment({
            name: "idempotencyKey",
            initializer: "crypto.randomUUID()"
          });
          
          fixes.push({
            changeId: change.id,
            file: filePath,
            description: "Add required idempotencyKey via AST",
            before: "Missing idempotencyKey",
            after: "idempotencyKey: crypto.randomUUID()",
            safe: true,
            safetyNotes: ["Deterministic AST insertion"]
          });
          pathHints.push("idempotencyKey");
        }
      }
    }

    if (change.kind === "enum-value-removed" && change.field === "status") {
      const stringLiterals = sourceFile.getDescendantsOfKind(SyntaxKind.StringLiteral);
      for (const literal of stringLiterals) {
        if (literal.getLiteralText() === change.before && change.after) {
          literal.setLiteralValue(change.after);
          fixes.push({
            changeId: change.id,
            file: filePath,
            description: `Rename status enum "${change.before}" → "${change.after}" via AST`,
            before: change.before,
            after: change.after,
            safe: true,
            safetyNotes: ["AST Semantic renaming"]
          });
          pathHints.push(change.before);
        }
      }
    }
  }

  // Save changes to the AST
  sourceFile.saveSync();
  const updatedContent = project.getFileSystem().readFileSync(sourceFile.getFilePath());

  return {
    content: updatedContent,
    fixes,
    pathHints
  };
}
