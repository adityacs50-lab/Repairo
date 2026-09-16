"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

const ANCHORS = [
  { href: "#workflow", label: "How it works" },
  { href: "#providers", label: "Providers" },
  { href: "#security", label: "Security" },
] as const;

export function MarketingHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link href="/" className="wordmark" aria-label="Repairo AI home">
          <span style={{ fontFamily: '"Pixelify Sans", monospace' }}>Repairo</span>
          <span className="wordmark-ai" style={{ fontFamily: '"Figtree", sans-serif' }}>AI</span>
        </Link>

        <nav className="main-nav" aria-label="Main navigation">
          {ANCHORS.map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
          <Link href="/pricing">Pricing</Link>
        </nav>

        <div className="header-actions">
          <Link className="button button-dark button-small header-cta" href="/demo">
            Try demo <span aria-hidden="true" className="arrow-mark">↗</span>
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
