import type { Metadata } from "next";
import { ContentPage, Section } from "@/components/ContentPage";

export const metadata: Metadata = {
  title: "Terms — Repairo",
  description: "Terms of use for Repairo.",
};

export default function TermsPage() {
  return (
    <ContentPage
      eyebrow="Legal"
      title="Terms"
      description="Early-access terms for using Repairo to open repair pull requests."
      activeHref="/terms"
    >
      <Section title="Service">
        <p>
          Repairo is provided as an early-access product to help you detect
          OpenAPI drift and open repair pull requests. You remain responsible
          for reviewing every PR before merge.
        </p>
      </Section>
      <Section title="Automated patches">
        <p>
          Patches are best-effort and deterministic for supported patterns (URL
          bumps, required fields, enum renames in TypeScript consumers). They
          may not cover every breaking change in your stack.
        </p>
      </Section>
      <Section title="Billing">
        <p>
          Free plan includes limited integrations and monthly runs. Paid plans
          (when configured) are billed via Stripe. You may stop using Repairo at
          any time and revoke GitHub access.
        </p>
      </Section>
      <Section title="Disclaimer">
        <p>
          The service is provided “as is” without warranty. Do not use
          auto-merge without CI and human review on production repositories.
        </p>
      </Section>
    </ContentPage>
  );
}
