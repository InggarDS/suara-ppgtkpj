import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import EventHeader from "../event-header";
import StatusRealtime from "./status-realtime";
import StatusView, { type StatusRow } from "./status-view";

export const dynamic = "force-dynamic";

export default async function StatusPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      participants: { orderBy: [{ name: "asc" }, { createdAt: "asc" }] },
      stages: { orderBy: { order: "asc" }, select: { id: true, name: true, order: true, status: true } },
    },
  });
  if (!event) notFound();

  const liveStage = event.stages.find((s) => s.status === "CHECK_IN" || s.status === "VOTING") ?? null;

  const [checkIns, votes] = liveStage
    ? await Promise.all([
        prisma.stageCheckIn.findMany({ where: { stageId: liveStage.id }, select: { participantId: true } }),
        prisma.vote.findMany({ where: { stageId: liveStage.id }, select: { participantId: true } }),
      ])
    : [[], []];
  const checkedInSet = new Set(checkIns.map((c) => c.participantId));
  const votedSet = new Set(votes.map((v) => v.participantId));

  const rows: StatusRow[] = event.participants.map((p) => ({
    id: p.id,
    name: p.name,
    jemaat: p.jemaat,
    token: p.token,
    registered: Boolean(p.registeredAt),
    checkedIn: checkedInSet.has(p.id),
    voted: votedSet.has(p.id),
  }));

  const registeredCount = rows.filter((r) => r.registered).length;

  return (
    <>
      <EventHeader
        eventId={event.id}
        title="Status Peserta"
        subtitle="Siapa yang belum registrasi ulang, belum check-in, dan belum memilih pada stage yang sedang berjalan."
        status={event.status}
      />
      <StatusRealtime eventId={event.id} />
      <div className="flex-1 min-h-0 overflow-y-auto px-8 pt-6.5 pb-10 bg-paper">
        <StatusView
          rows={rows}
          liveStage={liveStage ? { name: liveStage.name, order: liveStage.order, phase: liveStage.status } : null}
          totalParticipants={rows.length}
          registeredCount={registeredCount}
        />
      </div>
    </>
  );
}
