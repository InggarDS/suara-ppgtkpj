"use client";

import { ResultsSnapshot } from "@/lib/results";
import { useStageQrVisibility } from "@/components/ui/invite-qr";
import { useEventStream } from "@/hooks/use-event-stream";
import ProjectorBoard from "./projector-board";

const PHASE_LABEL: Record<string, string> = {
  idle: "Belum dimulai",
  checkin: "Check-in",
  voting: "Voting berjalan",
  result: "Hasil dibuka",
};

export default function ResultsView({
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
  const stream = useEventStream<{ results: ResultsSnapshot | null }>(
    `/api/admin/events/${eventId}/stream`,
    `/api/admin/events/${eventId}/live`
  );
  const data = stream?.results ?? initial ?? null;
  const [showQr, setShowQr] = useStageQrVisibility(eventId);

  if (!data) return null;

  function presentFullscreen() {
    const w = window.open(
      `/present/${eventId}`,
      "suara-present",
      `popup=yes,width=${screen.width},height=${screen.height},left=0,top=0`
    );
    w?.focus();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 bg-card border border-border-1 rounded-[20px] px-4 py-3">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#8D97C2" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 4.5h18v12H3zM9 20.5h6"></path>
        </svg>
        <span className="flex-1 text-[13px] text-ink-soft">
          Projector output — participants never see results on their own device.
        </span>
        <span className="text-[11.5px] font-medium text-brand bg-brand-soft rounded-full px-2.5 py-1">
          {data.votingComplete ? "Voting selesai" : PHASE_LABEL[data.phase] ?? data.phase}
          {!data.votingComplete && data.phase === "voting" ? ` · ${data.votingPct}%` : ""}
          {!data.votingComplete && data.phase === "checkin" ? ` · ${data.checkInPct}%` : ""}
        </span>
        <button
          onClick={() => setShowQr(!showQr)}
          className={`flex items-center gap-1.5 text-[12.5px] font-medium rounded-lg px-3.5 py-2 border cursor-pointer ${
            showQr ? "bg-brand-soft text-brand border-border-1" : "bg-card text-ink-soft border-border-1"
          }`}
        >
          {showQr ? "Hide QR" : "Show QR"}
        </button>
        <button
          onClick={presentFullscreen}
          className="flex items-center gap-1.5 text-[12.5px] font-semibold rounded-full px-3.5 py-2 border-none btn-gradient cursor-pointer"
        >
          Present fullscreen
        </button>
      </div>

      <div className="elevated bg-stage-dark rounded-[28px] px-13 py-11 text-white relative overflow-hidden flex items-center justify-center">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: "radial-gradient(rgba(255,255,255,.05) 1px,transparent 1px)", backgroundSize: "22px 22px" }}
        />
        <ProjectorBoard eventName={eventName} data={data} inviteUrl={inviteUrl} showQr={showQr} />
      </div>

      <p className="text-[11.5px] text-faint px-1">
        Result masking and the “Buka hasil” action live on the <strong>Voting flow</strong> tab and unlock only
        when voting reaches 100%.
      </p>
    </div>
  );
}
