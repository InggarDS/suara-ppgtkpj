"use client";

import { useState } from "react";
import useSWR from "swr";
import { ResultsSnapshot } from "@/lib/results";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { setRevealAction } from "./actions";
import ProjectorBoard from "./projector-board";

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

  function presentFullscreen() {
    const w = window.open(
      `/admin/events/${eventId}/results/present`,
      "suara-present",
      `popup=yes,width=${screen.width},height=${screen.height},left=0,top=0`
    );
    w?.focus();
  }

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
          onClick={presentFullscreen}
          className="flex items-center gap-1.5 text-[12.5px] font-medium rounded-lg px-3.5 py-2 border border-border-1 bg-ink text-white cursor-pointer"
        >
          Present fullscreen
        </button>
      </div>

      <div className="bg-stage-dark rounded-[14px] px-13 py-11 text-[#F4F2EE] relative overflow-hidden flex items-center justify-center">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: "radial-gradient(rgba(255,255,255,.05) 1px,transparent 1px)", backgroundSize: "22px 22px" }}
        />
        <ProjectorBoard eventName={eventName} data={data} />
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
