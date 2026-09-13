import fs from "fs";
import path from "path";
import { Node, Project, SyntaxKind, CallExpression } from "ts-morph";
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
}

// Curated names/symbols for the vendors Repairo's own catalog (catalog.ts) already knows
// how to track — precise, nicer labels than the generic fallback below can derive. Any
// OTHER package is still detected (see `deriveVendorName`), just without this curation.
export const KNOWN_VENDORS: Record<string, { name: string; packages: string[]; symbols: string[] }> = {
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
  anthropic: {
    name: "Anthropic",
    packages: ["@anthropic-ai/sdk"],
    symbols: ["Anthropic", "anthropic", "messages"],
  },
  gemini: {
    name: "Google Gemini",
    packages: ["@google/generative-ai", "@google/genai"],
    symbols: ["GoogleGenerativeAI", "genAI", "gemini", "generateContent"],
  },
  supabase: {
    name: "Supabase",
    packages: ["@supabase/supabase-js"],
    symbols: ["createClient", "supabase", "from", "auth", "storage", "rpc"],
  },
  github: {
    name: "GitHub REST",
    packages: ["@octokit/rest", "octokit", "@octokit/core"],
    symbols: ["Octokit", "octokit", "pulls", "issues", "repos"],
  },
};

/**
 * Packages that are never themselves the "3rd-party API" a codebase is watching for
 * breaking changes — frameworks, build tooling, and generic utilities. Kept short and
 * conservative on purpose: this only suppresses obvious noise, it never decides whether
 * something IS a vendor API (see `deriveVendorName`, used for everything else).
 */
const NON_VENDOR_PACKAGES = new Set([
  "react", "react-dom", "next", "typescript", "eslint", "tailwindcss", "vite", "webpack",
  "zod", "lodash", "dotenv", "dayjs", "date-fns", "uuid", "clsx", "classnames",
]);

