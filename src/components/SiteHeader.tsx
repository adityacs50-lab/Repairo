"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

interface SiteHeaderProps {
  active?: string;
}

const NAV = [
  { href: "/docs", label: "Docs", key: "docs" },
  { href: "/pricing", label: "Pricing", key: "pricing" },
  { href: "/security", label: "Security", key: "security" },
  { href: "/changelog", label: "Changelog", key: "changelog" },
];

export function SiteHeader({ active }: SiteHeaderProps = {}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link href="/" className="wordmark" aria-label="Repairo AI home">
          <span style={{ fontFamily: '"Pixelify Sans", monospace' }}>Repairo</span>
          <span className="wordmark-ai" style={{ fontFamily: '"Figtree", sans-serif' }}>
            AI
          </span>
        </Link>

        <nav className="main-nav" aria-label="Main navigation">
          {NAV.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={active === item.key ? "nav-active" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="header-actions">
          <Link className="button button-dark button-small" href="/#demo">
            Book a demo <span aria-hidden="true" className="arrow-mark">↗</span>
          </Link>
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
          {NAV.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className={active === item.key ? "nav-active" : undefined}
            >
              {item.label}
            </Link>
          ))}
          <Link href="/#demo" onClick={() => setMobileMenuOpen(false)}>
            Book a demo
          </Link>
        </div>
      ) : null}
    </header>
  );
}
