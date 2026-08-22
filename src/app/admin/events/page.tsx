import { prisma } from "@/lib/prisma";
import { Pill } from "@/components/ui/pill";
import { pct, relativeTime } from "@/lib/format";
import Link from "next/link";
import NewEventCardClient from "./new-event-card-client";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const events = await prisma.event.findMany({
    where: { status: { not: "ARCHIVED" } },
    orderBy: { createdAt: "desc" },
    include: {
      stages: { include: { _count: { select: { votes: true } } }, orderBy: { order: "asc" } },
      _count: { select: { participants: true } },
    },
  });

  const archive = await prisma.event.findMany({
    where: { status: "ARCHIVED" },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { participants: true } } },
  });

  return (
    <div className="px-6.5 py-7 max-w-[1240px] mx-auto flex flex-col gap-6.5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold text-ink tracking-tight m-0 mb-1">Events</h1>
          <p className="text-[13px] text-body m-0 max-w-[56ch]">
            Every ballot you run, live or archived. Toggling an event off closes participant access instantly.
          </p>
        </div>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))" }}>
        {events.map((ev) => {
          const liveStage = ev.stages.find((s) => s.status === "LIVE");
          const turnout = liveStage
            ? `${pct(liveStage._count.votes, ev.expectedParticipants || ev._count.participants || 1)}%`
            : "—";
          return (
            <div key={ev.id} className="bg-card border border-border-1 rounded-xl p-4.5 flex flex-col gap-3.5">
              <div className="flex items-start gap-2.5">
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-semibold text-ink tracking-tight">{ev.name}</div>
                  <div className="font-mono text-[10.5px] leading-relaxed text-faint">{ev.publicId}</div>
                </div>
                <Pill kind={ev.status} />
              </div>
              <div className="flex gap-4.5">
                <div>
                  <div className="text-[19px] font-semibold text-ink">{ev._count.participants}</div>
                  <div className="text-[11px] text-faint">participants</div>
                </div>
                <div>
                  <div className="text-[19px] font-semibold text-ink">{ev.stages.length}</div>
                  <div className="text-[11px] text-faint">stages</div>
                </div>
                <div>
                  <div className="text-[19px] font-semibold text-ink">{turnout}</div>
                  <div className="text-[11px] text-faint">turnout</div>
                </div>
              </div>
              <div className="h-px bg-border-4" />
              <div className="flex items-center gap-2">
                <span className="text-[11.5px] text-faint flex-1">
                  {liveStage ? `${liveStage.name} live · updated ${relativeTime(ev.updatedAt)}` : `Updated ${relativeTime(ev.updatedAt)}`}
                </span>
                <Link
                  href={`/admin/events/${ev.id}`}
                  className="text-xs font-medium text-brand bg-brand-soft rounded-md px-2.5 py-1.5 hover:bg-[#DBE8E1]"
                >
                  Open
                </Link>
              </div>
            </div>
          );
        })}
        <NewEventCardClient />
      </div>

      <div>
        <div className="font-mono text-[10px] tracking-[.09em] text-fainter uppercase mb-2.5">Archive</div>
        <div className="bg-card border border-border-1 rounded-xl overflow-hidden">
          {archive.length === 0 && <div className="p-4 text-sm text-faint">No archived events yet.</div>}
          {archive.map((a) => (
            <div key={a.id} className="flex items-center gap-4 px-4.5 py-3.5 border-b border-border-6 last:border-b-0">
              <span className="w-1.5 h-1.5 rounded-full bg-hairline flex-none" />
              <span className="flex-1 text-[13px] font-medium text-ink-soft">{a.name}</span>
              <span className="font-mono text-[11px] text-faint w-[90px]">{a.publicId}</span>
              <span className="text-xs text-body w-[120px]">{new Date(a.updatedAt).toLocaleDateString()}</span>
              <span className="text-xs text-body w-[110px]">{a._count.participants} voters</span>
              <Link
                href={`/admin/events/${a.id}/data`}
                className="text-xs text-body border border-border-1 rounded-md px-2.5 py-1.5 hover:border-hairline hover:text-ink"
              >
                Export
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
