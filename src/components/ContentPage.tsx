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
): "home" | "demo" | "app" | "pricing" | "docs" | "security" | undefined {
  if (href === "/docs") return "docs";
  if (href === "/pricing") return "pricing";
  if (href === "/security") return "security";
  return undefined;
}

export type NavItem = { href: string; label: string };
export type NavGroup = { title: string; items: NavItem[] };

function SideLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active?: boolean;
}) {
  return (
    <Link href={href} className={`content-side-link${active ? " is-active" : ""}`}>
      {label}
    </Link>
  );
}

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
    <div className="site-shell">
      <SiteHeader active={headerActive(activeHref)} />

      <div className={`content-layout${wide ? " content-layout-wide" : ""}`}>
        <aside className="content-aside">
          {customNav ? (
            <div className="content-aside-groups">
              {customNav.map((group) => (
                <div key={group.title} className="content-aside-group">
                  <p className="mono-label">{group.title}</p>
                  <nav className="content-aside-nav">
                    {group.items.map((item) => (
                      <SideLink
                        key={item.href}
                        href={item.href}
                        label={item.label}
                        active={activeHref === item.href}
                      />
                    ))}
                  </nav>
                </div>
              ))}
            </div>
          ) : (
            <>
              <p className="mono-label">Explore</p>
              <nav className="content-aside-nav">
                {defaultNav.map((item) => (
                  <SideLink
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    active={activeHref === item.href}
                  />
                ))}
              </nav>
              <div className="content-aside-rule" />
              <nav className="content-aside-nav">
                {legalNav.map((item) => (
                  <SideLink
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    active={activeHref === item.href}
                  />
                ))}
              </nav>
            </>
          )}
        </aside>

        <main className="content-main">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="content-title">{title}</h1>
          {description ? <p className="content-lede">{description}</p> : null}

          <div className="content-body">{children}</div>

          {cta ? (
            <Link href={cta.href} className="button button-dark content-cta">
              {cta.label}
              <span aria-hidden="true" className="arrow-mark">
                ↗
              </span>
            </Link>
          ) : (
            <Link href="/" className="button button-light content-cta">
              Back home
              <span aria-hidden="true" className="arrow-mark">
                ↗
              </span>
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
    <section id={id} className="content-section">
      <h2>{title}</h2>
      <div className="content-section-body">{children}</div>
    </section>
  );
}

export function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="content-bullets">
      {items.map((item) => (
        <li key={item}>
          <span className="content-bullet-dot" aria-hidden="true" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
