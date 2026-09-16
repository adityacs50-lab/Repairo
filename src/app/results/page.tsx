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
    <div>
      <SiteHeader active="demo" />
      <main className="product-main">
        <div className="product-page-stack layout-contained">
          {loading && (
            <div className="rounded border border-[var(--repairo-rule)] bg-[var(--repairo-white)] p-12 text-center text-sm text-[var(--repairo-muted)]">
              Loading migration results…
            </div>
          )}

          {error && (
            <div className="rounded border border-red-900/50 bg-red-950/30 p-6 text-sm text-red-300">
              Failed to load migration results: {error}
            </div>
          )}

          {!loading && !error && <MigrationResults data={data} theme="light" />}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
