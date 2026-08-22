"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { ResultsSnapshot } from "@/lib/results";
import ProjectorBoard from "@/app/admin/events/[id]/results/projector-board";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function PresentView({
  eventId,
  eventName,
  initial,
}: {
  eventId: string;
  eventName: string;
  initial: ResultsSnapshot | null;
}) {
  const { data } = useSWR<ResultsSnapshot>(`/api/admin/events/${eventId}/results`, fetcher, {
    fallbackData: initial ?? undefined,
    refreshInterval: 3000,
  });
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  return (
    <div className="min-h-screen w-full bg-stage-dark text-[#F4F2EE] relative overflow-hidden flex items-center justify-center p-12">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: "radial-gradient(rgba(255,255,255,.05) 1px,transparent 1px)", backgroundSize: "22px 22px" }}
      />
      {data && <ProjectorBoard eventName={eventName} data={data} />}

      {!isFullscreen && (
        <button
          onClick={() => {
            document.documentElement.requestFullscreen().catch(() => {});
          }}
          className="absolute top-5 right-5 font-mono text-[11px] tracking-[.08em] uppercase text-stage-dim border border-stage-dark-4 rounded-md px-3 py-2 cursor-pointer hover:text-[#F4F2EE] hover:border-stage-dim bg-stage-dark-3/60"
        >
          Enter fullscreen
        </button>
      )}
    </div>
  );
}
