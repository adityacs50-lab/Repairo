import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import Link from "next/link";

export const metadata = {
  title: "Terms — Repairo",
  description: "Terms of use for Repairo.",
};

export default function TermsPage() {
  return (
    <div className="unkey-canvas min-h-screen">
      <SiteHeader />
      <main className="relative z-10 mx-auto max-w-3xl px-5 py-16 sm:px-8">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent-bright">
          Legal
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Terms</h1>
        <div className="mt-8 space-y-4 text-sm leading-relaxed text-muted">
          <p>
            Repairo is provided as an early-access product to help you detect
            OpenAPI drift and open repair pull requests. You remain responsible
            for reviewing every PR before merge.
          </p>
          <p>
            Automated patches are best-effort and deterministic for supported
            patterns (URL bumps, required fields, enum renames in TypeScript
            consumers). They may not cover every breaking change in your stack.
          </p>
          <p>
            Free plan includes limited integrations. Paid plans (when configured)
            are billed via Stripe. You may stop using Repairo at any time and
            revoke GitHub access.
          </p>
          <p>
            The service is provided “as is” without warranty. Do not use auto-merge
            without CI and human review on production repositories.
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
