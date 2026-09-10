import { Worker, type Job } from "bullmq";
import { bullConnection } from "@/lib/redis";
import { EMAIL_QUEUE, type TokenEmailJob } from "@/lib/queue";
import { sendEmails } from "@/lib/email";
import { prisma } from "@/lib/prisma";

/**
 * Tier 3 — the consumer for `EMAIL_QUEUE`.
 *
 * Started once per process from `src/instrumentation.ts` (so it lives inside the
 * app container — no separate service to deploy on a single VPS). To run a
 * dedicated worker later: set `RUN_WORKER=0` on the web instances and run one
 * process that imports and calls `startEmailWorker()`.
 *
 * The `limiter` caps throughput at Resend's 2 req/s regardless of concurrency.
 * Failed jobs retry with exponential backoff (see queue defaultJobOptions).
 */

type G = typeof globalThis & { __suaraEmailWorker?: Worker | null };
const g = globalThis as G;

async function processJob(job: Job<TokenEmailJob>) {
  const { participantId, to, toName, subject, html, text } = job.data;

  const report = await sendEmails([{ to, toName: toName ?? undefined, subject, html, text }]);
  if (!report.ok) {
    // Throw so BullMQ records the failure and retries.
    throw new Error(report.failed[0]?.error ?? report.error ?? "email send failed");
  }

  await prisma.participant
    .update({ where: { id: participantId }, data: { tokenSentAt: new Date() } })
    .catch(() => {
      /* participant deleted between enqueue and send — the email still went out */
    });

  return { to };
}

/** Idempotent: returns the existing worker (or null when Redis is absent). */
export function startEmailWorker(): Worker | null {
  if (g.__suaraEmailWorker !== undefined) return g.__suaraEmailWorker;

  const connection = bullConnection();
  if (!connection) {
    g.__suaraEmailWorker = null;
    return null;
  }

  const concurrency = Math.max(1, Number(process.env.EMAIL_QUEUE_CONCURRENCY) || 4);
  const worker = new Worker<TokenEmailJob>(EMAIL_QUEUE, processJob, {
    connection,
    concurrency,
    limiter: { max: 2, duration: 1_100 }, // Resend: 2 requests / second
  });

  worker.on("failed", (job, err) => {
    console.warn(`[email-worker] job ${job?.id} failed (attempt ${job?.attemptsMade}):`, err.message);
  });

  g.__suaraEmailWorker = worker;
  console.log(`[email-worker] started — queue "${EMAIL_QUEUE}", concurrency ${concurrency}`);
  return worker;
}
