"use client";

import Link from "next/link";

const GITHUB_APP_INSTALL_URL = `https://github.com/apps/${
  process.env.NEXT_PUBLIC_GITHUB_APP_SLUG?.trim() || "repairo-ai"
}/installations/new`;

type Props = {
  /** When false, hide the OAuth workspace row (e.g. server not configured). */
  oauthConfigured?: boolean;
  compact?: boolean;
};

/**
 * Visual path for users who will never touch the CLI: demo first, then GitHub App
 * (works without workspace OAuth), then optional workspace sign-in for Quick Repair.
 */
export function DemoGitHubCta({ oauthConfigured = true, compact = false }: Props) {
  return (
    <section
      className={`border border-line bg-bg-panel ${compact ? "p-4" : "p-5 sm:p-6"}`}
      aria-labelledby="github-try-heading"
    >
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent-bright">
        Use your own GitHub repo
      </p>
      <h2
        id="github-try-heading"
        className={`mt-2 font-semibold text-fg ${compact ? "text-lg" : "text-xl sm:text-2xl"}`}
      >
        No terminal. No fixture required.
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-muted leading-relaxed">
        Workspace sign-in is optional. The fastest way to try Repairo on{" "}
        <strong className="font-medium text-fg">your</strong> code is to install our{" "}
        <strong className="font-medium text-fg">GitHub App</strong> — when a pull request
        changes an OpenAPI spec, we comment with breaking changes and can open a
        compile-verified fix PR. No OAuth dashboard login required.
      </p>

      <ol className="mt-5 grid gap-3 sm:grid-cols-3">
        <li className="border border-line bg-bg p-4">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-dim">
            Step 1
          </span>
          <p className="mt-1 text-sm font-medium text-fg">Run the demo here</p>
          <p className="mt-1 text-xs text-muted">
            See diff → impact → patch on sample specs (below).
          </p>
        </li>
        <li className="border border-accent/30 bg-accent/5 p-4">
          <span className="font-mono text-[10px] uppercase tracking-wider text-accent-bright">
            Step 2 · recommended
          </span>
          <p className="mt-1 text-sm font-medium text-fg">Install the GitHub App</p>
          <p className="mt-1 text-xs text-muted">
            Pick repos → open a PR that touches{" "}
            <code className="text-fg">openapi.yaml</code> (or similar).
          </p>
          <a
            href={GITHUB_APP_INSTALL_URL}
            className="btn-primary mt-3 inline-flex !py-2 !text-sm"
            target="_blank"
            rel="noopener noreferrer"
          >
            Install on GitHub
          </a>
        </li>
        <li className="border border-line bg-bg p-4">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-dim">
            Step 3 · optional
          </span>
          <p className="mt-1 text-sm font-medium text-fg">Workspace Quick Repair</p>
          <p className="mt-1 text-xs text-muted">
            One-click repair PR from the browser when OAuth is enabled on our server.
          </p>
          {oauthConfigured ? (
            <a href="/api/auth/github" className="btn-ghost mt-3 inline-flex !py-2 !text-sm">
              Continue with GitHub
            </a>
          ) : (
            <p className="mt-3 text-xs text-warn">
              Workspace sign-in is not configured on this deployment yet — use the GitHub App
              (step 2) or the{" "}
              <Link href="/docs#github-app" className="text-link underline">
                self-hosted app
              </Link>{" "}
              docs.
            </p>
          )}
        </li>
      </ol>
    </section>
  );
}
