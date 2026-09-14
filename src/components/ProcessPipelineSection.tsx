"use client";

import React from "react";
import { motion } from "framer-motion";

const STEPS = [
  {
    number: "01",
    tag: "DISCOVERY",
    title: "Detect breaking changes",
    desc: "Monitors vendor schemas, SDK releases, and API deprecation alerts continuously.",
  },
  {
    number: "02",
    tag: "IMPACT MAPPING",
    title: "Trace external symbols",
    desc: "Maps every imported type, method, and endpoint downstream to your exact call sites.",
  },
  {
    number: "03",
    tag: "AST REWRITING",
    title: "Prepare compiler-accurate repairs",
    desc: "Uses type-aware AST transformations to rewrite call sites with zero hallucination.",
  },
  {
    number: "04",
    tag: "TEST & BENCHMARK",
    title: "Run side-by-side verification",
    desc: "Validates against existing unit tests, TypeScript typecheck, and Python syntax before a PR opens.",
  },
  {
    number: "05",
    tag: "PULL REQUEST",
    title: "Ship your migration",
    desc: "Opens clean, reviewable PRs with contextual diffs, migration notes, and verified test results.",
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
