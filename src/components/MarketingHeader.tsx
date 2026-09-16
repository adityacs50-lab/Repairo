"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

const ANCHORS = [
  { href: "#workflow", label: "How it works" },
  { href: "#providers", label: "Providers" },
  { href: "#security", label: "Security" },
] as const;

type MarketingHeaderProps = {
  /** Light grid layout matching current warp.dev marketing */
  variant?: "default" | "warp";
};

export function MarketingHeader({ variant = "default" }: MarketingHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const warp = variant === "warp";

  return (
    <header className={`site-header${warp ? " site-header--warp" : ""}`}>
      <div className="header-inner">
        <Link href="/" className="wordmark" aria-label="Repairo AI home">
          <span style={{ fontFamily: '"Pixelify Sans", monospace' }}>Repairo</span>
          <span className="wordmark-ai" style={{ fontFamily: "var(--font-sans)" }}>AI</span>
        </Link>

        <nav className="main-nav" aria-label="Main navigation">
          {ANCHORS.map((item) => (
            <a key={item.href} href={item.href}>
              {warp ? item.label.toLowerCase() : item.label}
            </a>
          ))}
          <Link href="/pricing">{warp ? "pricing" : "Pricing"}</Link>
          <Link href="/docs">{warp ? "docs" : "Docs"}</Link>
        </nav>

        <div className="header-actions">
          <Link
            className={`button button-dark button-small header-cta${warp ? " header-cta--warp" : ""}`}
            href="/demo"
          >
            {warp ? "get started" : "Try demo"}
            {warp ? (
              <span aria-hidden="true" className="header-cta-caret">^</span>
            ) : (
              <span aria-hidden="true" className="arrow-mark">↗</span>
            )}
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
          {ANCHORS.map((item) => (
            <a key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)}>
              {item.label}
            </a>
          ))}
          <Link href="/pricing" onClick={() => setMobileMenuOpen(false)}>Pricing</Link>
          <Link href="/docs" onClick={() => setMobileMenuOpen(false)}>Docs</Link>
          <Link href="/demo" onClick={() => setMobileMenuOpen(false)}>Try demo</Link>
        </div>
      ) : null}
    </header>
  );
}
