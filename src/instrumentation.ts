/**
 * Next.js instrumentation hook — runs once when the server process starts.
 * We use it to start the Tier 3 BullMQ email worker in-process, so a
 * single-container VPS deploy needs no separate worker service.
 *
 * Disable with RUN_WORKER=0 (e.g. on web instances when you run a dedicated
 * worker elsewhere). No-op without Redis / on the Edge runtime.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.RUN_WORKER === "0") return;

  const { startEmailWorker } = await import("@/lib/email-worker");
  startEmailWorker();
}
