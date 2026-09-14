import { parseScenarioId, type DemoScenarioId } from "@/lib/demo-scenarios";
import { loadScenarioFixtures } from "@/lib/fixtures";
import { runRepair, type RepairRunResult } from "@/lib/engine";

const cached = new Map<DemoScenarioId, RepairRunResult>();

export async function getDemoRepairResult(
  scenario: DemoScenarioId = "payments-ts",
): Promise<RepairRunResult> {
  const hit = cached.get(scenario);
  if (hit) return hit;
  const fixtures = loadScenarioFixtures(scenario);
  const result = await runRepair({
    beforeSpec: fixtures.beforeSpec,
    afterSpec: fixtures.afterSpec,
    consumerFiles: fixtures.consumerFiles,
  });
  cached.set(scenario, result);
  return result;
}

export function getFixtureSources(scenario: DemoScenarioId = "payments-ts") {
  return loadScenarioFixtures(scenario);
}

export { parseScenarioId, type DemoScenarioId };
