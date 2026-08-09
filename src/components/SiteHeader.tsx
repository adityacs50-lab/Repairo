"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { buttonPressVariant } from "@/lib/animationVariants";
import { TextEffect } from "@/components/ui/text-effect";
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
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="w-full bg-canvas/80 backdrop-blur-md border-b border-hairline py-4 px-6 md:px-12 sticky top-0 z-50 transition-colors font-sans"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="text-ink font-semibold text-lg tracking-tight hover:opacity-80 transition-opacity font-display flex items-center gap-2">
          <img src="/logo.jpg" alt="Repairo Logo" className="w-6 h-6 rounded-md object-contain" />
          <TextEffect per="char" preset="fade">Repairo</TextEffect>
        </Link>

        {/* Center Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-mute">
          <Link href="/#features" className={cn("hover:text-ink transition-colors", active === 'features' && "text-ink font-semibold")}>Product</Link>
          <Link href="/docs" className={cn("hover:text-ink transition-colors", active === 'docs' && "text-ink font-semibold")}>Docs</Link>
          <Link href="/pricing" className={cn("hover:text-ink transition-colors", active === 'pricing' && "text-ink font-semibold")}>Pricing</Link>
          <Link href="/app" className={cn("hover:text-ink transition-colors", active === 'login' && "text-ink font-semibold")}>Login</Link>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-3 md:gap-6">
          <Link href="/contact" className="hidden md:inline text-sm font-medium text-mute hover:text-ink transition-colors">
            Book a demo
          </Link>
          <motion.div {...buttonPressVariant}>
            <Link
              href="/app"
              className="inline-block bg-ink text-primary-on text-xs md:text-sm font-medium px-3.5 py-1.5 md:px-4 md:py-2 rounded-full hover:bg-body transition-colors"
            >
              Start for free
            </Link>
          </motion.div>

          {/* Mobile Hamburger Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 text-mute hover:text-ink focus:outline-none cursor-pointer"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
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
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="md:hidden overflow-hidden border-t border-hairline mt-3 pt-4 pb-2 bg-surface-deep"
          >
            <nav className="flex flex-col space-y-3 text-sm font-medium text-mute px-4 py-2">
              <Link
                href="/#features"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-ink py-1.5 transition-colors"
              >
                Product
              </Link>
              <Link
                href="/docs"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-ink py-1.5 transition-colors"
              >
                Docs
              </Link>
              <Link
                href="/pricing"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-ink py-1.5 transition-colors"
              >
                Pricing
              </Link>
              <Link
                href="/app"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-ink py-1.5 transition-colors"
              >
                Login
              </Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
