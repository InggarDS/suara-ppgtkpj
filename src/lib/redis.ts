import Redis, { type RedisOptions } from "ioredis";

/**
 * Shared Redis connections for the app.
 *
 *   redis()          — general commands (GET/SET/DEL/PUBLISH)   [Tier 1 cache]
 *   redisSub()       — dedicated SUBSCRIBE connection            [Tier 2 pub/sub]
 *   bullConnection() — a fresh connection for BullMQ             [Tier 3 queue]
 *
 * Everything degrades gracefully: when REDIS_URL is unset (or Redis is
 * unreachable) the factories return null / the clients error out, and every
 * caller is written to fall back to the direct path (recompute, in-process
 * EventEmitter, inline email send). A single-instance VPS with no Redis keeps
 * working exactly as before.
 */

const URL = process.env.REDIS_URL?.trim();

export function redisEnabled(): boolean {
  return Boolean(URL);
}

type Slot = Redis | null | undefined;
type G = typeof globalThis & {
  __suaraRedisCmd?: Slot;
  __suaraRedisSub?: Slot;
};
const g = globalThis as G;

function make(opts: RedisOptions = {}): Redis | null {
  if (!URL) return null;
  const client = new Redis(URL, {
    enableAutoPipelining: true,
    retryStrategy: (times) => Math.min(times * 200, 2000),
    reconnectOnError: () => true,
    ...opts,
  });
  // ioredis emits "error" on every failed reconnect; log the first, then stay
  // quiet until it recovers so the logs don't fill up when Redis is down.
  let logged = false;
  client.on("error", (e: Error) => {
    if (logged) return;
    logged = true;
    console.warn("[redis] connection error:", e.message);
  });
  client.on("ready", () => {
    logged = false;
  });
  return client;
}

/** General command connection. `maxRetriesPerRequest: 2` so a Redis outage
 *  surfaces as a fast rejection instead of hanging an SSE push. */
export function redis(): Redis | null {
  if (g.__suaraRedisCmd === undefined) g.__suaraRedisCmd = make({ maxRetriesPerRequest: 2 });
  return g.__suaraRedisCmd;
}

/** Dedicated connection for SUBSCRIBE — a subscribed client cannot issue other
 *  commands, so it must not be shared with `redis()`. */
export function redisSub(): Redis | null {
  if (g.__suaraRedisSub === undefined) g.__suaraRedisSub = make({ maxRetriesPerRequest: null });
  return g.__suaraRedisSub;
}

/** BullMQ requires its own connection with `maxRetriesPerRequest: null`. Each
 *  call returns a new client (Queue and Worker must not share one). */
export function bullConnection(): Redis | null {
  return make({ maxRetriesPerRequest: null });
}
