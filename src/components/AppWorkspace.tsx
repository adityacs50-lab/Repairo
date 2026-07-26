"use client";

import { useCallback, useEffect, useState } from "react";
import { HeroEnter, PixelCluster } from "@/components/Motion";
import { QuickRepair } from "@/components/QuickRepair";
import { VendorAgents } from "@/components/VendorAgents";

type AuthUser = {
  id: string;
  login: string;
  avatarUrl: string;
  name: string | null;
};

type Workspace = {
  id: string;
  name: string;
  plan: "free" | "pro";
  ownerUserId?: string;
};

type Integration = {
  id: string;
  name: string;
  fullName: string;
  owner: string;
  repo: string;
  beforePath: string;
  afterPath: string;
  beforeRef: string;
  afterRef: string;
  consumerPaths: string[];
  consumerRef: string;
  baseBranch: string;
  enabled: boolean;
  webhookId: number | null;
  lastCheckedAt: string | null;
  specSource?: "repo" | "remote";
  vendorId?: string | null;
};

type Run = {
  id: string;
  integrationId: string;
  integrationName: string;
  status: string;
  trigger: string;
  summary: Record<string, unknown> | null;
  prUrl: string | null;
  prNumber: number | null;
  error: string | null;
  createdAt: string;
};

type Repo = {
  id: number;
  fullName: string;
  name: string;
  owner: string;
  defaultBranch: string;
};

type Tab = "try" | "agents" | "overview" | "integrations" | "runs" | "settings";

const emptyForm = {
  name: "",
  repoFullName: "",
  beforePath: "openapi.yaml",
  afterPath: "openapi.yaml",
  beforeRef: "",
  afterRef: "",
  consumerPaths: "src/client.ts",
  consumerRef: "",
  baseBranch: "",
};

