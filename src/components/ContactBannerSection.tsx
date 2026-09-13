"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";

export function ContactBannerSection() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 600);
  };

  return (
    <section className="py-16 md:py-24 px-6 md:px-12 max-w-[1240px] mx-auto border-t border-slate-200/80 font-sans">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
        {/* Left Card */}
        <div className="md:col-span-6 p-8 sm:p-10 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-mono font-bold tracking-[0.14em] text-blue-600 uppercase block mb-3">
              TALK TO THE TEAM
            </span>
            <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 leading-tight mb-4">
              Bring your hardest<br />
              integration change.
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed max-w-md font-normal">
              Send us your repo or walk through a demo to see how autonomous AST repairs simplify your next major release.
            </p>
          </div>
        </div>

        {/* Right Card with Email Input */}
        <div className="md:col-span-6 p-8 sm:p-10 rounded-2xl bg-[#f8fafc] border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-mono font-bold tracking-[0.14em] text-blue-600 uppercase block mb-3">
              GET STARTED
            </span>
            <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 leading-tight mb-2">
              We&apos;ll be in touch.
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-6 font-normal">
              Your company email address for the technical walkthrough.
            </p>
          </div>

          {/* Form */}
          <div>
            {submitted ? (
              <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Thank you! We have received your request and will reach out shortly.</span>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-center gap-2.5">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your company email address"
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto shrink-0 inline-flex items-center justify-center gap-1.5 bg-[#090d16] hover:bg-slate-800 text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition-all duration-150 active:scale-[0.98] disabled:opacity-60 shadow-sm cursor-pointer"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Book Demo</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
