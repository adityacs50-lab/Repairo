import Link from "next/link";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

const defaultNav = [
  { href: "/docs", label: "Docs" },
  { href: "/agents", label: "Agents" },
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

export type NavItem = { href: string; label: string };
export type NavGroup = { title: string; items: NavItem[] };

export function ContentPage({
  eyebrow,
  title,
  description,
  children,
  activeHref,
  wide = false,
  cta,
  customNav,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
  activeHref?: string;
  wide?: boolean;
  cta?: { href: string; label: string };
  customNav?: NavGroup[];
}) {
  return (
    <div className="bg-canvas text-body min-h-screen">
      <SiteHeader active={headerActive(activeHref)} />
      <div className="relative z-10 mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:block sticky top-24 h-fit max-h-[calc(100vh-8rem)] overflow-y-auto pr-4 scrollbar-hide">
          {customNav ? (
            <div className="space-y-8">
              {customNav.map((group, i) => (
                <div key={i}>
                  <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-charcoal mb-3">
                    {group.title}
                  </p>
                  <nav className="space-y-1">
                    {group.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`block px-3 py-1.5 text-sm transition rounded-lg ${
                          activeHref === item.href
                            ? "bg-surface-elevated text-ink border border-hairline"
                            : "text-mute hover:text-ink hover:bg-surface-deep border border-transparent"
                        }`}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </nav>
                </div>
              ))}
            </div>
          ) : (
            <>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-charcoal">
                Explore
              </p>
              <nav className="mt-4 space-y-1">
                {defaultNav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`block px-3 py-1.5 text-sm transition rounded-lg ${
                      activeHref === item.href
                        ? "bg-surface-elevated text-ink border border-hairline"
                        : "text-mute hover:text-ink hover:bg-surface-deep border border-transparent"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
                <div className="my-3 h-[1px] bg-hairline-strong opacity-50" />
                {legalNav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`block px-3 py-1.5 text-sm transition rounded-lg ${
                      activeHref === item.href
                        ? "bg-surface-elevated text-ink border border-hairline"
                        : "text-mute hover:text-ink hover:bg-surface-deep border border-transparent"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </>
          )}
        </aside>

        <main className={wide ? "max-w-4xl" : "max-w-3xl"}>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-charcoal">
            {eyebrow}
          </p>
          <h1 className="mt-3 text-3xl font-medium font-display tracking-tight text-ink sm:text-4xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-4 text-base leading-relaxed text-mute sm:text-lg">
              {description}
            </p>
          ) : null}

          <div className="mt-10 space-y-10">{children}</div>

          {cta ? (
            <Link href={cta.href} className="mt-12 inline-flex items-center gap-2 bg-ink text-primary-on font-medium text-sm px-6 py-3 rounded-full hover:bg-body transition-colors">
              {cta.label}
            </Link>
          ) : (
            <Link href="/" className="mt-12 inline-flex items-center gap-2 bg-surface-elevated text-ink font-medium text-sm px-6 py-3 rounded-full hover:bg-surface-deep border border-hairline transition-colors">
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
      className="scroll-mt-24 border-t border-hairline pt-8 first:border-t-0 first:pt-0"
    >
      <h2 className="text-xl font-medium font-display tracking-tight text-ink mb-4">{title}</h2>
      <div className="mt-4 space-y-4 text-sm leading-relaxed text-mute">
        {children}
      </div>
    </section>
  );
}

export function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3 mt-4">
      {items.map((item) => (
        <li key={item} className="flex gap-3 items-start">
          <span className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 bg-charcoal" />
          <span className="text-mute">{item}</span>
        </li>
      ))}
    </ul>
  );
}
