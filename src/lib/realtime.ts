import { EventEmitter } from "node:events";
import { revalidatePath } from "next/cache";

/**
 * In-process pub/sub for realtime fan-out to SSE clients. A single deployment
 * instance is assumed (per the app's "no websocket infra" design); every SSE
 * stream also self-heals on a timer, so a missed emit is not fatal.
 */
const g = globalThis as unknown as { __suaraBus?: EventEmitter; __suaraDebounce?: Map<string, NodeJS.Timeout> };
const bus = (g.__suaraBus ??= new EventEmitter());
bus.setMaxListeners(0);
const debounce = (g.__suaraDebounce ??= new Map());

function channel(eventId: string) {
  return `change:${eventId}`;
}

/** Notify all SSE subscribers that this event's data changed (debounced). */
export function publish(eventId: string) {
  const existing = debounce.get(eventId);
  if (existing) clearTimeout(existing);
  debounce.set(
    eventId,
    setTimeout(() => {
      debounce.delete(eventId);
      bus.emit(channel(eventId));
    }, 200)
  );
}

export function subscribe(eventId: string, cb: () => void) {
  const ch = channel(eventId);
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
