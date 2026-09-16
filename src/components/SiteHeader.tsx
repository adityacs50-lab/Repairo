"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

interface SiteHeaderProps {
  active?: string;
}

const NAV = [
  { href: "/demo", label: "Demo", key: "demo" },
  { href: "/docs", label: "Docs", key: "docs" },
  { href: "/pricing", label: "Pricing", key: "pricing" },
  { href: "/security", label: "Security", key: "security" },
  { href: "/changelog", label: "Changelog", key: "changelog" },
];

export function SiteHeader({ active }: SiteHeaderProps = {}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="site-header site-header--warp">
      <div className="header-inner">
        <Link href="/" className="wordmark" aria-label="Repairo AI home">
          <span style={{ fontFamily: '"Pixelify Sans", monospace' }}>Repairo</span>
          <span className="wordmark-ai" style={{ fontFamily: "var(--font-sans)" }}>
            AI
          </span>
        </Link>

        <nav className="main-nav" aria-label="Main navigation">
          {NAV.map((item) =>
            active === item.key ? (
              <span key={item.key} className="nav-current" aria-current="page">
                {item.label.toLowerCase()}
              </span>
            ) : (
              <Link key={item.key} href={item.href}>
                {item.label.toLowerCase()}
              </Link>
            ),
          )}
          <Link href="/app">app</Link>
        </nav>

        <div className="header-actions">
          {active !== "demo" ? (
            <Link className="button button-dark button-small header-cta header-cta--warp" href="/demo">
              get started
              <span aria-hidden="true" className="header-cta-caret">^</span>
            </Link>
          ) : null}
          <button
            type="button"
            className="header-menu-btn"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-label="Toggle menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {mobileMenuOpen ? (
        <div className="header-mobile-panel">
          {NAV.map((item) =>
            active === item.key ? (
              <span key={item.key} className="nav-current" aria-current="page">
                {item.label}
              </span>
            ) : (
              <Link
                key={item.key}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ),
          )}
          <Link href="/app" onClick={() => setMobileMenuOpen(false)}>Workspace</Link>
          {active !== "demo" ? (
            <Link href="/demo" onClick={() => setMobileMenuOpen(false)}>
              Try demo
            </Link>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}
