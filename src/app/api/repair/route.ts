import { NextResponse } from "next/server";
import { DEMO_SCENARIOS } from "@/lib/demo-scenarios";
import {
  getDemoRepairResult,
  getFixtureSources,
  parseScenarioId,
} from "@/lib/demo";
import { runRepair } from "@/lib/engine";
import { assertRateLimit, clientIp } from "@/lib/rate-limit";
import { AuthError } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const MAX_SPEC_CHARS = 800_000;
const MAX_FILES = 30;
const MAX_FILE_CHARS = 250_000;

export async function GET(request: Request) {
  try {
    assertRateLimit({
      key: `repair-get:${clientIp(request)}`,
      limit: 30,
      windowMs: 60_000,
    });
    const scenario = parseScenarioId(new URL(request.url).searchParams.get("scenario"));
    const result = await getDemoRepairResult(scenario);
    const fixtures = getFixtureSources(scenario);
    return NextResponse.json({ result, fixtures, scenario, scenarios: DEMO_SCENARIOS });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      error instanceof Error ? error.message : "Failed to load demo repair";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    assertRateLimit({
      key: `repair-post:${clientIp(request)}`,
      limit: 8,
      windowMs: 60_000,
    });
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

    if (typeof beforeSpec !== "string" || typeof afterSpec !== "string") {
      return NextResponse.json({ error: "beforeSpec and afterSpec are required" }, { status: 400 });
    }
    if (beforeSpec.length > MAX_SPEC_CHARS || afterSpec.length > MAX_SPEC_CHARS) {
      return NextResponse.json({ error: "OpenAPI spec is too large" }, { status: 413 });
    }

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

    if (consumerFiles.length > MAX_FILES) {
      return NextResponse.json({ error: `At most ${MAX_FILES} consumer files are allowed` }, { status: 413 });
    }

    for (const file of consumerFiles) {
      if (!file?.path || typeof file.content !== "string") {
        return NextResponse.json(
          { error: "Each consumer file needs a path and content" },
          { status: 400 },
        );
      }
      if (file.content.length > MAX_FILE_CHARS) {
        return NextResponse.json({ error: `File ${file.path} is too large` }, { status: 413 });
      }
    }

    const result = await runRepair({ beforeSpec, afterSpec, consumerFiles });
    return NextResponse.json({ result });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      error instanceof Error ? error.message : "Repair engine failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
