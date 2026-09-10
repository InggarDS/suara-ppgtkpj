import { EventEmitter } from "node:events";
import { revalidatePath } from "next/cache";
import { redis, redisSub } from "@/lib/redis";
import { invalidateEvent } from "@/lib/cache";

/**
 * Realtime fan-out to SSE clients.
 *
 * Local delivery is always an in-process EventEmitter — every SSE stream on THIS
 * instance subscribes to it. On top of that, when Redis is configured, a single
 * shared `SUBSCRIBE` connection bridges other app instances: a change published
 * on any instance is re-emitted on every instance's local bus. That is what lets
 * you run `docker compose up -d --scale app=2` behind Caddy.
 *
 * Without Redis this behaves exactly as the original single-instance design:
 * local EventEmitter only, plus each stream's 5s self-heal timer.
 *
 * `publish()` also clears the Tier 1 snapshot cache (once, on the publishing
 * instance — the cache is shared in Redis) BEFORE notifying listeners, so every
 * instance's next recompute reads fresh data.
 */

const CHANNEL = "suara:changes";

type G = typeof globalThis & {
  __suaraBus?: EventEmitter;
  __suaraDebounce?: Map<string, NodeJS.Timeout>;
  __suaraSubStarted?: boolean;
};
const g = globalThis as G;

const bus = (g.__suaraBus ??= new EventEmitter());
bus.setMaxListeners(0);
const debounce = (g.__suaraDebounce ??= new Map());

function localChannel(eventId: string) {
  return `change:${eventId}`;
}

/** Start the cross-instance subscriber once per process (idempotent). Called
 *  lazily from `subscribe()`, i.e. only inside the Node SSE routes. */
function ensureSubscriber() {
  if (g.__suaraSubStarted) return;
  const sub = redisSub();
  if (!sub) return;
  g.__suaraSubStarted = true;
  sub.subscribe(CHANNEL).catch((e: Error) => {
    console.warn("[realtime] subscribe failed:", e.message);
    g.__suaraSubStarted = false;
  });
  sub.on("message", (ch: string, msg: string) => {
    if (ch === CHANNEL && msg) bus.emit(localChannel(msg));
  });
}

async function fire(eventId: string) {
  debounce.delete(eventId);
  // Clear the shared snapshot cache first so every instance recomputes fresh.
  await invalidateEvent(eventId);
  // This instance's SSE streams.
  bus.emit(localChannel(eventId));
  // Other instances (no-op / harmless when Redis is absent).
  const r = redis();
  if (r) {
    try {
      await r.publish(CHANNEL, eventId);
    } catch {
      /* local emit + per-stream self-heal still cover the single-instance case */
    }
  }
}

/** Notify all SSE subscribers that this event's data changed (debounced 200ms). */
export function publish(eventId: string) {
  const existing = debounce.get(eventId);
  if (existing) clearTimeout(existing);
  debounce.set(
    eventId,
    setTimeout(() => void fire(eventId), 200),
  );
}

export function subscribe(eventId: string, cb: () => void) {
  ensureSubscriber();
  const ch = localChannel(eventId);
  bus.on(ch, cb);
  return () => bus.off(ch, cb);
}

/** Revalidate the admin routes for an event and push a realtime update. */
export function revalidateAndPublish(eventId: string) {
  revalidatePath(`/admin/events/${eventId}/flow`);
  revalidatePath(`/admin/events/${eventId}/monitor`);
  revalidatePath(`/admin/events/${eventId}/results`);
  revalidatePath(`/admin/events/${eventId}`);
  publish(eventId);
}
