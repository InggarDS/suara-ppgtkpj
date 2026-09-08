"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { ResultsSnapshot } from "@/lib/results";
import { useStageQrVisibility } from "@/components/ui/invite-qr";
import ProjectorBoard from "@/app/admin/events/[id]/results/projector-board";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function PresentView({
  eventId,
  eventName,
  inviteUrl,
  initial,
}: {
  eventId: string;
  eventName: string;
  inviteUrl: string;
  initial: ResultsSnapshot | null;
}) {
  const { data } = useSWR<ResultsSnapshot>(`/api/admin/events/${eventId}/results`, fetcher, {
    fallbackData: initial ?? undefined,
    refreshInterval: 3000,
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showQr] = useStageQrVisibility(eventId);

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  return (
    <div
      className="min-h-screen w-full bg-stage-dark text-white relative overflow-hidden flex items-center justify-center p-12"
      style={{
        backgroundImage:
          "radial-gradient(900px 600px at 100% 0%, rgba(77,123,245,.35), transparent 60%), radial-gradient(800px 520px at 0% 100%, rgba(27,77,228,.28), transparent 60%), var(--gradient-navy)",
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: "radial-gradient(rgba(255,255,255,.05) 1px,transparent 1px)", backgroundSize: "22px 22px" }}
      />
      {data && <ProjectorBoard eventName={eventName} data={data} inviteUrl={inviteUrl} showQr={showQr} />}

      <div className="absolute bottom-3 left-0 right-0 text-center font-mono text-[10px] tracking-[.08em] text-stage-dimmer">
        © PPGT Klasis Pulau Jawa 2026
      </div>

      {!isFullscreen && (
        <button
          onClick={() => {
            document.documentElement.requestFullscreen().catch(() => {});
          }}
          className="absolute top-5 right-5 font-mono text-[11px] tracking-[.08em] uppercase text-stage-dim border border-stage-dark-4 rounded-md px-3 py-2 cursor-pointer hover:text-[#F4F7FF] hover:border-stage-dim bg-stage-dark-3/60"
        >
          Enter fullscreen
        </button>
      )}
    </div>
  );
}
