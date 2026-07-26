import { NextResponse } from "next/server";
import { AuthError } from "@/lib/auth/session";
import { GitHubError } from "@/lib/github/client";
import { githubConfigured } from "@/lib/auth/config";

export function jsonError(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof GitHubError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (!githubConfigured()) {
    return NextResponse.json(
      {
        error:
          "GitHub OAuth is not configured. Set GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, and SESSION_SECRET.",
      },
      { status: 503 },
    );
  }
  const message = error instanceof Error ? error.message : "Request failed";
  return NextResponse.json({ error: message }, { status: 400 });
}

export function requireGithubConfig() {
  if (!githubConfigured()) {
    throw new AuthError(
      "GitHub OAuth is not configured. Set GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, and SESSION_SECRET.",
      503,
    );
  }
}
