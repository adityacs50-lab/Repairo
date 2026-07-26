"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

export function SiteHeader({
  active,
}: {
  active?: "home" | "demo" | "app";
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <motion.header
      className="relative z-50 border-b border-black/10 bg-header text-header-fg"
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link
          href="/"
          className="text-[1.35rem] font-semibold lowercase tracking-tight"
        >
          repairo
        </Link>

        <div className="hidden items-center gap-4 sm:flex">
          <Link
            href="/app"
            className={`text-sm ${
              active === "app" ? "font-medium" : "text-black/70 hover:text-black"
            }`}
          >
            Open app
          </Link>
          <Link
            href="/demo"
            className={`text-sm ${
              active === "demo" ? "font-medium" : "text-black/70 hover:text-black"
            }`}
          >
            Live demo
          </Link>
          <Link href="/app" className="btn-primary !py-2 !text-sm">
            Try on GitHub
          </Link>
        </div>

        <motion.button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          whileTap={{ scale: 0.96 }}
          className="flex h-9 w-9 items-center justify-center border border-black/20 bg-white sm:hidden"
        >
          <span className="sr-only">Menu</span>
          <span className="relative flex h-3.5 w-4 flex-col justify-between">
            <motion.span
              className="block h-[1.5px] w-full origin-center bg-black"
              animate={open ? { y: 6, rotate: 45 } : { y: 0, rotate: 0 }}
              transition={{ duration: 0.2 }}
            />
            <motion.span
              className="block h-[1.5px] w-full bg-black"
              animate={open ? { opacity: 0 } : { opacity: 1 }}
              transition={{ duration: 0.15 }}
            />
            <motion.span
              className="block h-[1.5px] w-full origin-center bg-black"
              animate={open ? { y: -6, rotate: -45 } : { y: 0, rotate: 0 }}
              transition={{ duration: 0.2 }}
            />
          </span>
        </motion.button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute inset-x-0 top-full overflow-hidden border-b border-black/10 bg-header shadow-lg sm:hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mx-auto flex max-w-6xl flex-col gap-1 px-5 py-4 text-sm sm:px-8">
              {[
                { href: "/", label: "Product", match: "home" as const },
                { href: "/app", label: "Open app", match: "app" as const },
                { href: "/demo", label: "Live demo", match: "demo" as const },
                { href: "/#how", label: "How it works" },
              ].map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 + i * 0.05 }}
                >
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`block px-2 py-2 ${
                      "match" in item && active === item.match
                        ? "font-medium"
                        : "text-black/70 hover:text-black"
                    }`}
                  >
                    {item.label}
                  </Link>
                </motion.div>
              ))}
              <Link
                href="/app"
                onClick={() => setOpen(false)}
                className="btn-primary mt-2 w-full sm:w-auto sm:self-start"
              >
                Try on your GitHub
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
