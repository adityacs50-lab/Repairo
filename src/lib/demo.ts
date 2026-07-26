import { loadDemoFixtures } from "@/lib/fixtures";
import { runRepair, type RepairRunResult } from "@/lib/engine";

let cached: RepairRunResult | null = null;

export function getDemoRepairResult(): RepairRunResult {
  if (cached) return cached;
  const fixtures = loadDemoFixtures();
  cached = runRepair({
    beforeSpec: fixtures.beforeSpec,
    afterSpec: fixtures.afterSpec,
    consumerFiles: fixtures.consumerFiles,
  });
  return cached;
}

export function getFixtureSources() {
  return loadDemoFixtures();
}
