import { ContentPage, Section } from "@/components/ContentPage";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Terms of Service",
  description:
    "Terms of use for the Repairo CLI and hosted service.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <ContentPage
      eyebrow="Legal"
      title="Terms of Service"
      description="By using Repairo, you agree to these terms. Please read them carefully."
      activeHref="/terms"
    >
      <Section title="1. Acceptance of Terms">
        <p>
          By accessing or using Repairo, you agree to be bound by these Terms of Service. If you do not agree to all the terms and conditions of this agreement, you may not access the website or use any services.
        </p>
      </Section>
      <Section title="2. The Service">
        <p>
          Repairo is a developer tool that analyzes OpenAPI specifications and your source code to generate automated refactoring Pull Requests. We provide the service on a "best-effort" basis. While our AST (Abstract Syntax Tree) engine is highly deterministic for supported patterns in TypeScript, it may not catch every possible breaking change or edge case in your application logic.
        </p>
      </Section>
      <Section title="3. User Responsibility & Liability">
        <p>
          <strong>You remain fully responsible for your codebase.</strong>
        </p>
        <p>
          Repairo generates Pull Requests, but you are solely responsible for reviewing, testing, and verifying the generated code before merging it into your main branch. We strongly advise against using auto-merge features without comprehensive CI/CD test coverage.
        </p>
        <p>
          In no event shall Repairo, its directors, employees, or agents, be liable to you for any direct, indirect, incidental, special, punitive, or consequential damages resulting from (a) errors, mistakes, or inaccuracies of our generated patches, (b) personal injury or property damage resulting from your access to our service, or (c) any bugs, viruses, or trojan horses that may be transmitted to or through our service by any third party.
        </p>
      </Section>
      <Section title="4. Billing and Subscriptions">
        <p>
          Certain features of Repairo (such as multiple repositories, auto-merge workflows, and scheduled scans) require a paid subscription. You will be billed in advance on a recurring basis. All payments are securely processed via Stripe.
        </p>
        <p>
          You may cancel your subscription at any time. There are no refunds for partially used billing periods, but you will retain access to the paid features until the end of your current billing cycle.
        </p>
      </Section>
      <Section title="5. Termination">
        <p>
          We may terminate or suspend access to our service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms. All provisions of the Terms which by their nature should survive termination shall survive, including ownership provisions, warranty disclaimers, indemnity, and limitations of liability.
        </p>
      </Section>
    </ContentPage>
  );
}
