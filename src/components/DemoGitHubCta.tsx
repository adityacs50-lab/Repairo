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
      className={`demo-github-cta${compact ? " !p-4" : ""}`}
      aria-labelledby="github-try-heading"
    >
      <p className="demo-github-cta__eyebrow">Use your own GitHub repo</p>
      <h2 id="github-try-heading" className="demo-github-cta__title">
        No terminal. No fixture required.
      </h2>
      <p className="demo-github-cta__lede">
        Workspace sign-in is optional. The fastest way to try Repairo on{" "}
        <strong className="font-medium text-fg">your</strong> code is to install our{" "}
        <strong className="font-medium text-fg">GitHub App</strong> — when a pull request
        changes an OpenAPI spec, we comment with breaking changes and can open a
        compile-verified fix PR. No OAuth dashboard login required.
      </p>

      <ol className="demo-setup-grid">
        <li className="demo-setup-card">
          <span className="demo-setup-card__step">Step 1</span>
          <p className="demo-setup-card__title">Run the demo here</p>
          <p className="demo-setup-card__body">
            See diff → impact → patch on sample specs (below).
          </p>
        </li>
        <li className="demo-setup-card demo-setup-card--featured">
          <span className="demo-setup-card__step">Step 2 · recommended</span>
          <p className="demo-setup-card__title">Install the GitHub App</p>
          <p className="demo-setup-card__body">
            Pick repos → open a PR that touches{" "}
            <code className="text-fg">openapi.yaml</code> (or similar).
          </p>
          <div className="demo-setup-card__actions">
            <a
              href={GITHUB_APP_INSTALL_URL}
              className="btn-primary"
              target="_blank"
              rel="noopener noreferrer"
            >
              Install on GitHub
            </a>
          </div>
        </li>
        <li className="demo-setup-card">
          <span className="demo-setup-card__step">Step 3 · optional</span>
          <p className="demo-setup-card__title">Workspace Quick Repair</p>
          <p className="demo-setup-card__body">
            One-click repair PR from the browser when OAuth is enabled on our server.
          </p>
          <div className="demo-setup-card__actions">
            {oauthConfigured ? (
              <a href="/api/auth/github" className="btn-ghost">
                Continue with GitHub
              </a>
            ) : (
              <p className="text-xs text-warn">
                Workspace sign-in is not configured on this deployment yet — use the GitHub App
                (step 2) or the{" "}
                <Link href="/docs#github-app" className="text-link underline">
                  self-hosted app
                </Link>{" "}
                docs.
              </p>
            )}
          </div>
        </li>
      </ol>
    </section>
  );
}
