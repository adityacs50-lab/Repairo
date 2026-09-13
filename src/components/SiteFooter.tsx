import React from "react";
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="w-full bg-white border-t border-slate-200/80 py-12 px-6 md:px-12 text-xs text-slate-500 font-sans">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-10">
        {/* Brand Column */}
        <div className="space-y-3">
          <Link href="/" className="hover:opacity-85 transition-opacity inline-flex items-center gap-1.5">
            <span className="text-lg font-bold tracking-tight text-slate-900">Repairo</span>
            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100">
              AI
            </span>
          </Link>
          <div className="text-[10px] font-mono tracking-wider text-slate-400 uppercase">
            AST-BASED CODE MIGRATION &amp; DEPENDENCY REPAIRS
          </div>
          <div className="text-slate-400 text-xs pt-2">
            © {new Date().getFullYear()} Repairo, Inc. All rights reserved.
          </div>
        </div>

        {/* Navigation Links Columns Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 md:gap-16">
          {/* Product */}
          <div className="space-y-3">
            <div className="font-semibold text-slate-900 text-xs uppercase font-mono tracking-wider">Product</div>
            <ul className="space-y-2">
              <li>
                <Link href="/#architecture" className="hover:text-slate-900 transition-colors">
                  Architecture
                </Link>
              </li>
              <li>
                <Link href="/docs" className="hover:text-slate-900 transition-colors">
                  Docs
                </Link>
              </li>
              <li>
                <Link href="/changelog" className="hover:text-slate-900 transition-colors">
                  Changelog
                </Link>
              </li>
              <li>
                <Link href="/security" className="hover:text-slate-900 transition-colors">
                  Security
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div className="space-y-3">
            <div className="font-semibold text-slate-900 text-xs uppercase font-mono tracking-wider">Resources</div>
            <ul className="space-y-2">
              <li>
                <Link href="/demo" className="hover:text-slate-900 transition-colors">
                  Open Source Demo
                </Link>
              </li>
              <li>
                <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-slate-900 transition-colors">
                  GitHub Action
                </a>
              </li>
              <li>
                <Link href="/status" className="hover:text-slate-900 transition-colors">
                  Status
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-3">
            <div className="font-semibold text-slate-900 text-xs uppercase font-mono tracking-wider">Legal</div>
            <ul className="space-y-2">
              <li>
                <Link href="/privacy" className="hover:text-slate-900 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-slate-900 transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
