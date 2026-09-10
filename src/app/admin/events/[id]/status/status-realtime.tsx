"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useEventStream } from "@/hooks/use-event-stream";

/** Refreshes the server-rendered Status Peserta page whenever the event changes
 *  (a registration, check-in or vote). Same pattern as the flow page. */
export default function StatusRealtime({ eventId }: { eventId: string }) {
  const router = useRouter();
  const snap = useEventStream<unknown>(`/api/admin/events/${eventId}/stream`, `/api/admin/events/${eventId}/live`);
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
