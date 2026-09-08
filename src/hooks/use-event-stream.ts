"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Subscribe to a Server-Sent Events endpoint and return the latest JSON payload.
 *
 * - On mount it does one immediate REST fetch so the UI never hangs while the
 *   stream is negotiating (or if EventSource is unavailable).
 * - The live channel is EventSource; on repeated failure it falls back to
 *   polling `restUrl` every 3s.
 *
 * `restUrl` defaults to the stream URL with the trailing `/stream` segment
 * removed — pass it explicitly when the REST sibling has a different path.
 * Pass `url = null` to disable (e.g. before hydration / missing token).
 */
export function useEventStream<T>(url: string | null, restUrl?: string): T | undefined {
  const [data, setData] = useState<T>();
  const failures = useRef(0);

  useEffect(() => {
    if (!url) return;

    const rest = restUrl ?? url.replace(/\/stream(\?|$)/, "$1");
    let es: EventSource | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;

    const fetchOnce = async () => {
      try {
        const res = await fetch(rest, { cache: "no-store" });
        if (res.ok && !stopped) setData((await res.json()) as T);
      } catch {
        /* ignore */
      }
    };

    const startPolling = () => {
      if (pollTimer || stopped) return;
      void fetchOnce();
      pollTimer = setInterval(fetchOnce, 3000);
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
          /* malformed frame */
        }
      };
      es.onerror = () => {
        es?.close();
        es = null;
        failures.current += 1;
        if (failures.current >= 3) startPolling();
        else reconnectTimer = setTimeout(connect, 1000 * failures.current);
      };
    };

    // seed immediately, then open the live channel
    void fetchOnce();
    connect();

    return () => {
      stopped = true;
      es?.close();
      if (pollTimer) clearInterval(pollTimer);
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [url, restUrl]);

  return data;
}