/** "@supabase/supabase-js" -> "Supabase", "twilio" -> "Twilio", "aws-sdk" -> "Aws". */
function deriveVendorName(packageName: string): string {
  const scope = packageName.startsWith("@") ? packageName.split("/")[0].slice(1) : undefined;
  const base = scope ?? packageName.split("/")[0];
  const cleaned = base.replace(/-?(js|sdk|client|node|api)$/i, "") || base;
  return cleaned
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

/** The leftmost identifier of a call's callee: `stripe.refunds.create()` -> "stripe". */
function rootIdentifierName(call: CallExpression): string | undefined {
  let expr: Node = call.getExpression();
  for (;;) {
    if (Node.isIdentifier(expr)) return expr.getText();
    if (
      Node.isPropertyAccessExpression(expr) ||
      Node.isElementAccessExpression(expr) ||
      Node.isCallExpression(expr) ||
      Node.isNonNullExpression(expr) ||
      Node.isParenthesizedExpression(expr)
    ) {
      expr = expr.getExpression();
      continue;
    }
    return undefined;
  }
}

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
  for (const file of filePaths) {
    project.addSourceFileAtPath(file);
  }

  const vendorsDetected: Record<string, Set<string>> = {};
  const callSiteDetails: DetailedScanResult["callSiteDetails"] = [];
  let totalCallSites = 0;

  const allowedVendors = vendorFilter && vendorFilter.length > 0
    ? new Set(vendorFilter.map((v) => v.toLowerCase().trim()))
    : null;

  /** Curated name for a known catalog vendor's package, or a name derived from the package
   * itself for anything else — `null` when the caller's --vendors filter excludes it, or
   * when it's a relative import or a known non-API package (see NON_VENDOR_PACKAGES). */
  function vendorNameForPackage(pkg: string): string | null {
    if (pkg.startsWith(".") || pkg.startsWith("/")) return null;
    const lower = pkg.toLowerCase();
    const known = Object.entries(KNOWN_VENDORS).find(
      ([vKey, vData]) =>
        (!allowedVendors || allowedVendors.has(vKey)) &&
        vData.packages.some((pkg) => lower === pkg || lower.startsWith(pkg + "/")),
    );
    if (known) return known[1].name;
    if (allowedVendors) return null; // caller asked for specific known vendors only
    if (NON_VENDOR_PACKAGES.has(lower)) return null;
    return deriveVendorName(pkg);
  }

  for (const sourceFile of project.getSourceFiles()) {
    const relPath = path.relative(absPath, sourceFile.getFilePath()).replace(/\\/g, "/");

    // 1. Check imports for vendors, and remember which local name each vendor package was
    // imported as — so a call site like `twilioClient.messages.create()` can be attributed
    // to its actual import below instead of falling into the generic bucket.
    const importedVendorFor = new Map<string, string>();
    for (const imp of sourceFile.getImportDeclarations()) {
      const vendorName = vendorNameForPackage(imp.getModuleSpecifierValue());
      if (!vendorName) continue;
      if (!vendorsDetected[vendorName]) vendorsDetected[vendorName] = new Set();
      vendorsDetected[vendorName].add(relPath);

      const def = imp.getDefaultImport();
      if (def) importedVendorFor.set(def.getText(), vendorName);
      const ns = imp.getNamespaceImport();
      if (ns) importedVendorFor.set(ns.getText(), vendorName);
      for (const named of imp.getNamedImports()) {
        importedVendorFor.set(named.getAliasNode()?.getText() ?? named.getName(), vendorName);
      }
    }

    // Propagate through the extremely common "factory client" pattern —
    // `const twilioClient = twilio(sid, token)` / `const stripe = new Stripe(key)` — so the
    // constructed client is attributed to its vendor too, not just the SDK import itself.
    for (const decl of sourceFile.getDescendantsOfKind(SyntaxKind.VariableDeclaration)) {
      const init = decl.getInitializer();
      const nameNode = decl.getNameNode();
      if (!init || !Node.isIdentifier(nameNode)) continue;
      if (!Node.isCallExpression(init) && !Node.isNewExpression(init)) continue;
      const callee = init.getExpression();
      const vendorName = Node.isIdentifier(callee) ? importedVendorFor.get(callee.getText()) : undefined;
      if (vendorName) importedVendorFor.set(nameNode.getText(), vendorName);
    }

    const callExprs = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);
    for (const call of callExprs) {
      const exprText = call.getExpression().getText();

      // Require calls
      if (exprText === "require") {
        const args = call.getArguments();
        if (args.length > 0 && SyntaxKind.StringLiteral === args[0].getKind()) {
          const reqPath = args[0].getText().replace(/['"]/g, "");
          const vendorName = vendorNameForPackage(reqPath);
          if (vendorName) {
            if (!vendorsDetected[vendorName]) vendorsDetected[vendorName] = new Set();
            vendorsDetected[vendorName].add(relPath);
          }
        }
      }

      // Check API Call Sites (fetch, axios, sdk calls)
      let isApiCall = false;
      let matchedVendor = "HTTP / Generic API";
      const rootName = rootIdentifierName(call);
      const importedVendor = rootName ? importedVendorFor.get(rootName) : undefined;

      if (exprText === "fetch" || exprText.startsWith("axios")) {
        isApiCall = true;
        matchedVendor = exprText.startsWith("axios") ? "Axios" : "Fetch API";
      } else if (importedVendor) {
        isApiCall = true;
        matchedVendor = importedVendor;
        vendorsDetected[matchedVendor].add(relPath);
      } else {
        for (const [vKey, vData] of Object.entries(KNOWN_VENDORS)) {
          if (allowedVendors && !allowedVendors.has(vKey)) continue;
          const lowerExpr = exprText.toLowerCase();
          if (vData.symbols.some((sym) => lowerExpr.includes(sym.toLowerCase()))) {
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
  }

  const resultVendors: Record<string, string[]> = {};
  for (const [vName, filesSet] of Object.entries(vendorsDetected)) {
    resultVendors[vName] = Array.from(filesSet);
  }

  return {
    repositoryPath: absPath,
    filesScanned: filePaths.length,
    vendorsDetected: resultVendors,
    totalCallSites,
    durationMs: Date.now() - startTime,
    callSiteDetails,
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
