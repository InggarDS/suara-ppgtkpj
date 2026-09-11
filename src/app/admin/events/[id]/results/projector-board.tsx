"use client";

import { ResultsSnapshot } from "@/lib/results";
import { QrImage } from "@/components/ui/invite-qr";
import { VotingTable } from "@/components/ui/voting-table";
import { RankingBoard } from "./ranking-board";
import { FinalStageReveal } from "./final-stage-reveal";

export default function ProjectorBoard({
  eventName,
  data,
  inviteUrl,
  showQr = true,
}: {
  eventName: string;
  data: ResultsSnapshot;
  inviteUrl?: string;
  showQr?: boolean;
}) {
  if (data.votingComplete) {
    return (
      <div className="relative w-full max-w-[980px] flex flex-col items-center gap-8 py-12 animate-rise-in">
        <span className="font-mono text-[12px] tracking-[.25em] uppercase text-stage-dimmer">{eventName}</span>
        <div className="w-[92px] h-[92px] rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg,#3d6df0,#1230a8)", boxShadow: "0 0 60px -12px rgba(27,77,228,.6)" }}>
          <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12.5 9.5 18 20 6.5" />
          </svg>
        </div>
        <div className="text-[72px] font-semibold tracking-tight leading-none text-center">Voting Telah Selesai</div>
        <div className="text-lg text-stage-dim text-center max-w-[40ch]">
          Terima kasih atas partisipasi Anda. Seluruh tahapan pemilihan sudah ditutup.
        </div>
        {data.phase === "result" && data.results.length > 0 && (
          <div className="w-full max-w-[760px] pt-6 border-t border-stage-dark-3">
            <div className="font-mono text-[10.5px] tracking-[.12em] uppercase text-stage-dimmer mb-3 text-center">
              Hasil Akhir · {data.stageName}
            </div>
            <VotingTable rows={data.results} tone="dark" />
          </div>
        )}
      </div>
    );
  }

  if (data.phase === "idle") {
    return (
      <div className="w-full max-w-[980px] flex flex-col items-center justify-center gap-5 py-16 text-center animate-rise-in">
        <span className="font-mono text-[13px] tracking-[.25em] uppercase text-stage-dimmer">{eventName}</span>
        <div className="text-[64px] font-semibold tracking-tight leading-tight max-w-[16ch]">Voting Belum Dimulai</div>
        <div className="text-lg text-stage-dim">Menunggu admin membuka stage pertama.</div>
        {inviteUrl && showQr && (
          <div className="flex flex-col items-center gap-3 mt-4">
            <div className="bg-white rounded-2xl p-3.5">
              <QrImage url={inviteUrl} size={190} />
            </div>
            <span className="font-mono text-[11px] text-stage-dimmer uppercase tracking-[.1em]">Scan untuk bergabung</span>
          </div>
        )}
      </div>
    );
  }

  if (data.phase === "checkin") {
    return (
      <div className="relative w-full max-w-[980px] flex flex-col" style={{ maxHeight: "min(940px, 86vh)" }}>
        <Header eventName={eventName} data={data} rightText={`Check-in · ${data.checkedInCount} / ${data.totalVoters}`} />
        {data.stageSequence.length > 1 && <StageSequenceBar stages={data.stageSequence} />}
        <div className="flex-1 flex flex-col items-center justify-center gap-8 py-14">
          <span className="font-mono text-[12px] tracking-[.2em] uppercase text-brand-accent-2">{data.stageName}</span>
          <div className="text-[64px] font-semibold tracking-tight leading-none">Silakan Check In</div>
          {/* No QR once a stage is open — joining is done, this is check-in now. */}
          <div className="flex flex-col items-center gap-5">
            <div className="text-[104px] font-semibold tracking-tight leading-none tabular-nums">{data.checkInPct}%</div>
            <div className="text-lg text-stage-dim font-mono">
              {data.checkedInCount} / {data.totalVoters} voters checked in
            </div>
            <div className="w-[440px] h-3.5 rounded-lg bg-stage-dark-2 overflow-hidden">
              <div
                className="h-full rounded-lg transition-all duration-700"
                style={{ width: `${data.checkInPct}%`, background: "linear-gradient(90deg,#3d6df0,#1b4de4)" }}
              />
            </div>
          </div>
          <div className="text-[13px] text-stage-dimmer">Pemungutan suara dimulai setelah semua peserta check-in.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-[980px] flex flex-col" style={{ maxHeight: "min(940px, 86vh)" }}>
      <Header
        eventName={eventName}
        data={data}
        rightText={
          data.phase === "voting"
            ? `${data.votedCount} / ${data.totalVoters} votes · live`
            : `${data.votedCount} / ${data.totalVoters} votes`
        }
      />
      {data.stageSequence.length > 1 && <StageSequenceBar stages={data.stageSequence} />}

      {data.isFinalStage ? (
        // The final stage gets its own presentation (vertical-bar suspense +
        // cinematic reveal) — see final-stage-reveal.tsx. Skipping the
        // stage-name/progress chrome below keeps the reveal moment as the
        // screen's sole visual focus.
        <FinalStageReveal data={data} />
      ) : (
        <>
          <div className="flex items-baseline gap-3.5 mb-5 flex-none">
            <h2 className="m-0 text-[30px] font-semibold tracking-tight">{data.stageName ?? "No stage"}</h2>
            {data.phase === "voting" && (
              <span className="flex items-center gap-1.5 font-mono text-[11px] tracking-[.1em] uppercase text-brand-accent-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-pulse-dot" />
                Voting Progress
              </span>
            )}
            {data.phase === "result" && (
              <span className="font-mono text-[11px] tracking-[.1em] uppercase text-brand-accent-2">Hasil Resmi</span>
            )}
            <span className="flex-1" />
            {data.phase === "voting" && (
              <span className="flex items-center gap-1.5 font-mono text-[11px] tracking-[.1em] uppercase text-stage-dim border border-stage-dark-4 rounded-md px-2.5 py-1.5 flex-none">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="10.5" width="16" height="10" rx="2"></rect>
                  <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"></path>
                </svg>
                Identitas dikunci
              </span>
            )}
          </div>

          {data.phase === "voting" && (
            <div className="flex items-end gap-4 mb-5 flex-none">
              <div className="text-[72px] font-semibold tracking-tight leading-none tabular-nums">{data.votingPct}%</div>
              <div className="flex-1 pb-3">
                <div className="text-[13px] text-stage-dim font-mono mb-2">
                  {data.votedCount} / {data.totalVoters} voters
                </div>
                <div className="w-full h-3 rounded-lg bg-stage-dark-2 overflow-hidden">
                  <div
                    className="h-full rounded-lg transition-all duration-700"
                    style={{ width: `${data.votingPct}%`, background: "linear-gradient(90deg,#3d6df0,#1b4de4)" }}
                  />
                </div>
              </div>
            </div>
          )}

          <RankingBoard data={data} />
        </>
      )}
    </div>
  );
}

