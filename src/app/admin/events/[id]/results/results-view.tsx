"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { ResultsSnapshot } from "@/lib/results";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { setRevealAction } from "./actions";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ResultsView({
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
  const [confirmKind, setConfirmKind] = useState<"reveal" | "hide" | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      stageRef.current?.requestFullscreen();
    }
  }

  if (!data) return null;
  const revealed = data.revealed;

  const kind =
    confirmKind === "reveal"
      ? {
          title: "Unlock candidate identities?",
          body: "Names are hidden on the shared screen until you unlock them. Everyone in the hall will see who each bar belongs to — this is recorded in the audit trail.",
          word: "REVEAL",
          cta: "Unlock names",
        }
      : {
          title: "Hide candidate identities again?",
          body: "The shared screen returns to percentages only. Bars keep their position and colour.",
          word: "HIDE",
          cta: "Hide names",
        };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 bg-card border border-border-1 rounded-[11px] px-4 py-3">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#6C6A64" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 4.5h18v12H3zM9 20.5h6"></path>
        </svg>
        <span className="flex-1 text-[13px] text-ink-soft">Projector output — participants never see results on their own device.</span>
        <button
          onClick={() => setConfirmKind(revealed ? "hide" : "reveal")}
          className={`flex items-center gap-1.5 text-[12.5px] font-medium rounded-lg px-3.5 py-2 border cursor-pointer ${
            revealed ? "bg-brand-soft text-brand border-border-1" : "bg-white text-ink-soft border-border-1"
          }`}
        >
          {revealed ? "Lock names" : "Unlock names"}
        </button>
        <button
          onClick={toggleFullscreen}
          className="flex items-center gap-1.5 text-[12.5px] font-medium rounded-lg px-3.5 py-2 border border-border-1 bg-ink text-white cursor-pointer"
        >
          {isFullscreen ? "Exit fullscreen" : "Present fullscreen"}
        </button>
      </div>

      <div
        ref={stageRef}
        className="bg-stage-dark rounded-[14px] px-13 py-11 text-[#F4F2EE] relative overflow-hidden [&:fullscreen]:rounded-none [&:fullscreen]:flex [&:fullscreen]:items-center [&:fullscreen]:justify-center"
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: "radial-gradient(rgba(255,255,255,.05) 1px,transparent 1px)", backgroundSize: "22px 22px" }}
        />
        <div className="relative w-full max-w-[900px] flex flex-col" style={{ maxHeight: "min(900px, 82vh)" }}>
          <div className="flex items-baseline gap-3 mb-1.5 flex-none">
            <span className="font-mono text-[11px] tracking-[.12em] text-stage-dimmer uppercase">{eventName}</span>
            <span className="flex-1" />
            <span className="font-mono text-xs text-stage-dimmer">
              {data.totalVotes} / {data.denom} votes {data.live && "· live"}
            </span>
          </div>
          <div className="flex items-baseline gap-3.5 mb-6.5 flex-none">
            <h2 className="m-0 text-[32px] font-semibold tracking-tight">{data.stageName ?? "No stage"}</h2>
            {data.live && (
              <span className="flex items-center gap-1.5 font-mono text-[11px] tracking-[.1em] uppercase text-brand-accent-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-pulse-dot" />
                Live
              </span>
            )}
            <span className="flex-1" />
            {!revealed && (
              <span className="flex items-center gap-1.5 font-mono text-[11px] tracking-[.1em] uppercase text-stage-dim border border-stage-dark-4 rounded-md px-2.5 py-1.5 flex-none">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="10.5" width="16" height="10" rx="2"></rect>
                  <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"></path>
                </svg>
                Names locked
              </span>
            )}
          </div>
          <div className="flex flex-col gap-1.5 overflow-y-auto pr-1">
            {data.results.map((r, i) => (
              <div key={r.id} className="flex items-center gap-3">
                <span className="font-mono text-[11px] text-stage-dimmer w-5 flex-none text-right">{i + 1}</span>
                {revealed && r.initials ? (
                  <span className="w-7 h-7 rounded-full text-stage-dim text-[10px] font-semibold flex items-center justify-center flex-none bg-stage-dark-3">
                    {r.initials}
                  </span>
                ) : null}
                <span
                  className={`w-[180px] flex-none overflow-hidden text-ellipsis whitespace-nowrap ${
                    revealed ? "text-[14px] font-semibold text-[#F4F2EE]" : "text-stage-dim font-mono text-[13px] tracking-[.03em]"
                  }`}
                >
                  {revealed ? r.name : `Candidate ${i + 1}`}
                </span>
                <span className="flex-1 h-2.5 rounded bg-stage-dark-2 overflow-hidden">
                  <span
                    className="block h-full rounded transition-all duration-700"
                    style={{
                      width: `${r.pct}%`,
                      background: i === 0 ? "linear-gradient(90deg,#2E9E7B,#7FBFA6)" : "#3C4340",
                    }}
                  />
                </span>
                <span className="font-mono text-[11.5px] text-stage-dim w-[64px] text-right flex-none">{r.votes} votes</span>
                <span className="text-[15px] font-semibold tracking-tight w-[52px] text-right flex-none">{r.pct}%</span>
              </div>
            ))}
          </div>
          {revealed && data.winnerName && (
            <div className="mt-5 pt-4 border-t border-stage-dark-3 flex items-center gap-4 animate-rise-in flex-none">
              <span className="font-mono text-[11px] tracking-[.12em] text-brand-accent-2 uppercase">Elected</span>
              <span className="text-[22px] font-semibold tracking-tight">{data.winnerName}</span>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmKind !== null}
        onClose={() => setConfirmKind(null)}
        title={kind.title}
        body={kind.body}
        confirmWord={kind.word}
        ctaLabel={kind.cta}
        danger={false}
        action={async () => setRevealAction(eventId, confirmKind === "reveal")}
      />
    </div>
  );
}
