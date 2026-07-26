"use client";

import { useEffect, useState } from "react";

type Repo = {
  id: number;
  fullName: string;
  name: string;
  owner: string;
  defaultBranch: string;
};

type Vendor = {
  id: string;
  name: string;
  description: string;
  openapiUrl: string;
  homepage: string;
  tags: string[];
};

type Props = {
  repos: Repo[];
  onInstalled?: () => void;
};

export function VendorAgents({ repos, onInstalled }: Props) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorId, setVendorId] = useState("stripe");
  const [repoFullName, setRepoFullName] = useState(repos[0]?.fullName ?? "");
  const [consumerPaths, setConsumerPaths] = useState("");
  const [scanning, setScanning] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [discoveredNote, setDiscoveredNote] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/catalog")
      .then((r) => r.json())
      .then((d: { vendors?: Vendor[] }) => {
        setVendors(d.vendors ?? []);
        if (d.vendors?.[0] && !vendorId) setVendorId(d.vendors[0].id);
      })
      .catch(() => setError("Could not load vendor catalog"));
  }, [vendorId]);

  useEffect(() => {
    if (!repos[0]) return;
    setRepoFullName((v) => v || repos[0].fullName);
  }, [repos]);

  const selected = repos.find((r) => r.fullName === repoFullName) ?? repos[0];

  async function scanRepo() {
    if (!selected) return;
    setScanning(true);
    setError(null);
    setDiscoveredNote(null);
    try {
      const res = await fetch("/api/github/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: selected.owner,
          repo: selected.name,
          ref: selected.defaultBranch,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        suggested?: {
          consumerPaths?: string[];
          pythonConsumers?: string[];
          openapiPath?: string | null;
        };
        pathCount?: number;
      };
      if (!res.ok) throw new Error(data.error ?? "Discover failed");
      const paths = data.suggested?.consumerPaths ?? [];
      if (paths.length) {
        setConsumerPaths(paths.join("\n"));
        setDiscoveredNote(
          `Found ${paths.length} likely client file(s) in ${data.pathCount ?? "?"} paths` +
            (data.suggested?.openapiPath
              ? ` · in-repo OpenAPI: ${data.suggested.openapiPath}`
              : " · no in-repo OpenAPI (vendor remote will be used)"),
        );
      } else {
        setDiscoveredNote(
          "No *client* / sdk-like TypeScript files found. Enter consumer paths manually.",
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setScanning(false);
    }
  }

  async function install() {
    if (!selected) return;
    setInstalling(true);
    setError(null);
    setMessage(null);
    try {
      const paths = consumerPaths
        .split(/[\n,]/)
        .map((p) => p.trim())
        .filter(Boolean);
      const res = await fetch("/api/integrations/from-catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorId,
          owner: selected.owner,
          repo: selected.name,
          consumerPaths: paths.length ? paths : undefined,
          autoDiscover: !paths.length,
          baseBranch: selected.defaultBranch,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        warning?: string | null;
        note?: string;
        integration?: { id: string; name: string };
      };
      if (!res.ok) throw new Error(data.error ?? "Install failed");
      setMessage(
        [
          `Installed ${data.integration?.name ?? "agent"}.`,
          data.note,
          data.warning,
        ]
          .filter(Boolean)
          .join(" "),
      );
      onInstalled?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Install failed");
    } finally {
      setInstalling(false);
    }
  }

  if (!repos.length) {
    return (
      <p className="text-sm text-muted">
        Connect a writable GitHub repo first to install a vendor agent.
      </p>
    );
  }

  return (
    <div className="space-y-4 border border-line bg-bg-panel p-5">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-dim">
          Vendor agents
        </p>
        <h2 className="mt-2 text-lg font-medium">
          Install a Dependabot-style API agent
        </h2>
        <p className="mt-2 text-sm text-muted">
          Watch a public vendor OpenAPI remotely, scan your repo for consumers,
          open repair PRs when the contract moves.
        </p>
      </div>

      {error && (
        <div className="border border-warn/40 bg-warn/10 px-3 py-2 text-sm text-warn">
          {error}
        </div>
      )}
      {message && (
        <div className="border border-safe/30 bg-safe/10 px-3 py-2 text-sm text-safe">
          {message}
        </div>
      )}

      <label className="block space-y-1 text-sm">
        <span className="font-mono text-[11px] uppercase text-muted-dim">
          Vendor
        </span>
        <select
          value={vendorId}
          onChange={(e) => setVendorId(e.target.value)}
          className="w-full border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
        >
          {vendors.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      </label>
      {vendors.find((v) => v.id === vendorId) && (
        <p className="text-xs text-muted">
          {vendors.find((v) => v.id === vendorId)?.description}
        </p>
      )}

      <label className="block space-y-1 text-sm">
        <span className="font-mono text-[11px] uppercase text-muted-dim">
          Customer repo
        </span>
        <select
          value={repoFullName}
          onChange={(e) => setRepoFullName(e.target.value)}
          className="w-full border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
        >
          {repos.map((repo) => (
            <option key={repo.id} value={repo.fullName}>
              {repo.fullName}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1 text-sm">
        <span className="font-mono text-[11px] uppercase text-muted-dim">
          Consumer paths (optional — auto-discover if empty)
        </span>
        <textarea
          value={consumerPaths}
          onChange={(e) => setConsumerPaths(e.target.value)}
          rows={3}
          placeholder={"src/stripe-client.ts\nsrc/payments/api.ts"}
          className="w-full border border-line bg-bg p-3 font-mono text-xs outline-none focus:border-accent"
        />
      </label>
      {discoveredNote && (
        <p className="text-xs text-muted-dim">{discoveredNote}</p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={scanRepo}
          disabled={scanning}
          className="btn-ghost !py-2 !text-sm disabled:opacity-50"
        >
          {scanning ? "Scanning…" : "Scan repo"}
        </button>
        <button
          type="button"
          onClick={install}
          disabled={installing}
          className="btn-primary !py-2 !text-sm disabled:opacity-50"
        >
          {installing ? "Installing…" : "Install agent"}
        </button>
      </div>
    </div>
  );
}
