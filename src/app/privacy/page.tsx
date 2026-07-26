import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage, Section } from "@/components/ContentPage";

export const metadata: Metadata = {
  title: "Privacy — Repairo",
  description: "How Repairo handles your GitHub data.",
};

export default function PrivacyPage() {
  return (
    <ContentPage
      eyebrow="Legal"
      title="Privacy"
      description="What we collect when you connect GitHub, and what we don’t do with it."
      activeHref="/privacy"
    >
      <Section title="Data we process">
        <p>
          Repairo connects to GitHub with your permission to read OpenAPI specs
          and consumer code, and to open pull requests you request.
        </p>
        <p>
          We store your GitHub identity, an encrypted access token, workspace
          settings, integration configs, and repair run history. Tokens are
          encrypted at rest and used only to perform repairs and webhooks you
          enable.
        </p>
      </Section>
      <Section title="What we don’t do">
        <p>
          We do not sell your code or repository contents. Billing (if enabled)
          is processed by Stripe. You can disconnect by signing out and deleting
          integrations, or by revoking Repairo in GitHub Settings → Applications.
        </p>
      </Section>
      <Section title="Questions">
        <p>
          See{" "}
          <Link href="/security" className="text-fg underline">
            Security
          </Link>{" "}
          for architecture detail, or{" "}
          <Link href="/contact" className="text-fg underline">
            Contact
          </Link>{" "}
          us.
        </p>
      </Section>
    </ContentPage>
  );
}
