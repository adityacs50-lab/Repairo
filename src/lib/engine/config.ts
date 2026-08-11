import fs from "fs";
import path from "path";

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
      vendors: options.vendors || ["stripe", "openai", "supabase"],
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
