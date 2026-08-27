"use client";

import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { MigrationResults } from "@/components/MigrationResults";

export default function ResultsPage() {
  const [data, setData] = useState<unknown | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/repair")
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to fetch migration results");
        return res.json();
      })
      .then((payload) => {
        setData(payload.result);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="unkey-canvas min-h-screen bg-neutral-950 text-slate-100">
      <SiteHeader active="demo" />
      <main className="relative z-10 mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6">
        {loading && (
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-12 text-center text-sm text-neutral-400">
            Loading Migration Results output…
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-800 bg-red-950/40 p-6 text-sm text-red-400">
            Failed to load migration results: {error}
          </div>
        )}

        {!loading && !error && <MigrationResults data={data} />}
      </main>
      <SiteFooter />
    </div>
  );
}
