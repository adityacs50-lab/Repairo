import fs from "fs";
import path from "path";
import { Project, SyntaxKind, SourceFile, CallExpression } from "ts-morph";
import type { ApiChange, ConsumerFile, ImpactMatch } from "./types";

export interface VendorUsage {
  vendor: string;
  files: string[];
  callSites: number;
}

export interface DetailedScanResult {
  repositoryPath: string;
  filesScanned: number;
  vendorsDetected: Record<string, string[]>; // vendor -> file paths
  totalCallSites: number;
  durationMs: number;
  callSiteDetails: Array<{
    file: string;
    line: number;
    column: number;
    vendor: string;
    snippet: string;
  }>;
  /** Files that couldn't be parsed as valid TS/JS (e.g. Flow-only syntax) — skipped, not fatal. */
  unparseableFiles: string[];
}

const KNOWN_VENDORS: Record<string, { name: string; packages: string[]; symbols: string[] }> = {
  stripe: {
    name: "Stripe",
    packages: ["stripe", "@stripe/stripe-js"],
    symbols: ["Stripe", "stripe", "charges", "paymentIntents", "checkout", "customers", "subscriptions", "refunds"],
  },
  openai: {
    name: "OpenAI",
    packages: ["openai"],
    symbols: ["OpenAI", "openai", "chat", "completions", "embeddings", "images", "audio"],
  },
  supabase: {
    name: "Supabase",
    packages: ["@supabase/supabase-js"],
    // "from" deliberately excluded — it's Supabase's query-builder entry point, but it's
    // also Buffer.from()/Array.from()/Object.fromEntries(), which drowns out real hits on
    // any codebase that doesn't otherwise use Supabase (confirmed against facebook/react
    // and dubinc/dub, neither of which use it).
    symbols: ["createClient", "supabase", "auth", "storage", "rpc"],
  },
};

/**
 * Scans a local filesystem directory for API SDK & HTTP client usages using AST parsing.
 */
