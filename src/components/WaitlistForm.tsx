"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus("loading");

    try {
      // FormSubmit AJAX submission API endpoint
      const response = await fetch("https://formsubmit.co/ajax/info@heyrepairo.in", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          email: email,
          _subject: "Repairo Beta Signup",
          _honey: "", // Honeypot spam protection field
        }),
      });

      if (response.ok) {
        setStatus("success");
        setEmail("");
      } else {
        setStatus("error");
      }
    } catch (error) {
      setStatus("error");
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <AnimatePresence mode="wait">
        {status === "success" ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-2xl text-center text-emerald-400 text-sm font-sans"
          >
            <span className="font-semibold block mb-1">🎉 You&apos;re on the list!</span>
            Check your inbox to activate your request. Thank you!
          </motion.div>
        ) : (
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
        )}
      </AnimatePresence>
    </div>
  );
}
