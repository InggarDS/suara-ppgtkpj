"use client";

import { useState } from "react";
import { ResultsSnapshot } from "@/lib/results";
import { QrImage } from "@/components/ui/invite-qr";

const TOP_N = 10;

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
  const [expanded, setExpanded] = useState(false);
  const revealed = data.revealed;
  const registrationGate = data.registrationPct < 100;
  const showWinnerReveal = data.isFinalStage && revealed && Boolean(data.winnerName);

  const visibleResults = expanded ? data.results : data.results.slice(0, TOP_N);
  const hiddenCount = data.results.length - visibleResults.length;

  if (data.notStarted) {
    return (
      <div className="w-full max-w-[980px] flex flex-col items-center justify-center gap-5 py-16 text-center animate-rise-in">
        <span className="font-mono text-[13px] tracking-[.25em] uppercase text-stage-dimmer">{eventName}</span>
        <div className="text-[64px] font-semibold tracking-tight leading-tight max-w-[16ch]">Voting Belum Dimulai</div>
        <div className="text-lg text-stage-dim">Menunggu admin membuka stage pertama.</div>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-[980px] flex flex-col" style={{ maxHeight: "min(940px, 86vh)" }}>
      <div className="flex items-baseline gap-3 mb-2 flex-none">
        <span className="font-mono text-[11px] tracking-[.12em] text-stage-dimmer uppercase">{eventName}</span>
        <span className="flex-1" />
        {!registrationGate && (
          <span className="font-mono text-xs text-stage-dimmer">
            {data.totalVotes} / {data.denom} votes {data.live && "· live"}
          </span>
        )}
      </div>

      {data.stageSequence.length > 1 && <StageSequenceBar stages={data.stageSequence} />}

      {registrationGate ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 py-16">
          <span className="font-mono text-[11px] tracking-[.12em] text-brand-accent-2 uppercase">Registration</span>
          <div className="flex items-center gap-12">
            <div className="flex flex-col items-center gap-6">
              <div className="text-[88px] font-semibold tracking-tight leading-none">{data.registrationPct}%</div>
              <div className="text-base text-stage-dim font-mono">
                {data.registered} of {data.denom} participants registered
              </div>
              <div className="w-full max-w-[420px] h-3 rounded-lg bg-stage-dark-2 overflow-hidden">
                <div
                  className="h-full rounded-lg transition-all duration-700"
                  style={{ width: `${data.registrationPct}%`, background: "linear-gradient(90deg,#57A6FF,#A78BFA)" }}
                />
              </div>
            </div>
            {inviteUrl && showQr && (
              <div className="flex flex-col items-center gap-3 flex-none">
                <div className="bg-white rounded-2xl p-3">
                  <QrImage url={inviteUrl} size={150} />
                </div>
                <span className="font-mono text-[11px] text-stage-dimmer uppercase tracking-[.1em]">Scan to join</span>
              </div>
            )}
          </div>
          <div className="text-[13px] text-stage-dimmer">Results appear here once everyone has registered.</div>
        </div>
      ) : showWinnerReveal ? (
        <WinnerReveal data={data} />
      ) : (
        <>
          <div className="flex items-baseline gap-3.5 mb-6.5 flex-none">
            <h2 className="m-0 text-[34px] font-semibold tracking-tight">{data.stageName ?? "No stage"}</h2>
            {data.isFinalStage && (
              <span
                className="font-mono text-[11px] tracking-[.12em] uppercase text-brand-accent-2 rounded-md px-2 py-1"
                style={{ border: "1px solid rgba(167,139,250,.4)" }}
              >
                Final
              </span>
            )}
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
            {visibleResults.map((r, i) => (
              <div key={r.id} className="flex items-center gap-3">
                <span className="font-mono text-[11px] text-stage-dimmer w-5 flex-none text-right">{i + 1}</span>
                {revealed ? (
                  r.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.photo} alt="" className="w-8 h-8 rounded-full object-cover flex-none" />
                  ) : r.initials ? (
                    <span className="w-8 h-8 rounded-full text-stage-dim text-[10px] font-semibold flex items-center justify-center flex-none bg-stage-dark-3">
                      {r.initials}
                    </span>
                  ) : null
                ) : null}
                <span
                  className={`w-[180px] flex-none overflow-hidden text-ellipsis whitespace-nowrap ${
                    revealed ? "text-[14px] font-semibold text-[#F4F7FF]" : "text-stage-dim font-mono text-[13px] tracking-[.03em]"
                  }`}
                >
                  {revealed ? r.name : `Candidate ${i + 1}`}
                </span>
                <span className="flex-1 h-2.5 rounded bg-stage-dark-2 overflow-hidden">
                  <span
                    className="block h-full rounded transition-all duration-700"
                    style={{
                      width: `${r.pct}%`,
                      background: i === 0 ? "linear-gradient(90deg,#57A6FF,#A78BFA)" : "#232B52",
                    }}
                  />
                </span>
                <span className="font-mono text-[11.5px] text-stage-dim w-[64px] text-right flex-none">{r.votes} votes</span>
                <span className="text-[15px] font-semibold tracking-tight w-[52px] text-right flex-none">{r.pct}%</span>
              </div>
            ))}
          </div>
          {data.results.length > TOP_N && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="mt-3 flex-none self-start font-mono text-[11px] tracking-[.08em] uppercase text-stage-dim border border-stage-dark-4 rounded-md px-2.5 py-1.5 cursor-pointer hover:text-[#F4F7FF] hover:border-stage-dim"
            >
              {expanded ? "Show top 10 only" : `Show all ${data.results.length} (+${hiddenCount})`}
            </button>
          )}
        </>
      )}
    </div>
  );
}

