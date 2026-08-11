"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("signup") === "success") {
        setStatus("success");
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus("loading");

    try {
      const response = await fetch("https://formsubmit.co/ajax/info@heyrepairo.in", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          email: email,
          _subject: "Repairo Beta Signup",
          _honey: "",
        }),
      });

      if (response.ok) {
        setStatus("success");
        setEmail("");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      <AnimatePresence mode="wait">
        {status === "success" ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-2xl text-center text-emerald-400 text-sm font-sans shadow-lg shadow-emerald-500/5"
          >
            <span className="font-semibold block mb-1">🎉 You&apos;re registered for Beta Access!</span>
            We&apos;ve reserved your early access spot. Check your email for launch updates.
          </motion.div>
        ) : (
          <div className="space-y-3">
            {/* Google Signup Button */}
            <motion.a
              href="/api/auth/google"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full h-11 bg-surface-elevated hover:bg-surface-card border border-hairline hover:border-hairline-strong rounded-full px-5 py-2.5 text-ink text-sm font-medium transition-all flex items-center justify-center gap-3 cursor-pointer shadow-sm"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Sign up with Google for Beta Access</span>
            </motion.a>

            <div className="flex items-center gap-3 my-2">
              <div className="flex-1 h-[1px] bg-hairline" />
              <span className="text-[11px] uppercase tracking-wider font-mono text-charcoal">OR</span>
              <div className="flex-1 h-[1px] bg-hairline" />
            </div>

            {/* Email Form */}
            <motion.form
              key="form"
              onSubmit={handleSubmit}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col sm:flex-row gap-3 items-stretch justify-center w-full relative"
            >
              <div className="relative flex-grow">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (status === "error") setStatus("idle");
                  }}
                  disabled={status === "loading"}
                  placeholder="Enter your work email"
                  className="w-full h-11 bg-surface-elevated hover:bg-surface-card focus:bg-surface-card border border-hairline focus:border-hairline-strong rounded-full px-5 py-2.5 text-ink text-sm transition-all focus:outline-none focus:ring-1 focus:ring-emerald-500/40 disabled:opacity-50 font-sans"
                />
                {status === "error" && (
                  <p className="absolute left-4 -bottom-5 text-[10px] text-accent-red font-medium font-sans">
                    Something went wrong. Please try again.
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={status === "loading"}
                className="h-11 bg-ink text-primary-on hover:bg-body disabled:bg-mute font-medium text-sm px-6 py-2.5 rounded-full transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 shrink-0 cursor-pointer shadow-md shadow-emerald-500/5 hover:shadow-emerald-500/10"
              >
                {status === "loading" ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-primary-on" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Requesting...</span>
                  </>
                ) : (
                  <span>Request Invite</span>
                )}
              </button>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
