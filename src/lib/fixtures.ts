import { readFileSync } from "fs";
import { join } from "path";
import { loadScenarioFixtures, type DemoScenarioId } from "@/lib/demo-scenarios";

/** Load fixture text with a statically scoped fixtures/ root for bundlers. */
export function readFixture(...parts: string[]): string {
  return readFileSync(join(process.cwd(), "fixtures", ...parts), "utf8");
}

export function loadDemoFixtures(scenario: DemoScenarioId = "payments-ts") {
  return loadScenarioFixtures(scenario);
}
