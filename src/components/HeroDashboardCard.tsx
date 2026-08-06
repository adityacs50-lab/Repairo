"use client";

import React, { MouseEvent } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";

export function HeroDashboardCard() {
  const [activeImpact, setActiveImpact] = React.useState<string | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] }}
      className="w-full bg-white rounded-3xl shadow-[0_20px_50px_-10px_rgba(0,0,0,0.08)] overflow-hidden text-neutral-900 text-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_30px_70px_-10px_rgba(0,0,0,0.15)]"
    >
      <div className="flex flex-col md:flex-row min-h-[480px]">
        {/* Sidebar */}
        <div className="w-full md:w-52 border-b md:border-b-0 md:border-r border-neutral-200 p-4 bg-white flex flex-col justify-between">
          <div>
            {/* Logo */}
            <div className="font-semibold text-sm mb-6 text-black tracking-tight">
              <span>Repairo</span>
            </div>

            {/* Menu Links */}
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-neutral-100 font-medium text-black">
                <svg className="w-4 h-4 text-neutral-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                </svg>
                <span>Overview</span>
              </div>
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-neutral-600 hover:bg-neutral-50 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
                <span>Changes</span>
              </div>
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-neutral-600 hover:bg-neutral-50 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                <span>Pull Requests</span>
              </div>
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-neutral-600 hover:bg-neutral-50 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4a2 2 0 114 0v1a2 2 0 01-2 2 2 2 0 01-2-2V4zm-6 8a2 2 0 114 0v1a2 2 0 01-2 2 2 2 0 01-2-2v-1zm12 0a2 2 0 114 0v1a2 2 0 01-2 2 2 2 0 01-2-2v-1z" />
                </svg>
                <span>Integrations</span>
              </div>
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-neutral-600 hover:bg-neutral-50 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Settings</span>
              </div>
            </div>
          </div>

          {/* User Account */}
          <div className="pt-4 border-t border-neutral-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-neutral-200 flex items-center justify-center font-bold text-[10px] text-neutral-700">
                AC
              </div>
              <div className="text-[11px] leading-tight">
                <div className="font-semibold text-black">Acme Inc.</div>
                <div className="text-neutral-400">acme@example.com</div>
              </div>
            </div>
            <svg className="w-3.5 h-3.5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 p-5 bg-neutral-50/60 flex flex-col gap-4">
          {/* Header */}
          <div>
            <h3 className="text-base font-semibold text-black tracking-tight">Overview</h3>
            <p className="text-[11px] text-neutral-500 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Everything looks healthy.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <motion.div whileHover={{ y: -2 }} className="bg-white p-3 rounded-xl border border-neutral-200 shadow-2xs transition-shadow">
              <div className="text-[10px] font-medium text-neutral-500 mb-1">Monitored APIs</div>
              <div className="text-lg font-semibold text-black"><AnimatedCounter value={12} /></div>
            </motion.div>
            <motion.div whileHover={{ y: -2 }} className="bg-white p-3 rounded-xl border border-neutral-200 shadow-2xs transition-shadow">
              <div className="text-[10px] font-medium text-neutral-500 mb-1">Breaking Changes</div>
              <div className="text-lg font-semibold text-black"><AnimatedCounter value={3} /></div>
            </motion.div>
            <motion.div whileHover={{ y: -2 }} className="bg-white p-3 rounded-xl border border-neutral-200 shadow-2xs transition-shadow">
              <div className="text-[10px] font-medium text-neutral-500 mb-1">PRs Opened</div>
              <div className="text-lg font-semibold text-black"><AnimatedCounter value={8} /></div>
            </motion.div>
            <motion.div whileHover={{ y: -2 }} className="bg-white p-3 rounded-xl border border-neutral-200 shadow-2xs transition-shadow">
              <div className="text-[10px] font-medium text-neutral-500 mb-1">Repos Connected</div>
              <div className="text-lg font-semibold text-black"><AnimatedCounter value={24} /></div>
            </motion.div>
          </div>

          {/* Content Middle Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Recent Breaking Changes */}
            <div className="bg-white p-3.5 rounded-xl border border-neutral-200 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="text-xs font-semibold text-black mb-3">Recent breaking changes</div>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-neutral-900" />
                      <div>
                        <div className="font-medium text-black">stripe / openapi</div>
                        <div className="text-[10px] text-neutral-400">2024-05-02 • 2 breaking changes</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-neutral-100 text-neutral-800">High</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-neutral-900" />
                      <div>
                        <div className="font-medium text-black">openai / openapi</div>
                        <div className="text-[10px] text-neutral-400">2024-05-01 • 1 breaking change</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-neutral-100 text-neutral-800">High</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-neutral-900" />
                      <div>
                        <div className="font-medium text-black">supabase / openapi</div>
                        <div className="text-[10px] text-neutral-400">2024-05-01 • 3 breaking changes</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-neutral-100 text-neutral-800">Medium</span>
                  </div>
                </div>
              </div>
              <div className="pt-2 text-[10px] font-medium text-neutral-600 hover:text-black cursor-pointer transition-colors">
                View all changes →
              </div>
            </div>

            {/* Active Pull Request */}
            <div className="bg-white p-3.5 rounded-xl border border-neutral-200 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="text-xs font-semibold text-black mb-2">Active Pull Request</div>
                <div className="text-[10px] text-neutral-400 mb-1">repairo/analytics-service</div>
                <div className="text-[11px] font-semibold text-black leading-snug mb-1">
                  Update requests type for ChatCompletion object
                </div>
                <div className="text-[10px] text-neutral-400 mb-3">#1562 opened 2h ago</div>
              </div>
              <motion.div
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="w-full bg-white border border-neutral-300 rounded-lg py-1.5 px-3 flex items-center justify-center gap-1.5 text-[11px] font-medium text-black hover:bg-neutral-50 transition-colors cursor-pointer"
              >
                <span>View PR on GitHub</span>
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
              </motion.div>
            </div>
          </div>

          {/* Bottom Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Activity */}
            <div className="bg-white p-3.5 rounded-xl border border-neutral-200 shadow-2xs">
              <div className="flex items-center justify-between text-xs font-semibold text-black mb-2">
                <span>Activity</span>
                <span className="text-[10px] font-normal text-neutral-400">View all</span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full border border-neutral-400 flex items-center justify-center text-[9px] text-neutral-600">
                    ◎
                  </div>
                  <span className="text-neutral-700">
                    Repairo detected 2 breaking changes in <span className="font-semibold text-black">stripe / openapi</span>
                  </span>
                </div>
                <span className="text-neutral-400">2h ago</span>
              </div>
            </div>

            {/* Codebase Impact - Interactive 4-Color Donut */}
            <div className="bg-white p-3.5 rounded-xl border border-neutral-200 shadow-2xs">
              <div className="text-xs font-semibold text-black mb-2 flex items-center justify-between">
                <span>Codebase impact</span>
                <span className="text-[9px] font-mono text-neutral-400 uppercase">Live</span>
              </div>
              <div className="flex items-center gap-4">
                {/* 4-Color Interactive Donut SVG */}
                <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full transform -rotate-90 overflow-visible" viewBox="0 0 36 36">
                    {/* Background Track */}
                    <circle
                      cx="18"
                      cy="18"
                      r="15.9155"
                      strokeWidth="3.5"
                      stroke="#f1f5f9"
                      fill="none"
                    />

                    {/* Segment 1: Affected (Red #f43f5e) - 38.3% */}
                    <motion.circle
                      cx="18"
                      cy="18"
                      r="15.9155"
                      stroke="#f43f5e"
                      strokeWidth={activeImpact === "affected" ? 5 : 3.8}
                      strokeDasharray="38.3 61.7"
                      strokeDashoffset="0"
                      strokeLinecap="round"
                      fill="none"
                      className="cursor-pointer transition-all duration-200"
                      onMouseEnter={() => setActiveImpact("affected")}
                      onMouseLeave={() => setActiveImpact(null)}
                      animate={{
                        strokeWidth: activeImpact === "affected" ? 5 : 3.8,
                        opacity: activeImpact && activeImpact !== "affected" ? 0.4 : 1,
                      }}
                    />

                    {/* Segment 2: Pending (Amber #f59e0b) - 12.8% */}
                    <motion.circle
                      cx="18"
                      cy="18"
                      r="15.9155"
                      stroke="#f59e0b"
                      strokeWidth={activeImpact === "pending" ? 5 : 3.8}
                      strokeDasharray="12.8 87.2"
                      strokeDashoffset="-38.3"
                      strokeLinecap="round"
                      fill="none"
                      className="cursor-pointer transition-all duration-200"
                      onMouseEnter={() => setActiveImpact("pending")}
                      onMouseLeave={() => setActiveImpact(null)}
                      animate={{
                        strokeWidth: activeImpact === "pending" ? 5 : 3.8,
                        opacity: activeImpact && activeImpact !== "pending" ? 0.4 : 1,
                      }}
                    />

                    {/* Segment 3: Safe (Emerald #10b981) - 36.2% */}
                    <motion.circle
                      cx="18"
                      cy="18"
                      r="15.9155"
                      stroke="#10b981"
                      strokeWidth={activeImpact === "safe" ? 5 : 3.8}
                      strokeDasharray="36.2 63.8"
                      strokeDashoffset="-51.1"
                      strokeLinecap="round"
                      fill="none"
                      className="cursor-pointer transition-all duration-200"
                      onMouseEnter={() => setActiveImpact("safe")}
                      onMouseLeave={() => setActiveImpact(null)}
                      animate={{
                        strokeWidth: activeImpact === "safe" ? 5 : 3.8,
                        opacity: activeImpact && activeImpact !== "safe" ? 0.4 : 1,
                      }}
                    />

                    {/* Segment 4: Patched (Indigo #6366f1) - 12.7% */}
                    <motion.circle
                      cx="18"
                      cy="18"
                      r="15.9155"
                      stroke="#6366f1"
                      strokeWidth={activeImpact === "patched" ? 5 : 3.8}
                      strokeDasharray="12.7 87.3"
                      strokeDashoffset="-87.3"
                      strokeLinecap="round"
                      fill="none"
                      className="cursor-pointer transition-all duration-200"
                      onMouseEnter={() => setActiveImpact("patched")}
                      onMouseLeave={() => setActiveImpact(null)}
                      animate={{
                        strokeWidth: activeImpact === "patched" ? 5 : 3.8,
                        opacity: activeImpact && activeImpact !== "patched" ? 0.4 : 1,
                      }}
                    />
                  </svg>

                  {/* Center Text displaying active hover stats dynamically */}
                  <div className="absolute text-center leading-none pointer-events-none">
                    <motion.div
                      key={activeImpact || "total"}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.15 }}
                      className="font-bold text-xs text-black"
                    >
                      {activeImpact === "affected"
                        ? "18"
                        : activeImpact === "pending"
                        ? "6"
                        : activeImpact === "safe"
                        ? "18"
                        : activeImpact === "patched"
                        ? "5"
                        : "47"}
                    </motion.div>
                    <div className="text-[7px] font-medium text-neutral-400 capitalize mt-0.5">
                      {activeImpact || "Files"}
                    </div>
                  </div>
                </div>

                {/* Donut Legend */}
                <div className="space-y-1 text-[10px] text-neutral-600 flex-1">
                  {/* Affected */}
                  <div
                    onMouseEnter={() => setActiveImpact("affected")}
                    onMouseLeave={() => setActiveImpact(null)}
                    className={`flex items-center justify-between px-1 py-0.5 rounded cursor-pointer transition-colors ${
                      activeImpact === "affected" ? "bg-rose-50 font-semibold text-rose-700" : "hover:bg-neutral-50"
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#f43f5e]" />
                      Affected
                    </span>
                    <span className="font-semibold text-black">18</span>
                  </div>

                  {/* Pending */}
                  <div
                    onMouseEnter={() => setActiveImpact("pending")}
                    onMouseLeave={() => setActiveImpact(null)}
                    className={`flex items-center justify-between px-1 py-0.5 rounded cursor-pointer transition-colors ${
                      activeImpact === "pending" ? "bg-amber-50 font-semibold text-amber-700" : "hover:bg-neutral-50"
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#f59e0b]" />
                      Pending
                    </span>
                    <span className="font-semibold text-black">6</span>
                  </div>

                  {/* Safe */}
                  <div
                    onMouseEnter={() => setActiveImpact("safe")}
                    onMouseLeave={() => setActiveImpact(null)}
                    className={`flex items-center justify-between px-1 py-0.5 rounded cursor-pointer transition-colors ${
                      activeImpact === "safe" ? "bg-emerald-50 font-semibold text-emerald-700" : "hover:bg-neutral-50"
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#10b981]" />
                      Safe
                    </span>
                    <span className="font-semibold text-black">18</span>
                  </div>

                  {/* Patched */}
                  <div
                    onMouseEnter={() => setActiveImpact("patched")}
                    onMouseLeave={() => setActiveImpact(null)}
                    className={`flex items-center justify-between px-1 py-0.5 rounded cursor-pointer transition-colors ${
                      activeImpact === "patched" ? "bg-indigo-50 font-semibold text-indigo-700" : "hover:bg-neutral-50"
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#6366f1]" />
                      Patched
                    </span>
                    <span className="font-semibold text-black">5</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
