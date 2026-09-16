"use client";

import React from "react";
import { motion } from "framer-motion";

const STEPS = [
  {
    number: "01",
    tag: "DIFF",
    title: "Find the breaking change",
    desc: "Compare old and new OpenAPI specs and flag changes that can break client code.",
  },
  {
    number: "02",
    tag: "IMPACT",
    title: "Find the affected code",
    desc: "Trace the changed API through your repo to call sites, types, and related files.",
  },
  {
    number: "03",
    tag: "REPAIR",
    title: "Prepare the fix",
    desc: "Generate focused code changes and run validation (tsc, syntax, tests when available).",
  },
  {
    number: "04",
    tag: "PR",
    title: "Open a PR",
    desc: "Review the diff on GitHub. Your team decides when it is ready to merge.",
  },
];

export function ProcessPipelineSection() {
  return (
    <section id="architecture" className="py-16 md:py-24 px-6 md:px-12 max-w-[1240px] mx-auto border-t border-slate-200/80 font-sans">
      {/* Top Split Header */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-12 items-end mb-14">
        <div className="md:col-span-6">
          <span className="text-[11px] font-mono font-bold tracking-[0.14em] text-blue-600 uppercase block mb-3">
            HOW REPAIRO WORKS
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-[38px] font-bold tracking-tight text-slate-950 leading-[1.12]">
            From external change<br />
            to reviewable repair.
          </h2>
        </div>
        <div className="md:col-span-6">
          <p className="text-sm text-slate-600 leading-relaxed max-w-md font-normal">
            A direct look into what happens when an API is updated and your codebase needs a fix before CI catches it downstream.
          </p>
        </div>
      </div>

      {/* 5-Column Connected Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 border-t border-b lg:border-l lg:border-r border-slate-200 divide-y sm:divide-y-0 lg:divide-x divide-slate-200 bg-white">
        {STEPS.map((step, index) => (
          <motion.div
            key={step.number}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35, delay: index * 0.06 }}
            className="p-5 flex flex-col justify-between min-h-[190px] hover:bg-slate-50/50 transition-colors"
          >
            <div>
              {/* Step number in blue */}
              <div className="text-[12px] font-mono font-bold text-blue-600 mb-6">
                {step.number}
              </div>

              {/* Tag */}
              <div className="text-[9px] font-mono font-semibold tracking-wider text-slate-400 uppercase mb-2">
                {step.tag}
              </div>

              {/* Title */}
              <h3 className="text-xs sm:text-[13px] font-bold text-slate-900 leading-snug mb-2">
                {step.title}
              </h3>
            </div>

            {/* Description */}
            <p className="text-[11px] text-slate-500 leading-normal font-normal mt-2">
              {step.desc}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
