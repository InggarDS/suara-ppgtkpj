"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useEventStream } from "@/hooks/use-event-stream";

/** Refreshes the server-rendered flow page whenever the event's data changes. */
export default function FlowRealtime({ eventId }: { eventId: string }) {
  const router = useRouter();
  const snap = useEventStream<unknown>(`/api/admin/events/${eventId}/stream`);
  const seen = useRef<string>("");

  useEffect(() => {
    if (snap === undefined) return;
    const sig = JSON.stringify(snap);
    if (sig === seen.current) return;
    seen.current = sig;
    router.refresh();
  }, [snap, router]);

  return null;
}
