#!/usr/bin/env node

const { spawnSync } = require("child_process");
const path = require("path");

const cliScript = path.join(__dirname, "../src/cli/index.ts");

/**
 * Locate the tsx CLI that ships with this package.
 *
 * The Repairo CLI is TypeScript and is executed through tsx, so tsx is a real
 * runtime dependency and is installed alongside this package. require.resolve
 * uses Node's normal lookup from this file, which finds tsx whether npm nested
 * it under repairo-cli/node_modules or hoisted it into a parent node_modules —
 * a hardcoded relative path only ever matched the nested layout, so a hoisted
 * install silently fell through to the network fallback below.
 */
function resolveBundledTsx() {
  try {
    // "./cli" is an explicit subpath in tsx's exports map.
    return require.resolve("tsx/cli");
  } catch {
    return null;
  }
}

const bundledTsx = resolveBundledTsx();

let result;
if (bundledTsx) {
  result = spawnSync(
    process.execPath,
    [bundledTsx, cliScript, ...process.argv.slice(2)],
    { stdio: "inherit" },
  );
} else {
  // Last resort only. This downloads tsx from the npm registry on every run, so
  // it fails outright with no network. Reaching it means the install is
  // incomplete — reinstall with `npm install -g repairo-cli` to restore the
  // offline path above.
  const quote = (arg) => (/\s/.test(arg) ? `"${arg}"` : arg);
  const command = ["npx", "tsx", cliScript, ...process.argv.slice(2)]
    .map(quote)
    .join(" ");
  result = spawnSync(command, { stdio: "inherit", shell: true });
}

process.exit(result.status ?? 0);
