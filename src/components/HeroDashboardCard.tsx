"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import { BorderTrail } from "@/components/ui/border-trail";

type Tab = "overview" | "changes" | "pulls" | "integrations" | "settings";

export function HeroDashboardCard() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] }}
      className="relative w-full bg-surface-card rounded-lg shadow-2xl overflow-hidden text-body text-sm border border-hairline-strong font-sans"
    >
      <BorderTrail size={120} className="bg-accent-blue" />
      <div className="flex flex-col md:flex-row min-h-[500px]">
        {/* Sidebar */}
        <div className="w-full md:w-56 border-b md:border-b-0 md:border-r border-hairline p-4 bg-canvas flex flex-col justify-between">
          <div>
            {/* Logo */}
            <div className="font-semibold text-lg mb-8 text-ink tracking-tight font-display flex items-center gap-2">
              <img src="/logo.jpg" alt="Repairo AI Logo" className="h-6 w-auto object-contain rounded" />
              <span>Repairo</span>
            </div>

            {/* Menu Links */}
            <div className="space-y-1">
              <SidebarItem 
                active={activeTab === "overview"} 
                onClick={() => setActiveTab("overview")}
                label="Overview" 
                icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="14" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                  </svg>
                }
              />
              <SidebarItem 
                active={activeTab === "changes"} 
                onClick={() => setActiveTab("changes")}
                label="Changes" 
                icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                }
              />
              <SidebarItem 
                active={activeTab === "pulls"} 
                onClick={() => setActiveTab("pulls")}
                label="Pull Requests" 
                icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                }
              />
              <SidebarItem 
                active={activeTab === "integrations"} 
                onClick={() => setActiveTab("integrations")}
                label="Integrations" 
                icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4a2 2 0 114 0v1a2 2 0 01-2 2 2 2 0 01-2-2V4zm-6 8a2 2 0 114 0v1a2 2 0 01-2 2 2 2 0 01-2-2v-1zm12 0a2 2 0 114 0v1a2 2 0 01-2 2 2 2 0 01-2-2v-1z" />
                  </svg>
                }
              />
              <SidebarItem 
                active={activeTab === "settings"} 
                onClick={() => setActiveTab("settings")}
                label="Settings" 
                icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                }
              />
            </div>
          </div>

          {/* User Account */}
          <div className="pt-4 border-t border-hairline flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-surface-elevated flex items-center justify-center font-bold text-xs text-ink border border-hairline-strong">
                AC
              </div>
              <div className="text-xs leading-tight">
                <div className="font-semibold text-ink">Acme Inc.</div>
                <div className="text-mute">acme@example.com</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 p-6 lg:p-8 bg-surface-card flex flex-col relative overflow-hidden">
          {/* Atmospheric Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-accent-blue-glow rounded-full blur-[100px] opacity-30 pointer-events-none" />
          
          <div className="relative z-10 w-full max-w-3xl mx-auto space-y-6">
            <header className="mb-8">
              <h3 className="text-2xl text-ink font-display capitalize">{activeTab.replace("pulls", "Pull Requests")}</h3>
            </header>

            {activeTab === "overview" && <OverviewContent />}
            {activeTab === "changes" && <ChangesContent />}
            {activeTab === "pulls" && <PullRequestsContent />}
            {activeTab === "integrations" && <IntegrationsContent />}
            {activeTab === "settings" && <SettingsContent />}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function SidebarItem({ active, onClick, label, icon }: { active: boolean, onClick: () => void, label: string, icon: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-left ${
        active ? "bg-surface-elevated text-ink font-medium" : "text-charcoal hover:text-ink hover:bg-surface-deep"
      }`}
    >
      <span className={active ? "text-ink" : "text-charcoal"}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function OverviewContent() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Monitored APIs" value={12} />
        <StatCard label="Breaking Changes" value={3} />
        <StatCard label="PRs Opened" value={8} />
        <StatCard label="Repos Connected" value={24} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-surface-deep p-5 rounded-lg border border-hairline-strong">
          <div className="text-sm font-medium text-ink mb-4">Recent Breaking Changes</div>
          <div className="space-y-4">
            <BreakingChangeItem api="stripe / openapi" date="2024-05-02" count={2} severity="High" />
            <BreakingChangeItem api="openai / openapi" date="2024-05-01" count={1} severity="High" />
            <BreakingChangeItem api="supabase / openapi" date="2024-05-01" count={3} severity="Medium" />
          </div>
        </div>
        <div className="bg-surface-deep p-5 rounded-lg border border-hairline-strong flex flex-col">
          <div className="text-sm font-medium text-ink mb-2">Active Pull Request</div>
          <div className="text-xs text-mute mb-2">repairo/analytics-service</div>
          <div className="text-sm font-medium text-ink mb-4">Update requests type for ChatCompletion object</div>
          <div className="mt-auto">
            <button className="w-full py-2 bg-surface-elevated border border-hairline-strong rounded-md text-ink text-sm font-medium hover:bg-surface-card transition-colors flex items-center justify-center gap-2">
              View on GitHub
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChangesContent() {
  return (
    <div className="space-y-4">
      <div className="bg-surface-deep rounded-lg border border-hairline-strong overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-elevated border-b border-hairline-strong text-mute">
            <tr>
              <th className="font-normal px-4 py-3">API Source</th>
              <th className="font-normal px-4 py-3">Change Detected</th>
              <th className="font-normal px-4 py-3">Severity</th>
              <th className="font-normal px-4 py-3 text-right">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            <tr className="hover:bg-surface-card transition-colors">
              <td className="px-4 py-4 text-ink font-mono text-xs">stripe / openapi</td>
              <td className="px-4 py-4">
                <code className="text-xs text-accent-orange bg-accent-orange-glow px-1.5 py-0.5 rounded mr-2">Removed</code>
                Event signature <code className="font-mono text-xs text-ink">charge.succeeded</code> modified
              </td>
              <td className="px-4 py-4"><span className="text-accent-red font-medium">High</span></td>
              <td className="px-4 py-4 text-right text-mute">2h ago</td>
            </tr>
            <tr className="hover:bg-surface-card transition-colors">
              <td className="px-4 py-4 text-ink font-mono text-xs">openai / openapi</td>
              <td className="px-4 py-4">
                <code className="text-xs text-accent-blue bg-accent-blue-glow px-1.5 py-0.5 rounded mr-2">Modified</code>
                <code className="font-mono text-xs text-ink">ChatCompletion</code> param type changed
              </td>
              <td className="px-4 py-4"><span className="text-accent-red font-medium">High</span></td>
              <td className="px-4 py-4 text-right text-mute">5h ago</td>
            </tr>
            <tr className="hover:bg-surface-card transition-colors">
              <td className="px-4 py-4 text-ink font-mono text-xs">supabase / openapi</td>
              <td className="px-4 py-4">
                <code className="text-xs text-accent-green bg-accent-green-glow px-1.5 py-0.5 rounded mr-2">Added</code>
                New rate limit headers required
              </td>
              <td className="px-4 py-4"><span className="text-accent-yellow font-medium">Medium</span></td>
              <td className="px-4 py-4 text-right text-mute">1d ago</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PullRequestsContent() {
  return (
    <div className="space-y-4">
      <PrItem repo="repairo/analytics-service" prNum="#1562" title="Update requests type for ChatCompletion object" status="Open" time="2h ago" additions={14} deletions={3} />
      <PrItem repo="repairo/billing-api" prNum="#894" title="Fix Stripe charge.succeeded webhook payload" status="Merged" time="1d ago" additions={42} deletions={12} />
      <PrItem repo="repairo/dashboard-web" prNum="#2341" title="Update Supabase client headers for rate limits" status="Open" time="1d ago" additions={8} deletions={0} />
    </div>
  );
}

function PrItem({ repo, prNum, title, status, time, additions, deletions }: any) {
  return (
    <div className="bg-surface-deep p-4 rounded-lg border border-hairline-strong flex items-center justify-between group hover:border-hairline transition-colors">
      <div className="flex gap-4">
        <div className={`mt-1 w-5 h-5 rounded-full flex items-center justify-center border ${status === 'Merged' ? 'border-accent-dusk text-accent-dusk' : 'border-accent-green text-accent-green'}`}>
          <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
            {status === 'Merged' ? (
              <path d="M5 3.254V3.25v.005a.75.75 0 1 1-1.5 0V2.75a.75.75 0 0 1 1.5 0v.504zm4 4V7.25a.75.75 0 1 1-1.5 0v.004a.75.75 0 1 1 1.5 0zm1.75-2.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5z" />
            ) : (
              <path d="M7.177 3.073L9.573.677A.25.25 0 0110 .854v4.792a.25.25 0 01-.427.177L7.177 3.427a.25.25 0 010-.354zM3.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122v5.256a2.25 2.25 0 11-1.5 0V5.372A2.25 2.25 0 011.5 3.25zM11 2.5h-1V4h1a1.5 1.5 0 011.5 1.5v5.628a2.25 2.25 0 101.5 0V5.5A3 3 0 0011 2.5zm1 10.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0zM3.75 12a.75.75 0 100 1.5.75.75 0 000-1.5z" />
            )}
          </svg>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-ink font-medium text-sm">{title}</span>
            <span className="text-mute text-xs">{prNum}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-mute">
            <span>{repo}</span>
            <span>opened {time}</span>
            <div className="flex items-center gap-1">
              <span className="text-accent-green">+{additions}</span>
              <span className="text-accent-red">-{deletions}</span>
            </div>
          </div>
        </div>
      </div>
      <button className="px-3 py-1.5 rounded bg-surface-elevated text-ink text-xs font-medium border border-hairline hover:bg-surface-card transition-colors opacity-0 group-hover:opacity-100">
        Review
      </button>
    </div>
  );
}

function IntegrationsContent() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <IntegrationCard 
        name="GitHub" 
        status="Connected" 
        icon={<svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>} 
        desc="Create and manage Pull Requests" 
        active 
      />
      <IntegrationCard 
        name="Slack" 
        status="Connected" 
        icon={<svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.523-2.522v-2.522h2.523zM15.165 17.688a2.527 2.527 0 0 1-2.523-2.523 2.526 2.526 0 0 1 2.523-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/></svg>} 
        desc="Receive alerts for breaking changes" 
        active 
      />
      <IntegrationCard 
        name="Linear" 
        status="Not Connected" 
        icon={<svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path d="M12.7 13.9l6.5-6.5c-.3-.8-.9-1.4-1.7-1.7l-6.5 6.5c.3.8.9 1.4 1.7 1.7zm-1.4 1.4l-6.5 6.5c.3.8.9 1.4 1.7 1.7l6.5-6.5c-.3-.8-.9-1.4-1.7-1.7z"/></svg>} 
        desc="Auto-create tickets for manual fixes" 
        active={false} 
      />
      <IntegrationCard 
        name="OpenAI" 
        status="Connected" 
        icon={<svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path d="M22.28 11.23c.32-3.08-1.5-5.96-4.43-7-1.1-.38-2.31-.38-3.41 0-1.28-2.67-4.48-3.9-7.23-2.77-2.1.86-3.6 2.65-4.14 4.88-.32 3.08 1.5 5.96 4.43 7 1.1.38 2.31.38 3.41 0 1.28 2.67 4.48 3.9 7.23 2.77 2.1-.86 3.6-2.65 4.14-4.88zm-5.74 3.7c-2.4 1.39-5.46.57-6.85-1.83l-1.37-2.38v2.75c0 2.77 2.25 5.02 5.02 5.02h2.75l-1.37-2.38c-.46-.79-.19-1.8.6-2.26.79-.46 1.8-.19 2.26.6l1.37 2.38c.67-2.3 0-4.81-1.82-6.24l-2.38-1.37h-2.75l2.38 1.37c.79.46 1.8.19 2.26-.6.46-.79.19-1.8-.6-2.26l-2.38-1.37c2.4-1.39 5.46-.57 6.85 1.83l1.37 2.38V9.11c0-2.77-2.25-5.02-5.02-5.02h-2.75l1.37 2.38c.46.79.19 1.8-.6 2.26-.79.46-1.8.19-2.26-.6l-1.37-2.38c-.67 2.3 0 4.81 1.82 6.24l2.38 1.37h2.75l-2.38-1.37c-.79-.46-1.8-.19-2.26.6-.46.79-.19 1.8.6 2.26l2.38 1.37z"/></svg>} 
        desc="Generate complex code patches" 
        active 
      />
    </div>
  );
}

function IntegrationCard({ name, status, icon, desc, active }: any) {
  return (
    <div className="bg-surface-deep p-4 rounded-lg border border-hairline-strong flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-ink font-medium">
          <div className="w-6 h-6 rounded bg-surface-elevated border border-hairline flex items-center justify-center text-ink">{icon}</div>
          {name}
        </div>
        {active ? (
          <span className="flex items-center gap-1.5 text-xs text-accent-green">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-green" />
            Connected
          </span>
        ) : (
          <button className="text-xs bg-ink text-primary-on px-2 py-1 rounded font-medium">Connect</button>
        )}
      </div>
      <div className="text-xs text-mute">{desc}</div>
    </div>
  );
}

function SettingsContent() {
  return (
    <div className="space-y-6">
      <div className="bg-surface-deep p-5 rounded-lg border border-hairline-strong">
        <h4 className="text-ink font-medium mb-1">API Webhooks</h4>
        <p className="text-xs text-mute mb-4">Configure endpoints to receive Repairo events.</p>
        <div className="flex gap-2">
          <input type="text" className="flex-1 bg-surface-elevated border border-hairline-strong rounded px-3 py-2 text-sm text-ink outline-none focus:border-ink transition-colors" placeholder="https://api.acme.com/webhooks/repairo" value="https://api.acme.com/webhooks/repairo" readOnly />
          <button className="bg-ink text-primary-on px-4 py-2 rounded text-sm font-medium">Update</button>
        </div>
      </div>
      
      <div className="bg-surface-deep p-5 rounded-lg border border-hairline-strong">
        <h4 className="text-ink font-medium mb-1">Alert Preferences</h4>
        <p className="text-xs text-mute mb-4">Choose how you want to be notified about API changes.</p>
        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input type="checkbox" checked className="accent-ink w-4 h-4 rounded border-hairline-strong bg-surface-elevated" readOnly />
            <span className="text-sm text-body">Notify on High Severity Changes</span>
          </label>
          <label className="flex items-center gap-3">
            <input type="checkbox" checked className="accent-ink w-4 h-4 rounded border-hairline-strong bg-surface-elevated" readOnly />
            <span className="text-sm text-body">Auto-open Pull Requests</span>
          </label>
          <label className="flex items-center gap-3">
            <input type="checkbox" className="accent-ink w-4 h-4 rounded border-hairline-strong bg-surface-elevated" readOnly />
            <span className="text-sm text-body">Email Daily Summary</span>
          </label>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string, value: number }) {
  return (
    <div className="bg-surface-deep p-4 rounded-lg border border-hairline-strong">
      <div className="text-xs font-medium text-mute mb-2">{label}</div>
      <div className="text-2xl font-display text-ink"><AnimatedCounter value={value} /></div>
    </div>
  );
}

function BreakingChangeItem({ api, date, count, severity }: any) {
  const isHigh = severity === "High";
  return (
    <div className="flex items-center justify-between text-sm border-b border-hairline pb-3 last:border-0 last:pb-0">
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full ${isHigh ? 'bg-accent-red' : 'bg-accent-yellow'}`} />
        <div>
          <div className="font-medium text-ink font-mono text-xs">{api}</div>
          <div className="text-xs text-mute">{date} • {count} breaking {count === 1 ? 'change' : 'changes'}</div>
        </div>
      </div>
      <span className={`text-xs font-medium px-2 py-0.5 rounded border border-hairline ${isHigh ? 'text-accent-red bg-accent-red-glow' : 'text-accent-yellow bg-surface-elevated'}`}>
        {severity}
      </span>
    </div>
  );
}
