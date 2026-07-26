import { pollVendorAgents } from "@/lib/jobs/poll-vendors";

const globalPoller = globalThis as unknown as {
  __repairoVendorPoller?: NodeJS.Timeout;
};

/** Optional in-process poller when VENDOR_POLL_MS is set (Railway-friendly). */
export function startVendorPoller() {
  const ms = Number(process.env.VENDOR_POLL_MS || "0");
  if (!ms || ms < 60_000) return;
  if (globalPoller.__repairoVendorPoller) return;

  const tick = () => {
    void pollVendorAgents({ limit: 10 }).catch((err) => {
      console.error("[vendor-poller]", err);
    });
  };

  // Stagger first tick so boot isn't blocked
  setTimeout(tick, 15_000);
  globalPoller.__repairoVendorPoller = setInterval(tick, ms);
  console.info(`[vendor-poller] started every ${ms}ms`);
}
