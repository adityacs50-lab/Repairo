import { NextResponse } from "next/server";
import { DEMO_SCENARIOS } from "@/lib/demo-scenarios";
import {
  getDemoRepairResult,
  getFixtureSources,
  parseScenarioId,
} from "@/lib/demo";
import { runRepair } from "@/lib/engine";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const scenario = parseScenarioId(new URL(request.url).searchParams.get("scenario"));
    const result = await getDemoRepairResult(scenario);
    const fixtures = getFixtureSources(scenario);
    return NextResponse.json({ result, fixtures, scenario, scenarios: DEMO_SCENARIOS });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load demo repair";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      beforeSpec?: string;
      afterSpec?: string;
      consumerFiles?: Array<{ path: string; content: string }>;
      scenario?: string;
    };

    const scenario = parseScenarioId(body.scenario);
    const fixtures = getFixtureSources(scenario);
    const beforeSpec = body.beforeSpec ?? fixtures.beforeSpec;
    const afterSpec = body.afterSpec ?? fixtures.afterSpec;
    const consumerFiles = body.consumerFiles ?? fixtures.consumerFiles;

    if (!beforeSpec.trim() || !afterSpec.trim()) {
      return NextResponse.json(
        { error: "beforeSpec and afterSpec are required" },
        { status: 400 },
      );
    }

    if (!Array.isArray(consumerFiles) || consumerFiles.length === 0) {
      return NextResponse.json(
        { error: "At least one consumer file is required" },
        { status: 400 },
      );
    }

    for (const file of consumerFiles) {
      if (!file?.path || typeof file.content !== "string") {
        return NextResponse.json(
          { error: "Each consumer file needs a path and content" },
          { status: 400 },
        );
      }
    }

    const result = await runRepair({ beforeSpec, afterSpec, consumerFiles });
    return NextResponse.json({ result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Repair engine failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
