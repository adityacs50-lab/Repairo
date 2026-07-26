import Link from "next/link";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

const defaultNav = [
  { href: "/docs", label: "Docs" },
  { href: "/changelog", label: "Changelog" },
  { href: "/security", label: "Security" },
  { href: "/use-cases", label: "Use cases" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
] as const;

const legalNav = [
  { href: "/pricing", label: "Pricing" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
] as const;

function headerActive(
  href?: string,
): "home" | "demo" | "app" | "pricing" | "docs" | undefined {
  if (href === "/docs") return "docs";
  if (href === "/pricing") return "pricing";
  return undefined;
}

export function ContentPage({
  eyebrow,
  title,
  description,
  children,
  activeHref,
  wide = false,
  cta,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
  activeHref?: string;
  wide?: boolean;
  cta?: { href: string; label: string };
}) {
  return (
    <div className="unkey-canvas min-h-screen">
      <SiteHeader active={headerActive(activeHref)} />
      <div className="relative z-10 mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[200px_1fr]">
        <aside className="hidden lg:block">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-dim">
            Explore
          </p>
          <nav className="mt-4 space-y-1">
            {defaultNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-2 py-1.5 text-sm transition ${
                  activeHref === item.href
                    ? "bg-fg text-bg"
                    : "text-muted hover:text-fg"
                }`}
              >
                {item.label}
              </Link>
            ))}
            <div className="my-3 h-px bg-line" />
            {legalNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-2 py-1.5 text-sm transition ${
                  activeHref === item.href
                    ? "bg-fg text-bg"
                    : "text-muted hover:text-fg"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <main className={wide ? "max-w-4xl" : "max-w-3xl"}>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-dim">
            {eyebrow}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">
              {description}
            </p>
          ) : null}

          <div className="mt-10 space-y-10">{children}</div>

          {cta ? (
            <Link href={cta.href} className="btn-primary mt-12 inline-flex">
              {cta.label}
            </Link>
          ) : (
            <Link href="/" className="btn-ghost mt-12 inline-flex">
              Back home
            </Link>
          )}
        </main>
      </div>
      <SiteFooter />
    </div>
  );
}

export function Section({
  title,
  children,
  id,
}: {
  title: string;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-24 border-t border-line pt-8 first:border-t-0 first:pt-0"
    >
      <h2 className="text-xl font-semibold tracking-tight text-fg">{title}</h2>
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted">
        {children}
      </div>
    </section>
  );
}

export function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <span className="mt-1.5 h-1 w-1 shrink-0 bg-fg" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
