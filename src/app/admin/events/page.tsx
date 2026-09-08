import { prisma } from "@/lib/prisma";
import { pct, relativeTime } from "@/lib/format";
import Link from "next/link";
import NewEventCardClient from "./new-event-card-client";
import EventsBoard, { BoardEvent } from "./events-board";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const events = await prisma.event.findMany({
    where: { status: { not: "ARCHIVED" } },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
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

  const board: BoardEvent[] = events.map((ev) => {
    const liveStage = ev.stages.find((s) => s.status === "VOTING");
    return {
      id: ev.id,
      publicId: ev.publicId,
      name: ev.name,
      status: ev.status,
      bannerImage: ev.bannerImage,
      participants: ev._count.participants,
      stages: ev.stages.length,
      turnout: liveStage
        ? `${pct(liveStage._count.votes, ev.expectedParticipants || ev._count.participants || 1)}%`
        : "—",
      metaLabel: liveStage
        ? `${liveStage.name} live · updated ${relativeTime(ev.updatedAt)}`
        : `Updated ${relativeTime(ev.updatedAt)}`,
    };
  });

  return (
    <div className="px-6.5 py-7 max-w-[1240px] mx-auto flex flex-col gap-6.5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[34px] sm:text-[42px] font-extrabold text-ink tracking-tight leading-none m-0 mb-2">
            Events
          </h1>
          <p className="text-[13px] text-body m-0 max-w-[56ch] text-justify">
            Semua pemilihan yang Anda jalankan, baik aktif maupun arsip. Seret tiket untuk mengurutkan,
            klik salah satu untuk membukanya.
          </p>
        </div>
      </div>

      <EventsBoard key={board.map((e) => e.id).join(",")} events={board} />

      <NewEventCardClient />

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
