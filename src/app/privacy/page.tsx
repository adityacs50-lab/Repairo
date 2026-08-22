import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { ContentPage, Section } from "@/components/ContentPage";

export const metadata = pageMetadata({
  title: "Privacy Policy",
  description:
    "How Repairo handles your GitHub data and source code: in-memory processing, encrypted tokens, and no code retention.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <ContentPage
      eyebrow="Legal"
      title="Privacy Policy"
      description="We believe in zero-retention for source code. Here is exactly what we collect when you connect GitHub, and what we don’t do with it."
      activeHref="/privacy"
    >
      <Section title="1. Data Collection">
        <p>
          When you install the Repairo GitHub App or sign in via GitHub OAuth, we request specific permissions to operate the service. 
          We store your GitHub identity (username, email, avatar), an encrypted installation token, your workspace settings, 
          and the history of repair runs (metadata only, such as PR numbers and timestamps).
        </p>
        <p>
          If you upgrade to a paid tier, your payment information is collected and processed securely by Stripe. We do not store your credit card details on our servers.
        </p>
      </Section>
      <Section title="2. Zero-Retention Source Code Policy">
        <p>
          <strong>We do not store your source code.</strong> 
        </p>
        <p>
          When a webhook is triggered, Repairo clones your repository into a temporary, isolated, ephemeral runner. 
          We parse the Abstract Syntax Tree (AST), generate the repair patch, push the new branch to GitHub, and immediately destroy the runner and the clone. 
          Your proprietary code never rests on our databases or persistent storage volumes.
        </p>
      </Section>
      <Section title="3. Third-Party Sub-processors">
        <p>
          To provide the service, we share necessary data with trusted third parties:
        </p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li><strong>GitHub:</strong> For authentication and repository access.</li>
          <li><strong>Stripe:</strong> For subscription billing and payment processing.</li>
          <li><strong>Railway / Vercel:</strong> For hosting our infrastructure and ephemeral workers.</li>
        </ul>
      </Section>
      <Section title="4. Account Deletion">
        <p>
          You have the right to request the deletion of your data at any time. You can disconnect by signing out and deleting
          your workspace in the dashboard, or by revoking the Repairo app in your GitHub Settings. Upon deletion, all encrypted tokens and run metadata are permanently purged from our database.
        </p>
      </Section>
      <Section title="5. Contact Us">
        <p>
          If you have questions about this privacy policy, please check our{" "}
          <Link href="/security" className="text-ink underline decoration-hairline underline-offset-4">
            Security Overview
          </Link>{" "}
          or reach out to us at privacy@repairo.com.
        </p>
      </Section>
    </ContentPage>
  );
}
