import React from "react";
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="w-full bg-canvas border-t border-hairline py-12 px-6 md:px-12 text-xs text-mute font-sans">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-12">
        {/* Brand Column */}
        <div className="space-y-4">
          <div className="text-ink font-semibold text-base tracking-tight font-display flex items-center gap-2">
            <img src="/logo.jpg" alt="Repairo AI Logo" className="h-6 w-auto object-contain rounded" />
            <span>Repairo</span>
          </div>
          <div className="text-charcoal">
            © {new Date().getFullYear()} Repairo, Inc.
          </div>
          <div className="text-charcoal">
            <a href="mailto:info@heyrepairo.in" className="hover:text-ink transition-colors">info@heyrepairo.in</a>
          </div>
        </div>

        {/* Links Columns Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 md:gap-16">
          {/* Product */}
          <div className="space-y-3">
            <div className="font-medium text-ink">Product</div>
            <ul className="space-y-2">
              <li><Link href="/#features" className="hover:text-ink transition-colors">Features</Link></li>
              <li><Link href="/pricing" className="hover:text-ink transition-colors">Pricing</Link></li>
              <li><Link href="/security" className="hover:text-ink transition-colors">Security</Link></li>
            </ul>
          </div>

          {/* Resources */}
          <div className="space-y-3">
            <div className="font-medium text-ink">Resources</div>
            <ul className="space-y-2">
              <li><Link href="/docs" className="hover:text-ink transition-colors">Documentation</Link></li>
              <li><Link href="/docs#integrations" className="hover:text-ink transition-colors">Integrations</Link></li>
              <li><Link href="/blog" className="hover:text-ink transition-colors">Blog</Link></li>
              <li><Link href="/changelog" className="hover:text-ink transition-colors">Changelog</Link></li>
            </ul>
          </div>

          {/* Community */}
          <div className="space-y-3">
            <div className="font-medium text-ink">Community</div>
            <ul className="space-y-2">
              <li><a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-ink transition-colors">GitHub</a></li>
              <li><a href="https://x.com/Repairoai" target="_blank" rel="noreferrer" className="hover:text-ink transition-colors">Twitter (X)</a></li>
              <li><a href="https://discord.com" target="_blank" rel="noreferrer" className="hover:text-ink transition-colors">Discord</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-3">
            <div className="font-medium text-ink">Legal</div>
            <ul className="space-y-2">
              <li><Link href="/privacy" className="hover:text-ink transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-ink transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