export function AppWorkspace() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [tab, setTab] = useState<Tab>("try");
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState("");
  const [inviteLogin, setInviteLogin] = useState("");
  const [members, setMembers] = useState<
    Array<{ login: string; role: string; avatarUrl: string; name: string | null }>
  >([]);
  const [billingConfigured, setBillingConfigured] = useState(false);
  const [role, setRole] = useState<"owner" | "member">("owner");
  const [pendingInvites, setPendingInvites] = useState<
    Array<{ id: string; githubLogin: string; createdAt: string }>
  >([]);
  const [usage, setUsage] = useState<{
    plan: string;
    limits: { integrations: number; runsPerMonth: number; seats: number };
    used: { integrations: number; runsThisMonth: number; seats: number };
    subscriptionStatus: string;
    paymentIssue: boolean;
  } | null>(null);

  const refreshAll = useCallback(async () => {
    const [intRes, runsRes, wsRes] = await Promise.all([
      fetch("/api/integrations"),
      fetch("/api/runs"),
      fetch("/api/workspace"),
    ]);
    if (intRes.ok) {
      const data = (await intRes.json()) as {
        integrations: Integration[];
        workspace: Workspace;
      };
      setIntegrations(data.integrations);
      setWorkspace(data.workspace);
      setWorkspaceName(data.workspace.name);
    }
    if (runsRes.ok) {
      const data = (await runsRes.json()) as { runs: Run[] };
      setRuns(data.runs);
    }
    if (wsRes.ok) {
      const data = (await wsRes.json()) as {
        members: Array<{
          login: string;
          role: string;
          avatarUrl: string;
          name: string | null;
        }>;
        billingConfigured: boolean;
        role: "owner" | "member";
        workspace: Workspace;
        usage?: typeof usage;
        pendingInvites?: Array<{
          id: string;
          githubLogin: string;
          createdAt: string;
        }>;
      };
      setMembers(data.members);
      setBillingConfigured(data.billingConfigured);
      setRole(data.role);
      setWorkspace(data.workspace);
      setWorkspaceName(data.workspace.name);
      if (data.usage) setUsage(data.usage);
      if (data.pendingInvites) setPendingInvites(data.pendingInvites);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get("error");
    if (oauthError) {
      const detail = params.get("detail");
      const messages: Record<string, string> = {
        oauth_not_configured:
          "GitHub OAuth is not configured on the server. Check Railway env vars.",
        invalid_oauth_state:
          "Sign-in expired or was interrupted. Click Continue with GitHub again.",
        oauth_failed:
          detail ||
          "GitHub rejected the sign-in. Check Client ID/Secret and callback URL.",
      };
      setError(messages[oauthError] ?? "GitHub sign-in failed. Try again.");
      window.history.replaceState({}, "", "/app");
    }
    if (params.get("billing") === "success") {
      setMessage("Billing updated. Your workspace is Pro.");
      setTab("settings");
      window.history.replaceState({}, "", "/app");
    }
    if (params.get("billing") === "cancel") {
      setMessage("Checkout canceled — you can upgrade anytime.");
      window.history.replaceState({}, "", "/app");
    }

    fetch("/api/auth/me")
      .then(async (res) => {
        const data = (await res.json()) as {
          configured?: boolean;
          user?: AuthUser | null;
          workspace?: Workspace | null;
          error?: string;
        };
        if (res.status === 503) {
          setConfigured(false);
          setConfigError(data.error ?? "GitHub OAuth is not configured");
          return;
        }
        setConfigured(true);
        setUser(data.user ?? null);
        setWorkspace(data.workspace ?? null);
        if (data.workspace) setWorkspaceName(data.workspace.name);
      })
      .catch(() => {
        setConfigured(false);
        setConfigError("Failed to reach auth endpoint");
      });
  }, []);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      refreshAll(),
      fetch("/api/github/repos")
        .then(async (res) => {
          const data = (await res.json()) as { repos?: Repo[]; error?: string };
          if (res.ok) {
            setRepos(data.repos ?? []);
            if (data.repos?.[0] && !form.repoFullName) {
              setForm((f) => ({
                ...f,
                repoFullName: data.repos![0].fullName,
                beforeRef: data.repos![0].defaultBranch,
                afterRef: data.repos![0].defaultBranch,
                consumerRef: data.repos![0].defaultBranch,
                baseBranch: data.repos![0].defaultBranch,
              }));
            }
          }
        })
        .catch(() => undefined),
    ]).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, refreshAll]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setWorkspace(null);
    setIntegrations([]);
    setRuns([]);
  }

  async function createIntegration(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const repo = repos.find((r) => r.fullName === form.repoFullName);
    if (!repo) {
      setError("Select a repository");
      return;
    }
    const res = await fetch("/api/integrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name || `${repo.name} repair`,
        owner: repo.owner,
        repo: repo.name,
        beforePath: form.beforePath,
        afterPath: form.afterPath,
        beforeRef: form.beforeRef || repo.defaultBranch,
        afterRef: form.afterRef || repo.defaultBranch,
        consumerPaths: form.consumerPaths
          .split(/[\n,]/)
          .map((p) => p.trim())
          .filter(Boolean),
        consumerRef: form.consumerRef || repo.defaultBranch,
        baseBranch: form.baseBranch || repo.defaultBranch,
        registerWebhook: true,
      }),
    });
    const data = (await res.json()) as { error?: string; warning?: string };
    if (!res.ok) {
      setError(data.error ?? "Failed to create integration");
      return;
    }
    setMessage(data.warning ?? "Integration created and webhook registered.");
    setShowForm(false);
    setForm((f) => ({ ...emptyForm, repoFullName: f.repoFullName }));
    await refreshAll();
  }

  async function runNow(id: string) {
    setRunningId(id);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/integrations/${id}/run`, { method: "POST" });
      const data = (await res.json()) as {
        error?: string;
        status?: string;
        pr?: { url: string; number: number } | null;
      };
      if (!res.ok) throw new Error(data.error ?? "Run failed");
      setMessage(
        data.pr
          ? `Run ${data.status}: opened ${data.pr.url}`
          : `Run ${data.status}`,
      );
      await refreshAll();
      setTab("runs");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Run failed");
    } finally {
      setRunningId(null);
    }
  }

  async function toggleEnabled(item: Integration) {
    await fetch(`/api/integrations/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !item.enabled }),
    });
    await refreshAll();
  }

  async function removeIntegration(id: string) {
    if (!confirm("Delete this integration and its webhook?")) return;
    await fetch(`/api/integrations/${id}`, { method: "DELETE" });
    await refreshAll();
  }

  async function saveWorkspace(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/workspace", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: workspaceName,
        inviteLogin: inviteLogin || undefined,
      }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(data.error ?? "Failed to update workspace");
      return;
    }
    setInviteLogin("");
    setMessage("Workspace updated");
    await refreshAll();
  }

  async function startCheckout() {
    setError(null);
    const res = await fetch("/api/billing/checkout", { method: "POST" });
    const data = (await res.json()) as { url?: string; error?: string };
    if (!res.ok || !data.url) {
      setError(data.error ?? "Checkout failed");
      return;
    }
    window.location.href = data.url;
  }

  async function openPortal() {
    const res = await fetch("/api/billing/portal", { method: "POST" });
    const data = (await res.json()) as { url?: string; error?: string };
    if (!res.ok || !data.url) {
      setError(data.error ?? "Portal failed");
      return;
    }
    window.location.href = data.url;
  }

  if (configured === null) {
    return (
      <div className="border border-line bg-bg-panel p-10 text-muted">
        Loading workspace…
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="border border-line bg-bg-panel p-8">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent-bright">
          Setup required
        </p>
        <h1 className="mt-3 text-2xl font-semibold">Connect GitHub to run Repairo</h1>
        <p className="mt-3 text-sm text-muted">{configError}</p>
        <a href="/demo" className="btn-ghost mt-8 inline-flex">
          Use fixture demo
        </a>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="border border-line bg-bg-panel p-8">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent-bright">
          SaaS workspace
        </p>
        <h1 className="mt-3 text-2xl font-semibold sm:text-3xl">
          Sign in with GitHub — then repair one of your repos
        </h1>
        <p className="mt-3 max-w-xl text-sm text-muted">
          Connect your account, pick a repository with OpenAPI + TypeScript
          consumers, run a repair, and open a real pull request you can review
          and merge.
        </p>
        {error && (
          <p className="mt-4 border border-warn/40 bg-warn/10 px-3 py-2 text-sm text-warn">
            {error}
          </p>
        )}
        <div className="mt-8 flex flex-wrap gap-3">
          <a href="/api/auth/github" className="btn-primary inline-flex">
            Continue with GitHub
          </a>
          <a href="/demo" className="btn-ghost inline-flex">
            See fixture demo first
          </a>
        </div>
        <ol className="mt-10 list-decimal space-y-2 pl-5 text-sm text-muted">
          <li>Authorize Repairo (repo read/write to open PRs)</li>
          <li>Choose before/after OpenAPI paths or two git refs</li>
          <li>Run repair → open PR on GitHub</li>
        </ol>
      </div>
    );
  }

  return (
    <div className="relative space-y-6">
      <PixelCluster className="right-0 -top-2 hidden sm:grid" />

      <HeroEnter>
        <div className="flex flex-col gap-4 border border-line bg-bg-panel p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={user.avatarUrl}
              alt=""
              className="h-10 w-10 border border-line"
            />
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent-bright">
                {workspace?.name ?? "Workspace"} · {workspace?.plan ?? "free"}
              </p>
              <h1 className="text-xl font-semibold sm:text-2xl">
                {user.name || user.login}
              </h1>
            </div>
          </div>
          <button type="button" onClick={logout} className="btn-ghost !py-2.5 !text-sm">
            Sign out
          </button>
        </div>
      </HeroEnter>

      {(error || message) && (
        <div
          className={`border px-4 py-3 text-sm ${
            error
              ? "border-warn/40 bg-warn/10 text-warn"
              : "border-safe/30 bg-safe/10 text-safe"
          }`}
        >
          {error || message}
        </div>
      )}

      <div className="flex flex-wrap gap-1 border border-line bg-bg p-2">
        {(
          [
            ["try", "Try your repo"],
            ["agents", "Vendor agents"],
            ["overview", "Overview"],
            ["integrations", "Watch"],
            ["runs", "Runs"],
            ["settings", "Settings"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`px-3 py-2 text-sm font-medium ${
              tab === id ? "bg-fg text-bg" : "text-muted hover:text-fg"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "try" && (
        <QuickRepair
          repos={repos}
          onDone={() => {
            setMessage("Pull request opened on your GitHub repo.");
            void refreshAll();
            setTab("runs");
          }}
        />
      )}

      {tab === "agents" && (
        <VendorAgents
          repos={repos}
          onInstalled={() => {
            void refreshAll();
            setTab("integrations");
            setMessage("Vendor agent installed. Click Run now to open a PR.");
          }}
        />
      )}

      {tab === "overview" && (
        <div className="space-y-4">
          {usage?.paymentIssue && (
            <div className="border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-warn">
              Payment failed or past due. Update your card in Manage billing or
              your workspace may drop back to Free limits.
            </div>
          )}
          <div className="grid gap-px bg-line sm:grid-cols-3">
            {[
              {
                label: "Plan",
                value: workspace?.plan ?? "free",
              },
              {
                label: "Integrations",
                value: usage
                  ? `${usage.used.integrations}/${usage.limits.integrations}`
                  : String(integrations.length),
              },
              {
                label: "Runs this month",
                value: usage
                  ? `${usage.used.runsThisMonth}/${usage.limits.runsPerMonth}`
                  : String(runs.length),
              },
            ].map((stat) => (
              <div key={stat.label} className="bg-bg px-4 py-5">
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-dim">
                  {stat.label}
                </p>
                <p className="mt-2 text-2xl font-semibold capitalize">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
          {usage && (
            <div className="border border-line bg-bg-panel p-5">
              <h2 className="text-lg font-medium">Usage</h2>
              <div className="mt-4 space-y-3">
                {(
                  [
                    [
                      "Integrations",
                      usage.used.integrations,
                      usage.limits.integrations,
                    ],
                    [
                      "Runs",
                      usage.used.runsThisMonth,
                      usage.limits.runsPerMonth,
                    ],
                    ["Seats", usage.used.seats, usage.limits.seats],
                  ] as const
                ).map(([label, used, limit]) => {
                  const pct = Math.min(100, Math.round((used / limit) * 100));
                  return (
                    <div key={label}>
                      <div className="flex justify-between text-xs text-muted">
                        <span>{label}</span>
                        <span className="font-mono">
                          {used} / {limit}
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 bg-line">
                        <div
                          className="h-full bg-fg transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              {workspace?.plan !== "pro" && billingConfigured && (
                <button
                  type="button"
                  onClick={() => {
                    setTab("settings");
                  }}
                  className="btn-primary mt-5 !py-2 !text-sm"
                >
                  Upgrade to Pro
                </button>
              )}
            </div>
          )}
          <div className="border border-line bg-bg-panel p-5">
            <h2 className="text-lg font-medium">Latest runs</h2>
            <div className="mt-4 space-y-2">
              {runs.slice(0, 5).map((run) => (
                <div
                  key={run.id}
                  className="flex flex-wrap items-center justify-between gap-2 border border-line bg-bg px-3 py-2 text-sm"
                >
                  <span>
                    {run.integrationName} · {run.status} · {run.trigger}
                  </span>
                  {run.prUrl ? (
                    <a
                      href={run.prUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-xs text-accent-bright"
                    >
                      PR #{run.prNumber}
                    </a>
                  ) : (
                    <span className="text-xs text-muted-dim">
                      {run.error || "—"}
                    </span>
                  )}
                </div>
              ))}
              {!runs.length && (
                <p className="text-sm text-muted">
                  No runs yet. Create an integration and click Run now.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === "integrations" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowForm((v) => !v)}
              className="btn-primary !py-2 !text-sm"
            >
              {showForm ? "Close form" : "New integration"}
            </button>
          </div>

          {showForm && (
            <form
              onSubmit={createIntegration}
              className="space-y-3 border border-line bg-bg-panel p-5"
            >
              <label className="block space-y-1 text-sm">
                <span className="font-mono text-[11px] uppercase text-muted-dim">
                  Name
                </span>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span className="font-mono text-[11px] uppercase text-muted-dim">
                  Repository
                </span>
                <select
                  value={form.repoFullName}
                  onChange={(e) => {
                    const repo = repos.find((r) => r.fullName === e.target.value);
                    setForm({
                      ...form,
                      repoFullName: e.target.value,
                      beforeRef: repo?.defaultBranch ?? form.beforeRef,
                      afterRef: repo?.defaultBranch ?? form.afterRef,
                      consumerRef: repo?.defaultBranch ?? form.consumerRef,
                      baseBranch: repo?.defaultBranch ?? form.baseBranch,
                    });
                  }}
                  className="w-full border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
                >
                  {repos.map((repo) => (
                    <option key={repo.id} value={repo.fullName}>
                      {repo.fullName}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ["beforePath", "Before OpenAPI path"],
                    ["afterPath", "After OpenAPI path"],
                    ["beforeRef", "Before ref"],
                    ["afterRef", "After ref"],
                    ["consumerRef", "Consumer ref"],
                    ["baseBranch", "PR base branch"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="block space-y-1 text-sm">
                    <span className="font-mono text-[11px] uppercase text-muted-dim">
                      {label}
                    </span>
                    <input
                      value={form[key]}
                      onChange={(e) =>
                        setForm({ ...form, [key]: e.target.value })
                      }
                      className="w-full border border-line bg-bg px-3 py-2 font-mono text-xs outline-none focus:border-accent"
                    />
                  </label>
                ))}
              </div>
              <label className="block space-y-1 text-sm">
                <span className="font-mono text-[11px] uppercase text-muted-dim">
                  Consumer paths
                </span>
                <textarea
                  value={form.consumerPaths}
                  onChange={(e) =>
                    setForm({ ...form, consumerPaths: e.target.value })
                  }
                  rows={3}
                  className="w-full border border-line bg-bg p-3 font-mono text-xs outline-none focus:border-accent"
                />
              </label>
              <button type="submit" className="btn-primary !py-2 !text-sm">
                Create + watch repo
              </button>
            </form>
          )}

          {loading && <p className="text-sm text-muted">Loading…</p>}

          <div className="space-y-3">
            {integrations.map((item) => (
              <div key={item.id} className="border border-line bg-bg-panel p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-medium">{item.name}</h3>
                    <p className="mt-1 font-mono text-xs text-muted-dim">
                      {item.fullName}
                      {item.vendorId ? ` · vendor:${item.vendorId}` : ""}
                      {item.specSource === "remote" ? " · remote OpenAPI" : ""} ·
                      webhook{" "}
                      {item.webhookId ? `#${item.webhookId}` : "not set"} ·{" "}
                      {item.enabled ? "enabled" : "paused"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => runNow(item.id)}
                      disabled={runningId === item.id}
                      className="btn-primary !py-1.5 !text-xs disabled:opacity-50"
                    >
                      {runningId === item.id ? "Running…" : "Run now"}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleEnabled(item)}
                      className="btn-ghost !py-1.5 !text-xs"
                    >
                      {item.enabled ? "Pause" : "Enable"}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeIntegration(item.id)}
                      className="btn-ghost !py-1.5 !text-xs"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {!integrations.length && !loading && (
              <p className="text-sm text-muted">
                No integrations yet. Free plan includes 1 watched integration.
              </p>
            )}
          </div>
        </div>
      )}

      {tab === "runs" && (
        <div className="space-y-3">
          {runs.map((run) => (
            <div key={run.id} className="border border-line bg-bg-panel px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{run.integrationName}</p>
                  <p className="mt-1 font-mono text-xs text-muted-dim">
                    {run.status} · {run.trigger} ·{" "}
                    {new Date(run.createdAt).toLocaleString()}
                  </p>
                </div>
                {run.prUrl && (
                  <a
                    href={run.prUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-ghost !py-1.5 !text-xs"
                  >
                    View PR #{run.prNumber}
                  </a>
                )}
              </div>
              {run.error && (
                <p className="mt-2 text-sm text-warn">{run.error}</p>
              )}
            </div>
          ))}
          {!runs.length && (
            <p className="text-sm text-muted">No repair runs yet.</p>
          )}
        </div>
      )}

      {tab === "settings" && (
        <div className="space-y-6">
          <form
            onSubmit={saveWorkspace}
            className="space-y-3 border border-line bg-bg-panel p-5"
          >
            <h2 className="text-lg font-medium">Workspace</h2>
            <label className="block space-y-1 text-sm">
              <span className="font-mono text-[11px] uppercase text-muted-dim">
                Name
              </span>
              <input
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                disabled={role !== "owner"}
                className="w-full border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent disabled:opacity-50"
              />
            </label>
            {role === "owner" && (
              <label className="block space-y-1 text-sm">
                <span className="font-mono text-[11px] uppercase text-muted-dim">
                  Invite GitHub username
                </span>
                <input
                  value={inviteLogin}
                  onChange={(e) => setInviteLogin(e.target.value)}
                  placeholder="works even before they sign in"
                  className="w-full border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
                />
              </label>
            )}
            {role === "owner" && (
              <button type="submit" className="btn-primary !py-2 !text-sm">
                Save
              </button>
            )}
          </form>

          <div className="border border-line bg-bg-panel p-5">
            <h2 className="text-lg font-medium">Members</h2>
            <ul className="mt-3 space-y-2">
              {members.map((m) => (
                <li key={m.login} className="flex items-center gap-2 text-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.avatarUrl} alt="" className="h-6 w-6 border border-line" />
                  @{m.login} · {m.role}
                </li>
              ))}
            </ul>
            {pendingInvites.length > 0 && (
              <div className="mt-4 border-t border-line pt-4">
                <p className="font-mono text-[11px] uppercase text-muted-dim">
                  Pending invites
                </p>
                <ul className="mt-2 space-y-1 text-sm text-muted">
                  {pendingInvites.map((p) => (
                    <li key={p.id}>@{p.githubLogin} · waiting for first sign-in</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="border border-line bg-bg-panel p-5">
            <h2 className="text-lg font-medium">Billing</h2>
            <p className="mt-2 text-sm text-muted">
              Current plan:{" "}
              <span className="text-fg capitalize">{workspace?.plan}</span>
              {usage ? (
                <>
                  {" "}
                  · {usage.used.integrations}/{usage.limits.integrations}{" "}
                  integrations · {usage.used.runsThisMonth}/
                  {usage.limits.runsPerMonth} runs this month
                </>
              ) : null}
              .
            </p>
            {usage?.paymentIssue && (
              <p className="mt-2 text-sm text-warn">
                Subscription status: {usage.subscriptionStatus}. Update payment
                method to keep Pro.
              </p>
            )}
            {!billingConfigured ? (
              <p className="mt-3 text-sm text-muted-dim">
                Stripe is not configured on this server. Set STRIPE_SECRET_KEY,
                STRIPE_PRICE_PRO, and STRIPE_WEBHOOK_SECRET on Railway.
              </p>
            ) : (
              <div className="mt-4 flex flex-wrap gap-2">
                {workspace?.plan !== "pro" && (
                  <button
                    type="button"
                    onClick={startCheckout}
                    className="btn-primary !py-2 !text-sm"
                  >
                    Upgrade to Pro — $29/mo
                  </button>
                )}
                <button
                  type="button"
                  onClick={openPortal}
                  className="btn-ghost !py-2 !text-sm"
                >
                  Manage billing
                </button>
                <a href="/pricing" className="btn-ghost !py-2 !text-sm">
                  Compare plans
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
