import type { Metadata } from "next";
import Link from "next/link";
import { BulletList, ContentPage, Section } from "@/components/ContentPage";

export const metadata: Metadata = {
  title: "Security — Repairo",
  description:
    "GitHub permissions, data storage, encryption, and trust posture for Repairo.",
};

export default function SecurityPage() {
  return (
    <ContentPage
      eyebrow="Trust"
      title="Security & trust"
      description="Repairo needs repo access to open PRs. Here is exactly what we touch, store, and never do."
      activeHref="/security"
      cta={{ href: "/contact", label: "Ask a security question" }}
    >
      <Section title="GitHub access" id="github">
        <p>
          Repairo uses a GitHub <strong className="text-fg">OAuth App</strong>{" "}
          (not a GitHub App installation with org-wide defaults). Scopes:
        </p>
        <BulletList
          items={[
            "repo — read OpenAPI + consumer files; create branches and pull requests you request",
            "read:user — account identity for your Repairo profile",
          ]}
        />
        <p>
          You can revoke access anytime in GitHub → Settings → Applications. We
          never merge PRs for you.
        </p>
      </Section>

      <Section title="What we store" id="data">
        <BulletList
          items={[
            "GitHub user id, login, avatar, display name",
            "Encrypted GitHub access token (AES-256-GCM at rest)",
            "Workspace, members, integration configs, webhook secrets",
            "Repair run history (status, summary, PR URL, errors)",
            "Optional Stripe customer / subscription ids when billing is enabled",
          ]}
        />
        <p>
          Spec and consumer file contents are fetched for a repair, processed in
          memory for that job, and are not sold or used to train third-party
          models. See also{" "}
          <Link href="/privacy" className="text-fg underline">
            Privacy
          </Link>
          .
        </p>
      </Section>

      <Section title="Architecture" id="architecture">
        <BulletList
          items={[
            "UI on Vercel; API + SQLite on Railway (persistent volume)",
            "/api/* proxied to the backend — sessions set on the app domain",
            "GitHub and Stripe webhooks verified with HMAC signatures",
            "SESSION_SECRET / TOKEN_ENCRYPTION_KEY required in production",
          ]}
        />
      </Section>

      <Section title="Compliance roadmap" id="compliance">
        <p>
          Early access focuses on least-privilege OAuth, encrypted tokens, and
          audit events for workspace actions. Formal SOC 2 / ISO programs are
          on the roadmap for enterprise buyers — talk to us via{" "}
          <Link href="/contact" className="text-fg underline">
            Contact
          </Link>{" "}
          if you need a security questionnaire filled today.
        </p>
      </Section>

      <Section title="Responsible disclosure" id="disclosure">
        <p>
          Found a vulnerability? Email or message via{" "}
          <Link href="/contact" className="text-fg underline">
            Contact
          </Link>{" "}
          with steps to reproduce. Do not open public issues for sensitive
          reports.
        </p>
      </Section>
    </ContentPage>
  );
}
