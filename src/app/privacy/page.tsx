import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import Link from "next/link";

export const metadata = {
  title: "Privacy — Repairo",
  description: "How Repairo handles your GitHub data.",
};

export default function PrivacyPage() {
  return (
    <div className="unkey-canvas min-h-screen">
      <SiteHeader />
      <main className="relative z-10 mx-auto max-w-3xl px-5 py-16 sm:px-8">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent-bright">
          Legal
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Privacy</h1>
        <div className="mt-8 space-y-4 text-sm leading-relaxed text-muted">
          <p>
            Repairo connects to GitHub with your permission to read OpenAPI
            specs and consumer code, and to open pull requests you request.
          </p>
          <p>
            We store your GitHub identity, an encrypted access token, workspace
            settings, integration configs, and repair run history. Tokens are
            encrypted at rest and used only to perform repairs and webhooks you
            enable.
          </p>
          <p>
            We do not sell your code or repository contents. Billing (if enabled)
            is processed by Stripe. You can disconnect by signing out and
            deleting integrations, or by revoking Repairo in GitHub Settings →
            Applications.
          </p>
          <p>
            Questions: open an issue on the project repo or contact the operator
            of your Repairo instance.
          </p>
        </div>
        <Link href="/" className="btn-ghost mt-10 inline-flex">
          Back home
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}
