#!/usr/bin/env node

const { spawnSync } = require("child_process");
const path = require("path");

const cliScript = path.join(__dirname, "../src/cli/index.ts");
const tsxBin = path.join(__dirname, "../node_modules/tsx/dist/cli.mjs");

let result;
if (require("fs").existsSync(tsxBin)) {
  result = spawnSync(process.execPath, [tsxBin, cliScript, ...process.argv.slice(2)], {
    stdio: "inherit",
  });
} else {
  result = spawnSync("npx", ["tsx", cliScript, ...process.argv.slice(2)], {
    stdio: "inherit",
    shell: true,
  });
}

process.exit(result.status ?? 0);
