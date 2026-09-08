"use client";

import { MonitorSnapshot } from "@/lib/monitor";
import { useEventStream } from "@/hooks/use-event-stream";

export default function MonitorView({ eventId, initial }: { eventId: string; initial: MonitorSnapshot | null }) {
  const stream = useEventStream<{ monitor: MonitorSnapshot | null }>(
    `/api/admin/events/${eventId}/stream`,
    `/api/admin/events/${eventId}/live`
  );
  const data = stream?.monitor ?? initial ?? null;

  if (!data) return null;

  return (
    <div className="flex flex-col gap-5">
      {data.liveStageName && (
        <div className="flex items-center gap-3 bg-[rgba(27,77,228,.08)] border border-[rgba(27,77,228,.28)] rounded-[20px] px-4 py-3">
          <span className="w-2 h-2 rounded-full bg-brand-accent flex-none animate-pulse-dot" />
          <span className="flex-1 text-[13px] text-ink-soft">
            <strong className="font-semibold">{data.liveStageName}</strong> ·{" "}
            {data.phase === "voting" ? "voting is open" : "check-in is open"} · {data.checkedIn} checked in
            {data.phase === "voting" ? ` · ${data.voted} voted` : ""}. Controls are on the Voting flow tab.
          </span>
        </div>
      )}

      <div className="grid grid-cols-4 gap-3.5">
        {data.kpis.map((k) => (
          <div key={k.label} className="bg-card border border-border-1 rounded-xl px-4.5 py-4">
            <div className="text-[11.5px] text-faint mb-2">{k.label}</div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[27px] font-semibold tracking-tight text-ink">{k.value}</span>
              <span className="text-xs text-faint">{k.unit}</span>
            </div>
            {k.delta && <div className="text-[11.5px] text-brand-accent mt-1.5">{k.delta}</div>}
          </div>
        ))}
      </div>

      <div className="grid gap-4.5 items-start" style={{ gridTemplateColumns: "minmax(0,1.55fr) minmax(0,1fr)" }}>
        <div className="bg-card border border-border-1 rounded-xl p-5.5">
          <div className="flex items-baseline gap-2.5 mb-4.5">
            <span className="text-sm font-semibold text-ink">Participation</span>
            <span className="flex-1" />
            <span className="font-mono text-[11.5px] text-faint">updates live</span>
          </div>
          <div className="flex items-end gap-2.5 mb-2.5">
            <span className="text-[44px] font-semibold tracking-tight text-ink leading-none">{data.pct}%</span>
            <span className="text-[13px] text-body pb-1.5">
              {data.voted} of {data.denom} votes cast
            </span>
          </div>
          <div className="h-3 rounded-lg bg-border-4 overflow-hidden relative">
            <div
              className="h-full rounded-lg transition-all duration-700"
              style={{ width: `${data.pct}%`, background: "linear-gradient(90deg,#3d6df0,#1b4de4)" }}
            />
          </div>
          <div className="flex gap-4.5 mt-4 pt-4 border-t border-border-4">
            {data.breakdown.map((b) => (
              <div key={b.label} className="flex-1">
                <div className="flex items-baseline gap-1.5 mb-1.5">
                  <span className="text-xs text-body flex-1">{b.label}</span>
                  <span className="font-mono text-[11.5px] text-ink font-medium">{b.value}</span>
                </div>
                <div className="h-1.5 rounded bg-border-4 overflow-hidden">
                  <div className="h-full rounded bg-brand-muted" style={{ width: `${b.w}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border-1 rounded-xl px-5 py-4.5">
          <div className="flex items-center gap-2 mb-3.5">
            <span className="text-sm font-semibold text-ink">Live activity</span>
            <span className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-pulse-dot" />
          </div>
          <div className="flex flex-col">
            {data.feed.length === 0 && <div className="text-xs text-faint py-3">No activity yet.</div>}
            {data.feed.map((f, i) => (
              <div key={i} className="flex items-center gap-2.5 py-2.5 border-b border-border-5 last:border-b-0 animate-rise-in">
                <span className="w-6.5 h-6.5 rounded-full bg-border-4 text-body text-[10px] font-semibold flex items-center justify-center flex-none">
                  {f.initials}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[12.5px] text-ink font-medium whitespace-nowrap overflow-hidden text-ellipsis">{f.name}</span>
                  <span className="block text-[11px] text-faint">{f.action}</span>
                </span>
                <span className="font-mono text-[10.5px] text-fainter flex-none">{f.ago}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
