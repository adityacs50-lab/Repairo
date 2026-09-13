import React from "react";
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer section-rule">
      <div>
        <Link href="/" className="wordmark" aria-label="Repairo AI home">
          <span style={{ fontFamily: '"Pixelify Sans", monospace' }}>Repairo</span>
          <span className="wordmark-ai" style={{ fontFamily: '"Figtree", sans-serif' }}>
            AI
          </span>
        </Link>
        <p className="footer-note">API change. Impact. Repair. Verified.</p>
      </div>
      <div className="footer-links">
        <div>
          <p className="mono-label">Product</p>
          <Link href="/docs">Docs</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/security">Security</Link>
          <Link href="/changelog">Changelog</Link>
        </div>
        <div>
          <p className="mono-label">Get started</p>
          <Link href="/#demo">Book a demo</Link>
          <Link href="/#waitlist">Beta waitlist</Link>
          <Link href="/contact">Contact</Link>
          <a
            href="https://www.npmjs.com/package/repairo-cli"
            rel="noreferrer"
            target="_blank"
          >
            npm
          </a>
        </div>
      </div>
    </footer>
  );
}