export function scanDirectory(targetDir: string, vendorFilter?: string[]): DetailedScanResult {
  const startTime = Date.now();
  const absPath = path.resolve(targetDir);

  if (!fs.existsSync(absPath)) {
    throw new Error(`Target directory does not exist: ${absPath}`);
  }

  const project = new Project({
    skipAddingFilesFromTsConfig: true,
    compilerOptions: { allowJs: true },
  });

  const ignoreDirs = new Set(["node_modules", ".next", ".git", "dist", "build", ".repairo"]);

  function collectFiles(dir: string): string[] {
    const results: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!ignoreDirs.has(entry.name)) {
          results.push(...collectFiles(fullPath));
        }
      } else if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) {
        results.push(fullPath);
      }
    }
    return results;
  }

  const filePaths = collectFiles(absPath);
  const unparseableFiles: string[] = [];

  for (const file of filePaths) {
    try {
      project.addSourceFileAtPath(file);
    } catch {
      // Malformed or non-standard syntax (e.g. Flow-only constructs like
      // `import typeof * as X from '...'`) — skip this one file, not the whole scan.
      unparseableFiles.push(path.relative(absPath, file).replace(/\\/g, "/"));
    }
  }

  const vendorsDetected: Record<string, Set<string>> = {};
  const callSiteDetails: DetailedScanResult["callSiteDetails"] = [];
  let totalCallSites = 0;

  const allowedVendors = vendorFilter && vendorFilter.length > 0
    ? new Set(vendorFilter.map((v) => v.toLowerCase().trim()))
    : null;

  for (const sourceFile of project.getSourceFiles()) {
    const relPath = path.relative(absPath, sourceFile.getFilePath()).replace(/\\/g, "/");

    try {
      // 1. Check imports/requires for vendors
      const importDeclarations = sourceFile.getImportDeclarations();
      for (const imp of importDeclarations) {
        const moduleSpecifier = imp.getModuleSpecifierValue().toLowerCase();
        for (const [vKey, vData] of Object.entries(KNOWN_VENDORS)) {
          if (allowedVendors && !allowedVendors.has(vKey)) continue;
          if (vData.packages.some((pkg) => moduleSpecifier === pkg || moduleSpecifier.startsWith(pkg + "/"))) {
            if (!vendorsDetected[vData.name]) vendorsDetected[vData.name] = new Set();
            vendorsDetected[vData.name].add(relPath);
          }
        }
      }

      // Require calls
      const callExprs = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);
      for (const call of callExprs) {
        const exprText = call.getExpression().getText();

        if (exprText === "require") {
          const args = call.getArguments();
          if (args.length > 0 && SyntaxKind.StringLiteral === args[0].getKind()) {
            const reqPath = args[0].getText().replace(/['"]/g, "").toLowerCase();
            for (const [vKey, vData] of Object.entries(KNOWN_VENDORS)) {
              if (allowedVendors && !allowedVendors.has(vKey)) continue;
              if (vData.packages.some((pkg) => reqPath === pkg || reqPath.startsWith(pkg + "/"))) {
                if (!vendorsDetected[vData.name]) vendorsDetected[vData.name] = new Set();
                vendorsDetected[vData.name].add(relPath);
              }
            }
          }
        }

        // Check API Call Sites (fetch, axios, sdk calls)
        let isApiCall = false;
        let matchedVendor = "HTTP / Generic API";

        if (exprText === "fetch" || exprText.startsWith("axios")) {
          isApiCall = true;
          matchedVendor = exprText.startsWith("axios") ? "Axios" : "Fetch API";
        } else {
          // Match whole dotted segments (e.g. "openai" / "chat" / "completions" in
          // "openai.chat.completions.create"), never a substring anywhere in the
          // expression text — a plain `includes()` check matches "checkout" inside
          // "checkoutBranch" or "images" inside "suspenseyImages", flagging unrelated
          // code (git helpers, DOM image handling) as vendor SDK usage.
          const exprSegments = exprText.toLowerCase().split(/[.\[\]()]+/).filter(Boolean);
          for (const [vKey, vData] of Object.entries(KNOWN_VENDORS)) {
            if (allowedVendors && !allowedVendors.has(vKey)) continue;
            if (vData.symbols.some((sym) => exprSegments.includes(sym.toLowerCase()))) {
              isApiCall = true;
              matchedVendor = vData.name;
              if (!vendorsDetected[vData.name]) vendorsDetected[vData.name] = new Set();
              vendorsDetected[vData.name].add(relPath);
              break;
            }
          }
        }

        if (isApiCall) {
          totalCallSites++;
          const lineAndCol = sourceFile.getLineAndColumnAtPos(call.getStart());
          callSiteDetails.push({
            file: relPath,
            line: lineAndCol.line,
            column: lineAndCol.column,
            vendor: matchedVendor,
            snippet: call.getText().split("\n")[0].substring(0, 80),
          });
        }
      }
    } catch {
      // A source file that added successfully but breaks on a specific AST walk
      // (unusual syntax deep in the tree) is skipped the same way as a parse failure.
      unparseableFiles.push(relPath);
    }
  }

  const resultVendors: Record<string, string[]> = {};
  for (const [vName, filesSet] of Object.entries(vendorsDetected)) {
    resultVendors[vName] = Array.from(filesSet);
  }

  return {
    repositoryPath: absPath,
    filesScanned: filePaths.length - unparseableFiles.length,
    vendorsDetected: resultVendors,
    totalCallSites,
    durationMs: Date.now() - startTime,
    callSiteDetails,
    unparseableFiles,
  };
}

export interface AstScanResult {
  impacts: ImpactMatch[];
  scannedFiles: number;
  deprecatedCalls: number;
}

/**
 * Scans in-memory consumer files for impacts based on ApiChange objects.
 */
export function scanCodebase(files: ConsumerFile[], changes: ApiChange[]): AstScanResult {
  const project = new Project({ useInMemoryFileSystem: true });

  for (const file of files) {
    project.createSourceFile(file.path, file.content);
  }

  const impacts: ImpactMatch[] = [];
  let deprecatedCalls = 0;

  for (const sourceFile of project.getSourceFiles()) {
    const filePath = sourceFile.getFilePath().replace(/^\//, "");

    for (const change of changes) {
      if (change.severity === "breaking" || change.kind === "field-required") {
        if (change.before && sourceFile.getFullText().includes(change.before)) {
          const fullText = sourceFile.getFullText();
          const pos = fullText.indexOf(change.before);
          const lineAndCol = sourceFile.getLineAndColumnAtPos(pos);

          impacts.push({
            file: filePath,
            line: lineAndCol.line,
            column: lineAndCol.column,
            snippet: change.before,
            symbol: change.before,
            changeId: change.id,
            confidence: "high",
            reason: `Deprecated reference to '${change.before}' detected.`,
          });
          deprecatedCalls++;
        }
      }
    }
  }

  return {
    impacts: Array.from(new Set(impacts)),
    scannedFiles: files.length,
    deprecatedCalls,
  };
}
