"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export function SiteHeader({ active }: { active?: string }) {
  const [open, setOpen] = useState(false);

  const links = [
    { name: "Product", href: "/#features" },
    { name: "Docs", href: "/docs" },
    { name: "Pricing", href: "/pricing" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-canvas/80 backdrop-blur-md">
      <div className="mx-auto flex h-[64px] w-full max-w-[1200px] items-center justify-between px-6">
        
        {/* LOGO */}
        <Link href="/" className="text-[20px] tracking-[-0.6px] font-normal text-ink hover:opacity-80 transition-opacity select-none">
          Repairo
        </Link>

        {/* DESKTOP NAV */}
        <nav className="hidden md:flex items-center gap-8 text-[14px] text-ink">
          {links.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className="hover:opacity-70 transition-opacity"
            >
              {link.name}
            </Link>
          ))}
          <Link
            href="/app"
            className="flex items-center justify-center rounded-full bg-primary px-[16px] py-[6px] text-[14px] text-on-primary border border-primary hover:bg-transparent hover:text-ink transition-colors ml-4"
          >
            Get Started
          </Link>
        </nav>

        {/* MOBILE MENU TOGGLE */}
        <button
          className="md:hidden flex flex-col justify-center gap-[5px] p-2 text-ink"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          <span className={cn("block h-[1px] w-5 bg-current transition-transform", open && "translate-y-[6px] rotate-45")} />
          <span className={cn("block h-[1px] w-5 bg-current transition-opacity", open && "opacity-0")} />
          <span className={cn("block h-[1px] w-5 bg-current transition-transform", open && "-translate-y-[6px] -rotate-45")} />
        </button>
      </div>

      {/* MOBILE MENU DRAWER */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="absolute top-[64px] left-0 w-full bg-canvas border-b border-hairline overflow-hidden md:hidden"
          >
            <div className="flex flex-col px-6 py-4 gap-6">
              {links.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="text-[16px] text-ink"
                  onClick={() => setOpen(false)}
                >
                  {link.name}
                </Link>
              ))}
              <Link
                href="/app"
                className="mt-4 flex w-full items-center justify-center rounded-full bg-primary py-3 text-[16px] text-on-primary border border-primary"
                onClick={() => setOpen(false)}
              >
                Get Started
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
