export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startVendorPoller } = await import("@/lib/jobs/vendor-poller");
    startVendorPoller();
  }
}
