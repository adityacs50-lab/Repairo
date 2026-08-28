import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BulletList, ContentPage, Section } from "@/components/ContentPage";
import { getVendor, listVendors } from "@/lib/catalog/vendors";
import { JsonLd } from "@/components/JsonLd";
import { absoluteUrl, breadcrumbJsonLd, pageMetadata, softwareApplicationJsonLd } from "@/lib/seo";

type Props = { params: Promise<{ vendorId: string }> };

export function generateStaticParams() {
  return listVendors().map((v) => ({ vendorId: v.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { vendorId } = await params;
  const vendor = getVendor(vendorId);
  if (!vendor) return { title: "Agent not found", robots: { index: false } };
  return pageMetadata({
    title: `${vendor.name} update agent`,
    description: `${vendor.description} Repairo watches the ${vendor.name} OpenAPI spec and opens compiler-validated AST repair PRs when breaking changes ship.`,
    path: `/agents/${vendor.id}`,
    keywords: [`${vendor.name} breaking changes`, `${vendor.name} SDK migration`, ...vendor.tags],
  });
}

export default async function VendorAgentPage({ params }: Props) {
  const { vendorId } = await params;
  const vendor = getVendor(vendorId);
  if (!vendor) notFound();

  return (
    <>
    <JsonLd
      data={[
        softwareApplicationJsonLd({
          name: `Repairo ${vendor.name} update agent`,
          description: vendor.description,
          url: absoluteUrl(`/agents/${vendor.id}`),
        }),
        breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Vendor agents", path: "/agents" },
          { name: vendor.name, path: `/agents/${vendor.id}` },
        ]),
      ]}
    />
    <ContentPage
      eyebrow="Install agent"
      title={`${vendor.name} update agent`}
      description={vendor.description}
      activeHref="/agents"
      cta={{
        href: `/app?tab=agents&vendor=${vendor.id}`,
        label: `Install ${vendor.name} in your workspace`,
      }}
    >
      <Section title="What it does">
        <BulletList
          items={[
            vendor.openapiUrl
              ? `Fetches ${vendor.name} OpenAPI from the public spec URL`
              : `${vendor.name} has no public spec — bring your own from your repo`,
            "Scans your GitHub repo for TypeScript / JS / Python clients",
            "Diffs against the last-seen baseline when the contract moves",
            "Opens a reviewable repair PR — never auto-merges",
          ]}
        />
      </Section>

      <Section title="OpenAPI source">
        {vendor.openapiUrl ? (
          <>
            <p className="break-all font-mono text-xs text-fg">{vendor.openapiUrl}</p>
            {vendor.previousOpenapiUrl ? (
              <p className="mt-2 text-sm">
                First install can seed a previous pin for an immediate demo diff.
              </p>
            ) : (
              <p className="mt-2 text-sm">
                Baseline starts at live. Cron / Run now picks up the next vendor
                publish.
              </p>
            )}
          </>
        ) : (
          <p className="text-sm">
            {vendor.name} doesn&apos;t publish a public OpenAPI 3 spec, so this
            agent can&apos;t watch it remotely. Point a manual integration at a
            spec file in your own repo instead.
          </p>
        )}
        <p className="mt-3">
          <a
            href={vendor.homepage}
            target="_blank"
            rel="noreferrer"
            className="text-fg underline"
          >
            {vendor.name} documentation
          </a>
        </p>
      </Section>

      <Section title="How to install">
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            Sign in at{" "}
            <Link href="/app" className="text-fg underline">
              /app
            </Link>{" "}
            with GitHub.
          </li>
          <li>
            Open{" "}
            <Link
              href={`/app?tab=agents&vendor=${vendor.id}`}
              className="text-fg underline"
            >
              Vendor agents
            </Link>{" "}
            — {vendor.name} is preselected.
          </li>
          <li>Pick the customer repo → Scan → Install agent → Run now.</li>
        </ol>
      </Section>

      <Section title="Also available">
        <p>
          Prefer the neutral plane across vendors? Browse all agents on{" "}
          <Link href="/agents" className="text-fg underline">
            /agents
          </Link>
          .
        </p>
      </Section>
    </ContentPage>
    </>
  );
}
