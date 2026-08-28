#!/usr/bin/env node

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { handleDiffCommand } from "./commands/diff";
import { handleInitCommand } from "./commands/init";
import { handleRepairCommand } from "./commands/repair";
import { handleScanCommand } from "./commands/scan";

function getPackageInfo(): { name: string; version: string } {
  const here = dirname(fileURLToPath(import.meta.url));
  const pkgPath = join(here, "../../package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
  return { name: pkg.name, version: pkg.version };
}

function printHelp(): void {
  console.log(`
REPAIRO CLI - Automated API Breaking Change Detection & AST Repair

Usage:
  repairo <command> [options]

Commands:
  scan [dir]             Scan codebase for third-party API SDK & HTTP client dependencies
                         Options: --vendors stripe,openai,supabase

  init                   Initialize local .repairo configuration directory
                         Options: --repo owner/repository, --vendors stripe,openai

  diff                   Compare OpenAPI specification against snapshot and map codebase impact
                         Options: --spec ./specs/new-openapi.json, --target ./src

  repair                 Generate validated AST repairs for breaking API changes
                         Options: --dry-run (default), --apply, --create-pr, --spec ./specs/new.json

Flags:
  --help, -h             Show help documentation
  --version, -v          Show Repairo CLI version
`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    printHelp();
    return;
  }

  if (args.includes("--version") || args.includes("-v")) {
    const { name, version } = getPackageInfo();
    console.log(`${name} v${version}`);
    return;
  }

  const command = args[0];
  const restArgs = args.slice(1);

  function parseFlags(rawArgs: string[]): { positional: string[]; flags: Record<string, string | boolean> } {
    const positional: string[] = [];
    const flags: Record<string, string | boolean> = {};

    for (let i = 0; i < rawArgs.length; i++) {
      const arg = rawArgs[i];
      if (arg.startsWith("--")) {
        const flagKey = arg.substring(2);
        const nextArg = rawArgs[i + 1];
        if (nextArg && !nextArg.startsWith("-")) {
          flags[flagKey] = nextArg;
          i++;
        } else {
          flags[flagKey] = true;
        }
      } else if (arg.startsWith("-")) {
        const flagKey = arg.substring(1);
        flags[flagKey] = true;
      } else {
        positional.push(arg);
      }
    }

    return { positional, flags };
  }

  const { positional, flags } = parseFlags(restArgs);

  switch (command) {
    case "scan": {
      const targetPath = positional[0] || (typeof flags.target === "string" ? flags.target : undefined);
      const vendorsStr = typeof flags.vendors === "string" ? flags.vendors : undefined;
      const vendors = vendorsStr ? vendorsStr.split(",") : undefined;
      handleScanCommand(targetPath, { vendors });
      break;
    }

    case "init": {
      const repo = typeof flags.repo === "string" ? flags.repo : undefined;
      const vendorsStr = typeof flags.vendors === "string" ? flags.vendors : undefined;
      const vendors = vendorsStr ? vendorsStr.split(",") : undefined;
      handleInitCommand({ repo, vendors });
      break;
    }

    case "diff": {
      const spec = typeof flags.spec === "string" ? flags.spec : undefined;
      const target = typeof flags.target === "string" ? flags.target : positional[0];
      handleDiffCommand({ spec, target });
      break;
    }

    case "repair": {
      const spec = typeof flags.spec === "string" ? flags.spec : undefined;
      const target = typeof flags.target === "string" ? flags.target : positional[0];
      const dryRun = Boolean(flags["dry-run"]);
      const apply = Boolean(flags.apply);
      const createPr = Boolean(flags["create-pr"]);

      await handleRepairCommand({
        spec,
        target,
        dryRun,
        apply,
        createPr,
      });
      break;
    }

    default:
      console.error(`❌ Unknown command: '${command}'\n`);
      printHelp();
      process.exit(1);
  }
}

main().catch((err) => {
  console.error("Unhandled CLI Error:", err);
  process.exit(1);
});
