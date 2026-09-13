"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Menu, X } from "lucide-react";
import { cn } from "@/lib/cn";

interface SiteHeaderProps {
  active?: string;
}

export function SiteHeader({ active }: SiteHeaderProps = {}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="w-full bg-white/90 backdrop-blur-md border-b border-slate-200/80 py-4 px-6 md:px-12 sticky top-0 z-50 transition-colors font-sans"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="hover:opacity-85 transition-opacity flex items-center gap-1.5 group">
          <span className="text-xl font-bold tracking-tight text-slate-900 font-sans">
            Repairo
          </span>
          <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100 tracking-wide">
            AI
          </span>
        </Link>

        {/* Center Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8 text-xs md:text-sm font-medium text-slate-600">
          <Link
            href="/docs"
            className={cn("hover:text-slate-900 transition-colors", active === "docs" && "text-slate-900 font-semibold")}
          >
            Documentation
          </Link>
          <Link
            href="/#architecture"
            className={cn("hover:text-slate-900 transition-colors", active === "architecture" && "text-slate-900 font-semibold")}
          >
            Architecture
          </Link>
          <Link
            href="/#use-cases"
            className={cn("hover:text-slate-900 transition-colors", active === "use-cases" && "text-slate-900 font-semibold")}
          >
            Use Cases
          </Link>
          <Link
            href="/changelog"
            className={cn("hover:text-slate-900 transition-colors", active === "changelog" && "text-slate-900 font-semibold")}
          >
            Changelog
          </Link>
        </nav>

        {/* Right Action Button */}
        <div className="flex items-center gap-3">
          <Link
            href="/contact"
            className="hidden sm:inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2 rounded-full transition-all duration-150 shadow-sm hover:shadow active:scale-[0.98]"
          >
            <span>Book a demo</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
          </Link>

          {/* Mobile Hamburger Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 text-slate-700 hover:text-slate-900 focus:outline-none cursor-pointer rounded-lg hover:bg-slate-100"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Dropdown */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="md:hidden overflow-hidden border-t border-slate-200 mt-3 pt-3 pb-3 bg-white"
          >
            <nav className="flex flex-col space-y-2 text-sm font-medium text-slate-700 px-4">
              <Link
                href="/docs"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-slate-900 py-1.5 transition-colors"
              >
                Documentation
              </Link>
              <Link
                href="/#architecture"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-slate-900 py-1.5 transition-colors"
              >
                Architecture
              </Link>
              <Link
                href="/#use-cases"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-slate-900 py-1.5 transition-colors"
              >
                Use Cases
              </Link>
              <Link
                href="/changelog"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-slate-900 py-1.5 transition-colors"
              >
                Changelog
              </Link>
              <div className="pt-2">
                <Link
                  href="/contact"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full inline-flex items-center justify-center gap-1.5 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-full"
                >
                  <span>Book a demo</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
