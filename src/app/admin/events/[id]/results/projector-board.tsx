"use client";

import { useState } from "react";
import { ResultsSnapshot } from "@/lib/results";

const TOP_N = 10;

export default function ProjectorBoard({ eventName, data }: { eventName: string; data: ResultsSnapshot }) {
  const [expanded, setExpanded] = useState(false);
  const revealed = data.revealed;
  const registrationGate = data.registrationPct < 100;

  const visibleResults = expanded ? data.results : data.results.slice(0, TOP_N);
  const hiddenCount = data.results.length - visibleResults.length;

  return (
    <div className="relative w-full max-w-[900px] flex flex-col" style={{ maxHeight: "min(900px, 82vh)" }}>
      <div className="flex items-baseline gap-3 mb-1.5 flex-none">
        <span className="font-mono text-[11px] tracking-[.12em] text-stage-dimmer uppercase">{eventName}</span>
        <span className="flex-1" />
        {!registrationGate && (
          <span className="font-mono text-xs text-stage-dimmer">
            {data.totalVotes} / {data.denom} votes {data.live && "· live"}
          </span>
        )}
      </div>

      {registrationGate ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 py-16">
          <span className="font-mono text-[11px] tracking-[.12em] text-brand-accent-2 uppercase">Registration</span>
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
          <div className="text-[13px] text-stage-dimmer">Results appear here once everyone has registered.</div>
        </div>
      ) : (
        <>
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
            {visibleResults.map((r, i) => (
              <div key={r.id} className="flex items-center gap-3">
                <span className="font-mono text-[11px] text-stage-dimmer w-5 flex-none text-right">{i + 1}</span>
                {revealed && r.initials ? (
                  <span className="w-7 h-7 rounded-full text-stage-dim text-[10px] font-semibold flex items-center justify-center flex-none bg-stage-dark-3">
                    {r.initials}
                  </span>
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
          {revealed && data.winnerName && (
            <div className="mt-5 pt-4 border-t border-stage-dark-3 flex items-center gap-4 animate-rise-in flex-none">
              <span className="font-mono text-[11px] tracking-[.12em] text-brand-accent-2 uppercase">Elected</span>
              <span className="text-[22px] font-semibold tracking-tight">{data.winnerName}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
