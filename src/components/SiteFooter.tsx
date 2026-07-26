import Link from "next/link";

const columns = [
  {
    title: "Product",
    links: [
      { href: "/app", label: "Try on GitHub" },
      { href: "/demo", label: "Live demo" },
      { href: "/pricing", label: "Pricing" },
      { href: "/use-cases", label: "Use cases" },
      { href: "/#how", label: "How it works" },
    ],
  },
  {
    title: "Developers",
    links: [
      { href: "/docs", label: "Docs" },
      { href: "/changelog", label: "Changelog" },
      { href: "/security", label: "Security" },
      { href: "/api/health", label: "Status" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="relative z-10 border-t border-line bg-bg">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1.2fr_2fr]">
        <div>
          <p className="text-xl font-semibold lowercase tracking-tight">repairo</p>
          <p className="mt-3 max-w-xs text-sm text-muted">
            Self-maintaining APIs — Dependabot for OpenAPI. Detect, impact,
            apply on your GitHub.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/docs" className="text-sm text-muted hover:text-fg">
              Docs
            </Link>
            <Link href="/security" className="text-sm text-muted hover:text-fg">
              Security
            </Link>
            <Link href="/contact" className="text-sm text-muted hover:text-fg">
              Contact
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-medium text-fg">{col.title}</h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted transition hover:text-fg"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-line px-5 py-5 text-center text-xs text-muted-dim sm:px-8">
        © {new Date().getFullYear()} Repairo. Review every PR before merge.
      </div>
    </footer>
  );
}