function StageSequenceBar({ stages }: { stages: ResultsSnapshot["stageSequence"] }) {
  const maxOrder = Math.max(...stages.map((s) => s.order));
  return (
    <div className="flex items-center gap-2 mb-6 flex-none flex-wrap">
      {stages.map((s, i) => {
        const isFinal = s.order === maxOrder;
        const state = s.status === "LIVE" ? "live" : s.status === "COMPLETED" ? "done" : "upcoming";
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
              style={state === "live" ? { background: "rgba(167,139,250,.12)" } : undefined}
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

function WinnerReveal({ data }: { data: ResultsSnapshot }) {
  const others = data.results.filter((r) => r.id !== data.winnerId && r.id !== "abstain");

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-8 py-6 overflow-y-auto animate-celebrate">
      <div
        className="font-mono text-[13px] tracking-[.3em] uppercase text-brand-accent-2"
        style={{ textShadow: "0 0 24px rgba(167,139,250,.55)" }}
      >
        Selamat Terpilih
      </div>

      <div className="flex flex-col items-center gap-4">
        <div
          className="relative rounded-full p-1.5"
          style={{ background: "linear-gradient(135deg,#57A6FF,#A78BFA)", boxShadow: "0 0 60px -10px rgba(87,166,255,.65)" }}
        >
          {data.winnerPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.winnerPhoto}
              alt=""
              className="w-[190px] h-[190px] rounded-full object-cover border-4 border-stage-dark"
            />
          ) : (
            <span className="w-[190px] h-[190px] rounded-full border-4 border-stage-dark bg-stage-dark-3 flex items-center justify-center text-[52px] font-semibold text-stage-dim">
              {data.winnerName?.slice(0, 1)}
            </span>
          )}
        </div>
        <div className="text-[46px] font-semibold tracking-tight text-center leading-tight">{data.winnerName}</div>
        {data.winnerNote && <div className="text-lg text-stage-dim font-mono">{data.winnerNote}</div>}
      </div>

      {others.length > 0 && (
        <div className="w-full max-w-[640px] pt-4 border-t border-stage-dark-3">
          <div className="font-mono text-[10.5px] tracking-[.12em] uppercase text-stage-dimmer mb-3 text-center">Kandidat Lain</div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {others.map((c) => (
              <div key={c.id} className="flex items-center gap-2 bg-stage-dark-2 rounded-full pl-1.5 pr-3.5 py-1.5">
                {c.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.photo} alt="" className="w-7 h-7 rounded-full object-cover flex-none" />
                ) : (
                  <span className="w-7 h-7 rounded-full bg-stage-dark-3 text-stage-dim text-[10px] font-semibold flex items-center justify-center flex-none">
                    {c.initials}
                  </span>
                )}
                <span className="text-[13px] font-medium text-stage-dim">{c.name}</span>
                <span className="font-mono text-[11px] text-stage-dimmer">{c.votes} votes</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
