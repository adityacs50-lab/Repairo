import Link from "next/link";
import type { ReactNode } from "react";
import { ContentPage, Section } from "@/components/ContentPage";
import { JsonLd } from "@/components/JsonLd";
import { DocsAsideNav } from "@/components/docs/DocsAsideNav";
import { DOCS_NAV } from "@/lib/docs-nav";
import { breadcrumbJsonLd, techDocumentationJsonLd } from "@/lib/seo";

export function DocsShell({
  title,
  description,
  children,
  activePath = "/docs",
  cta = { href: "/demo", label: "Try the live demo" },
}: {
  title: string;
  description: string;
  children: ReactNode;
  activePath?: string;
  cta?: { href: string; label: string };
}) {
  return (
    <>
      <JsonLd
        data={[
          techDocumentationJsonLd({
            title,
            description,
            path: activePath,
          }),
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Documentation", path: "/docs" },
            ...(activePath !== "/docs"
              ? [{ name: title, path: activePath }]
              : []),
          ]),
        ]}
      />
      <ContentPage
        eyebrow="Documentation"
        title={title}
        description={description}
        activeHref={activePath}
        cta={cta}
        asideSlot={<DocsAsideNav groups={DOCS_NAV} />}
      >
        {children}
      </ContentPage>
    </>
  );
}

export function DocsCommandTable({
  rows,
}: {
  rows: { command: string; summary: string }[];
}) {
  return (
    <div className="docs-table-wrap">
      <table className="docs-table">
        <thead>
          <tr>
            <th scope="col">Command</th>
            <th scope="col">What it does</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.command}>
              <td>
                <code className="docs-inline-code">{row.command}</code>
              </td>
              <td>{row.summary}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DocsRelatedLinks({
  links,
}: {
  links: { href: string; label: string; external?: boolean }[];
}) {
  return (
    <ul className="docs-related">
      {links.map((link) => (
        <li key={link.href}>
          {link.external ? (
            <a href={link.href} className="text-link" rel="noreferrer" target="_blank">
              {link.label} <span aria-hidden="true" className="arrow-mark">↗</span>
            </a>
          ) : (
            <Link href={link.href} className="text-link">
              {link.label} <span aria-hidden="true" className="arrow-mark">↗</span>
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}

export { Section };
