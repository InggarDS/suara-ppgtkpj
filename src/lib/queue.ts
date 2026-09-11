import { Queue, type JobsOptions } from "bullmq";
import { bullConnection, redisEnabled } from "@/lib/redis";

/**
 * Tier 3 — background jobs (BullMQ, backed by the same Redis).
 *
 * Chosen over RabbitMQ deliberately: the only durable-work need here is the bulk
 * token-email blast (hundreds of Resend calls, rate-limited to 2/s). BullMQ
 * reuses the Redis you already run — no second stateful broker to operate on a
 * 1 GB VPS. Reach for RabbitMQ/Kafka only with multiple consuming services or
 * strict ordering/delivery guarantees; this app has neither.
 *
 * The queue is optional: without Redis `queueEnabled()` is false and callers
 * send inline instead.
 */

// BullMQ forbids ":" in a queue name (it is the internal Redis key separator).
export const EMAIL_QUEUE = "suara-email";

export type TokenEmailJob = {
  eventId: string;
  participantId: string;
  to: string;
  toName?: string | null;
  subject: string;
  html: string;
  text: string;
};

type G = typeof globalThis & { __suaraEmailQueue?: Queue | null };
const g = globalThis as G;

export function emailQueue(): Queue | null {
  if (g.__suaraEmailQueue === undefined) {
    try {
      const connection = bullConnection();
      g.__suaraEmailQueue = connection
        ? new Queue(EMAIL_QUEUE, {
            connection,
            defaultJobOptions: {
              attempts: 4,
              backoff: { type: "exponential", delay: 5_000 },
              removeOnComplete: 500,
              removeOnFail: 1_000,
            },
          })
        : null;
    } catch (err) {
      // Never let queue construction break a caller — degrade to inline send.
      console.error("[queue] email queue unavailable:", err instanceof Error ? err.message : err);
      g.__suaraEmailQueue = null;
    }
  }
  return g.__suaraEmailQueue;
}

export function queueEnabled(): boolean {
  return redisEnabled() && emailQueue() !== null;
}

export async function enqueueTokenEmails(
  jobs: TokenEmailJob[],
  opts?: JobsOptions,
): Promise<{ queued: number }> {
  const q = emailQueue();
  if (!q || jobs.length === 0) return { queued: 0 };
  await q.addBulk(jobs.map((data) => ({ name: "token", data, opts })));
  return { queued: jobs.length };
}
