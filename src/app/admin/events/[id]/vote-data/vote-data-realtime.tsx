"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Keeps the server-rendered Management Data Vote page in sync with the
 * underlying participant/credential data — polls a lightweight signature and
 * refreshes when it changes (e.g. a participant just registered or replaced
 * their photo). Mirrors the polling approach used for live monitoring.
 */
export default function VoteDataRealtime({ eventId }: { eventId: string }) {
  const router = useRouter();
  const seen = useRef<string | null>(null);

  useEffect(() => {
    let stopped = false;

    async function check() {
      try {
        const res = await fetch(`/api/admin/events/${eventId}/vote-data-sig`, { cache: "no-store" });
        if (!res.ok || stopped) return;
        const { sig } = (await res.json()) as { sig: string };
        if (seen.current === null) {
          seen.current = sig;
          return;
        }
        if (sig !== seen.current) {
          seen.current = sig;
          router.refresh();
        }
      } catch {
        /* transient — try again next tick */
      }
    }

    void check();
    const timer = setInterval(check, 5000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [eventId, router]);

  return null;
}
