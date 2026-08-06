import React from "react";
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="w-full bg-white border-t border-neutral-200 py-12 px-6 md:px-12 text-xs text-neutral-600">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-12">
        {/* Brand Column */}
        <div className="space-y-4">
          <div className="text-black font-semibold text-base tracking-tight">
            <span>Repairo</span>
          </div>
          <div className="text-neutral-400">
            © {new Date().getFullYear()} Repairo, Inc.
          </div>
          <div className="text-neutral-400">
            <a href="mailto:hello@heyrepairo.in" className="hover:text-black transition-colors">hello@heyrepairo.in</a>
          </div>
        </div>

        {/* Links Columns Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 md:gap-16">
          {/* Product */}
          <div className="space-y-3">
            <div className="font-semibold text-black">Product</div>
            <ul className="space-y-2">
              <li><Link href="#features" className="hover:text-black transition-colors">Features</Link></li>
              <li><Link href="/pricing" className="hover:text-black transition-colors">Pricing</Link></li>
              <li><Link href="/security" className="hover:text-black transition-colors">Security</Link></li>
            </ul>
          </div>

          {/* Resources */}
          <div className="space-y-3">
            <div className="font-semibold text-black">Resources</div>
            <ul className="space-y-2">
              <li><Link href="/docs" className="hover:text-black transition-colors">Documentation</Link></li>
              <li><Link href="/docs#integrations" className="hover:text-black transition-colors">Integrations</Link></li>
              <li><Link href="/blog" className="hover:text-black transition-colors">Blog</Link></li>
              <li><Link href="/changelog" className="hover:text-black transition-colors">Changelog</Link></li>
            </ul>
          </div>

          {/* Community */}
          <div className="space-y-3">
            <div className="font-semibold text-black">Community</div>
            <ul className="space-y-2">
              <li><a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-black transition-colors">GitHub</a></li>
              <li><a href="https://twitter.com" target="_blank" rel="noreferrer" className="hover:text-black transition-colors">Twitter (X)</a></li>
              <li><a href="https://discord.com" target="_blank" rel="noreferrer" className="hover:text-black transition-colors">Discord</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-3">
            <div className="font-semibold text-black">Legal</div>
            <ul className="space-y-2">
              <li><Link href="/privacy" className="hover:text-black transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-black transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
