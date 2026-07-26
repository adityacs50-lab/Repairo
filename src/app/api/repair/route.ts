import { NextResponse } from "next/server";
import { getDemoRepairResult, getFixtureSources } from "@/lib/demo";
import { runRepair } from "@/lib/engine";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = getDemoRepairResult();
    const fixtures = getFixtureSources();
    return NextResponse.json({ result, fixtures });
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
    };

    const fixtures = getFixtureSources();
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

    const result = runRepair({ beforeSpec, afterSpec, consumerFiles });
    return NextResponse.json({ result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Repair engine failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
