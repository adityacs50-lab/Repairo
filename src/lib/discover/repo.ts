export type DiscoveredFile = {
  path: string;
  kind: "openapi" | "consumer-ts" | "consumer-py" | "consumer-js";
  score: number;
};

function isSpecPath(path: string) {
  const lower = path.toLowerCase();
  if (/(^|\/)(openapi|swagger)\.(ya?ml|json)$/.test(lower)) return true;
  if (lower.endsWith(".openapi.json") || lower.endsWith(".openapi.yaml")) {
    return true;
  }
  if (lower.includes("/openapi/") && /\.(ya?ml|json)$/.test(lower)) return true;
  return false;
}

function consumerScore(path: string): DiscoveredFile | null {
  const lower = path.toLowerCase();
  if (lower.includes("node_modules/") || lower.includes("/dist/")) return null;
  if (lower.includes("/.next/") || lower.includes("/vendor/")) return null;

  if (/\.(tsx?)$/.test(lower)) {
    let score = 0;
    if (/client|sdk|api|http|fetch|payments|stripe|openapi/.test(lower)) {
      score += 5;
    }
    if (/\/src\//.test(lower)) score += 1;
    if (/test|spec|stories|mock/.test(lower)) score -= 3;
    if (score <= 0) return null;
    return { path, kind: "consumer-ts", score };
  }

  if (/\.jsx?$/.test(lower)) {
    let score = 0;
    if (/client|sdk|api/.test(lower)) score += 4;
    if (score <= 0) return null;
    return { path, kind: "consumer-js", score };
  }

  if (/\.py$/.test(lower)) {
    let score = 0;
    if (/client|sdk|api|http|stripe|requests/.test(lower)) score += 4;
    if (/test|__pycache__/.test(lower)) score -= 3;
    if (score <= 0) return null;
    return { path, kind: "consumer-py", score };
  }

  return null;
}

/** Rank and cap discovery results from a flat path list (git tree). */
export function discoverFromPaths(paths: string[]): {
  specs: DiscoveredFile[];
  consumers: DiscoveredFile[];
} {
  const specs: DiscoveredFile[] = [];
  const consumers: DiscoveredFile[] = [];

  for (const path of paths) {
    if (isSpecPath(path)) {
      specs.push({ path, kind: "openapi", score: 10 });
      continue;
    }
    const c = consumerScore(path);
    if (c) consumers.push(c);
  }

  specs.sort((a, b) => a.path.localeCompare(b.path));
  consumers.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));

  return {
    specs: specs.slice(0, 20),
    consumers: consumers.slice(0, 40),
  };
}
