import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage, Section } from "@/components/ContentPage";
import { ContactForm } from "@/components/ContactForm";

export const metadata: Metadata = {
  title: "Contact — Repairo",
  description:
    "Enterprise, security reviews, and design-partner questions for Repairo.",
};

export default function ContactPage() {
  return (
    <ContentPage
      eyebrow="Support"
      title="Contact"
      description="Self-serve for most teams. Enterprise and security reviews welcome a direct line."
      activeHref="/contact"
      cta={{ href: "/app", label: "Or just open the app" }}
    >
      <Section title="When to reach out">
        <ul className="space-y-2">
          <li className="flex gap-2">
            <span className="mt-1.5 h-1 w-1 shrink-0 bg-fg" />
            <span>Pro / multi-repo rollout questions before purchase</span>
          </li>
          <li className="flex gap-2">
            <span className="mt-1.5 h-1 w-1 shrink-0 bg-fg" />
            <span>Security questionnaires & vendor reviews</span>
          </li>
          <li className="flex gap-2">
            <span className="mt-1.5 h-1 w-1 shrink-0 bg-fg" />
            <span>Design-partner feedback and feature requests</span>
          </li>
        </ul>
        <p>
          For product how-to, start with{" "}
          <Link href="/docs" className="text-fg underline">
            Docs
          </Link>{" "}
          and the{" "}
          <Link href="/demo" className="text-fg underline">
            live demo
          </Link>
          .
        </p>
      </Section>

      <Section title="Send a message">
        <ContactForm />
      </Section>
    </ContentPage>
  );
}
