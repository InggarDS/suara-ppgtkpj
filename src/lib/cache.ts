import { redis } from "@/lib/redis";

/**
 * Tier 1 — read-through snapshot cache.
 *
 * The participant waiting screen, the admin monitor, and the results/projector
 * board all recompute a multi-query Prisma snapshot on every SSE (re)connect and
 * every poll. Under a vote burst (hundreds of devices polling every few seconds)
 * that is the first thing to overload Postgres. We cache each snapshot in Redis
 * with a short TTL and clear it explicitly whenever the event changes
 * (`invalidateEvent`, called from `publish()` in realtime.ts).
 *
 * Payloads must be plain JSON (no Date / Map / class instances) — the snapshot
 * builders already return primitives, arrays and strings, so JSON round-trips
 * losslessly. If a future field adds a Date, serialise it to a string first.
 */

const PREFIX = "suara:";
const DEFAULT_TTL = Math.max(1, Number(process.env.CACHE_TTL_SECONDS) || 3);

export const cacheKeys = {
  results: (eventId: string) => `${PREFIX}snap:results:${eventId}`,
  monitor: (eventId: string) => `${PREFIX}snap:monitor:${eventId}`,
  participantState: (publicId: string, tokenHash: string) =>
    `${PREFIX}snap:ps:${publicId}:${tokenHash}`,
  /** Set of every participant-state key belonging to one event, so we can wipe
   *  them on invalidation without a SCAN. */
  eventIndex: (eventId: string) => `${PREFIX}idx:evt:${eventId}`,
  pubToId: (publicId: string) => `${PREFIX}map:pub2id:${publicId}`,
};

type CachedOptions = {
  ttl?: number;
  /** When set, the key is also added to this Redis set so `invalidateEvent`
   *  can find and delete it. */
  indexKey?: string;
};

/**
 * Return the cached value for `key`, or run `loader()`, cache its result, and
 * return it. `null` / `undefined` results are treated as "not found" and are
 * NOT cached (cheap to recompute, and avoids poisoning the key with a miss).
 * Any Redis failure falls straight through to `loader()`.
 */
export async function cached<T>(
  key: string,
  loader: () => Promise<T>,
  opts: CachedOptions = {},
): Promise<T> {
  const r = redis();
  if (!r) return loader();

  try {
    const raw = await r.get(key);
    if (raw !== null) return JSON.parse(raw) as T;
  } catch {
    return loader();
  }

  const value = await loader();
  if (value != null) {
    const ttl = opts.ttl ?? DEFAULT_TTL;
    try {
      const p = r.pipeline();
      p.set(key, JSON.stringify(value), "EX", ttl);
      if (opts.indexKey) {
        p.sadd(opts.indexKey, key);
        p.expire(opts.indexKey, ttl + 30);
      }
      await p.exec();
    } catch {
      /* ignore cache write failures */
    }
  }
  return value;
}

/** Drop every cached snapshot for one event. Best-effort — a no-op without Redis. */
export async function invalidateEvent(eventId: string): Promise<void> {
  const r = redis();
  if (!r) return;
  try {
    const idx = cacheKeys.eventIndex(eventId);
    const members = await r.smembers(idx);
    await r.del(idx, cacheKeys.results(eventId), cacheKeys.monitor(eventId), ...members);
  } catch {
    /* ignore */
  }
}