function Header({ eventName, data, rightText }: { eventName: string; data: ResultsSnapshot; rightText: string }) {
  return (
    <div className="flex items-baseline gap-3 mb-4 flex-none">
      <span className="font-mono text-[11px] tracking-[.12em] text-stage-dimmer uppercase">{eventName}</span>
      {data.isFinalStage && (
        <span
          className="font-mono text-[10px] tracking-[.12em] uppercase text-brand-accent-2 rounded-md px-2 py-0.5"
          style={{ border: "1px solid rgba(77,123,245,.45)" }}
        >
          Final
        </span>
      )}
      <span className="flex-1" />
      <span className="font-mono text-xs text-stage-dimmer">{rightText}</span>
    </div>
  );
}

function StageSequenceBar({ stages }: { stages: ResultsSnapshot["stageSequence"] }) {
  const maxOrder = Math.max(...stages.map((s) => s.order));
  return (
    <div className="flex items-center gap-2 mb-6 flex-none flex-wrap">
      {stages.map((s, i) => {
        const isFinal = s.order === maxOrder;
        const state =
          s.status === "VOTING" || s.status === "CHECK_IN"
            ? "live"
            : s.status === "STOPPED" || s.status === "CLOSED"
              ? "done"
              : "upcoming";
        return (
          <div key={s.order} className="flex items-center gap-2">
            <span
              className={`flex items-center gap-1.5 font-mono text-[10.5px] tracking-[.08em] uppercase rounded-full px-2.5 py-1.5 border ${
                state === "live"
                  ? "border-brand-accent-2 text-brand-accent-2"
                  : state === "done"
                    ? "border-stage-dark-4 text-stage-dim"
                    : "border-stage-dark-3 text-stage-dimmer"
              } ${isFinal ? "border-dashed" : ""}`}
              style={state === "live" ? { background: "rgba(27,77,228,.14)" } : undefined}
            >
              {state === "live" && <span className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-pulse-dot" />}
              {state === "done" && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12.5 9.5 18 20 6.5"></path>
                </svg>
              )}
              {isFinal ? "Final" : s.name}
            </span>
            {i < stages.length - 1 && <span className="w-3.5 h-px bg-stage-dark-4 flex-none" />}
          </div>
        );
      })}
    </div>
  );
}
