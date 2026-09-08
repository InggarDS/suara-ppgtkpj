"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Subscribe to a Server-Sent Events endpoint and return the latest JSON payload.
 * Falls back to fetch-polling the sibling REST endpoint (same URL without the
 * trailing `/stream`, query preserved) if the stream cannot be established.
 * Pass `null` to disable (e.g. before hydration / no token).
 */
export function useEventStream<T>(url: string | null): T | undefined {
  const [data, setData] = useState<T>();
  const failures = useRef(0);

  useEffect(() => {
    if (!url) return;

    let es: EventSource | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;

    const restUrl = url.replace("/stream", "");

    const startPolling = () => {
      if (pollTimer || stopped) return;
      const tick = async () => {
        try {
          const res = await fetch(restUrl, { cache: "no-store" });
          if (res.ok) setData((await res.json()) as T);
        } catch {
          /* keep trying */
        }
      };
      void tick();
      pollTimer = setInterval(tick, 3000);
    };

    const connect = () => {
      if (stopped) return;
      try {
        es = new EventSource(url);
      } catch {
        startPolling();
        return;
      }
      es.onmessage = (e) => {
        if (!e.data) return;
        try {
          setData(JSON.parse(e.data) as T);
          failures.current = 0;
        } catch {
          /* ignore malformed frame */
        }
      };
      es.onerror = () => {
        es?.close();
        es = null;
        failures.current += 1;
        if (failures.current >= 3) {
          startPolling();
        } else {
          reconnectTimer = setTimeout(connect, 1000 * failures.current);
        }
      };
    };

    connect();

    return () => {
      stopped = true;
      es?.close();
      if (pollTimer) clearInterval(pollTimer);
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [url]);

  return data;
}
