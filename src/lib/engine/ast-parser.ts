import { Project, SyntaxKind, SourceFile, CallExpression } from "ts-morph";
import type { ApiChange, ConsumerFile, ImpactMatch } from "./types";

export interface AstScanResult {
  impacts: ImpactMatch[];
  scannedFiles: number;
  deprecatedCalls: number;
}

/**
 * Scans a given set of files to identify deprecated API calls based on a set of API changes.
 * This is a deterministic read-only operation used for the Free "API Drift" Scan.
 */
export function scanCodebase(files: ConsumerFile[], changes: ApiChange[]): AstScanResult {
  const project = new Project({ useInMemoryFileSystem: true });
  
  // Load files into the ephemeral in-memory TS project
  for (const file of files) {
    project.createSourceFile(file.path, file.content);
  }

  const impacts: ImpactMatch[] = [];
  let deprecatedCalls = 0;

  for (const sourceFile of project.getSourceFiles()) {
    const filePath = sourceFile.getFilePath().replace("/", ""); // Simplify path
    
    // Naive pass: we look for CallExpressions that might map to deprecated SDK functions.
    // For example, finding `openai.ChatCompletion.create` vs `openai.chat.completions.create`
    const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);
    
    for (const change of changes) {
      if (change.severity === "breaking" || change.kind === "field-required") {
        // Just a stub logic to flag if the 'before' snippet exists as a substring for now
        // A true AST search would inspect the property access chain.
        if (change.before && sourceFile.getFullText().includes(change.before)) {
           const fullText = sourceFile.getFullText();
           const pos = fullText.indexOf(change.before);
           const linesBefore = fullText.substring(0, pos).split("\n");
           const line = linesBefore.length;
           const column = linesBefore[linesBefore.length - 1].length + 1;

           impacts.push({
             file: filePath,
             line,
             column,
             snippet: change.before,
             symbol: change.before,
             changeId: change.id,
             confidence: "high",
             reason: `Deprecated reference to '${change.before}' detected.`
           });
           deprecatedCalls++;
        }
      }
    }
  }

  return {
    impacts: Array.from(new Set(impacts)), // De-duplicate
    scannedFiles: files.length,
    deprecatedCalls
  };
}
