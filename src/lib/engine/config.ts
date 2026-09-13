import fs from "fs";
import path from "path";
import { KNOWN_VENDORS, scanDirectory } from "./ast-parser";

export interface RepairoConfig {
  version: number;
  repository: string;
  language: string;
  vendors: string[];
  specs: Record<string, string>;
  validation: {
    typecheck: boolean;
    tests: boolean;
  };
}

export function getRepairoDir(targetDir: string = "."): string {
  return path.resolve(targetDir, ".repairo");
}

export function getConfigPath(targetDir: string = "."): string {
  return path.join(getRepairoDir(targetDir), "config.json");
}

export function getSnapshotsDir(targetDir: string = "."): string {
  return path.join(getRepairoDir(targetDir), "snapshots");
}

export function getReportsDir(targetDir: string = "."): string {
  return path.join(getRepairoDir(targetDir), "reports");
}

/**
 * Which catalog vendors (see catalog.ts — matched by KNOWN_VENDORS' key, which mirrors the
 * catalog id 1:1) this codebase actually imports, via the same detection `repairo scan`
 * uses. Not a guess: `repairo init` has no way to know which vendors a given project
 * depends on ahead of time, so it looks rather than assuming everyone is on the same
 * three SDKs. Falls back to none found (rather than throwing) so `init` still succeeds
 * against an empty or unreadable directory.
 */
function detectVendorsIn(targetDir: string): string[] {
  try {
    const { vendorsDetected } = scanDirectory(targetDir);
    const idByName = new Map(Object.entries(KNOWN_VENDORS).map(([id, v]) => [v.name, id]));
    const detected = Object.keys(vendorsDetected)
      .map((name) => idByName.get(name))
      .filter((id): id is string => Boolean(id));
    return Array.from(new Set(detected));
  } catch {
    return [];
  }
}

export function initRepairoConfig(
  targetDir: string = ".",
  options: { repository?: string; vendors?: string[] } = {}
): { configPath: string; created: boolean; config: RepairoConfig } {
  const repairoDir = getRepairoDir(targetDir);
  const snapshotsDir = getSnapshotsDir(targetDir);
  const reportsDir = getReportsDir(targetDir);

  if (!fs.existsSync(repairoDir)) {
    fs.mkdirSync(repairoDir, { recursive: true });
  }
  if (!fs.existsSync(snapshotsDir)) {
    fs.mkdirSync(snapshotsDir, { recursive: true });
  }
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const configPath = getConfigPath(targetDir);
  let config: RepairoConfig;
  let created = false;

  if (fs.existsSync(configPath)) {
    const raw = fs.readFileSync(configPath, "utf-8");
    config = JSON.parse(raw);
    if (options.repository) config.repository = options.repository;
    if (options.vendors && options.vendors.length > 0) {
      config.vendors = Array.from(new Set([...config.vendors, ...options.vendors]));
    }
  } else {
    created = true;
    config = {
      version: 1,
      repository: options.repository || "owner/repository",
      language: "typescript",
      vendors: options.vendors && options.vendors.length > 0 ? options.vendors : detectVendorsIn(targetDir),
      specs: {},
      validation: {
        typecheck: true,
        tests: true,
      },
    };
  }

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
  return { configPath, created, config };
}

export function loadRepairoConfig(targetDir: string = "."): RepairoConfig | null {
  const configPath = getConfigPath(targetDir);
  if (!fs.existsSync(configPath)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(configPath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
