import path from "path";
import { scanDirectory } from "../../lib/engine";

export interface ScanOptions {
  vendors?: string[];
}

export function handleScanCommand(targetPath?: string, options: ScanOptions = {}): void {
  const dirPath = targetPath || "./src";
  const resolvedPath = path.resolve(dirPath);

  console.log("\nREPAIRO");
  console.log("──────────────────────────────\n");
  console.log(`Scanning repository: ${dirPath}...`);

  try {
    const result = scanDirectory(resolvedPath, options.vendors);
    const durationSec = (result.durationMs / 1000).toFixed(2);

    console.log(`\nRepository:`);
    console.log(`  ${result.repositoryPath}\n`);

    console.log(`✓ Parsed ${result.filesScanned} TypeScript files`);
    const vendorCount = Object.keys(result.vendorsDetected).length;
    console.log(`✓ Found ${vendorCount} API dependencies`);
    console.log(`✓ Found ${result.totalCallSites} API call sites\n`);

    if (vendorCount > 0) {
      console.log("API dependencies detected:\n");
      for (const [vendorName, files] of Object.entries(result.vendorsDetected)) {
        console.log(`  ${vendorName} (${files.length} file${files.length > 1 ? "s" : ""})`);
        for (const f of files) {
          console.log(`    ${f}`);
        }
        console.log();
      }
    } else {
      console.log("No known API dependencies detected.\n");
    }

    console.log(`Potential API-dependent locations:`);
    console.log(`  ${result.totalCallSites}\n`);
    console.log(`Scan completed in ${durationSec}s\n`);

    console.log("For breaking-change analysis:");
    console.log("  repairo diff --spec ./specs/new.json\n");
  } catch (err: any) {
    console.error(`\n❌ Error scanning repository: ${err.message || String(err)}\n`);
    process.exit(1);
  }
}
