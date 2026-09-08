import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import EventHeader from "../event-header";
import VoteDataRealtime from "./vote-data-realtime";
import VoteDataView, { type VoteRow } from "./vote-data-view";
import UploadCandidatesPanel from "./upload-candidates-panel";

export const dynamic = "force-dynamic";

export default async function VoteDataPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      participants: { orderBy: [{ name: "asc" }, { createdAt: "asc" }] },
      stages: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          name: true,
          order: true,
          status: true,
          candidates: { select: { participantId: true } },
        },
      },
    },
  });
  if (!event) notFound();

  // A participant is "already a candidate" if it is linked to any candidate in
  // this event — used to prevent duplicate candidate submission.
  const candidateParticipantIds = new Set(
    event.stages.flatMap((s) => s.candidates.map((c) => c.participantId).filter(Boolean) as string[])
  );

  const rows: VoteRow[] = event.participants.map((p) => ({
    id: p.id,
    name: p.name,
    jemaat: p.jemaat,
    token: p.token,
    photo: p.photo,
    validated: Boolean(p.validatedAt),
    registered: Boolean(p.registeredAt),
    isCandidate: candidateParticipantIds.has(p.id),
  }));

  const editableStages = event.stages
    .filter((s) => s.status === "NOT_STARTED")
    .map((s) => ({ id: s.id, name: s.name, order: s.order }));

  return (
    <>
      <EventHeader
        eventId={event.id}
        title="Management Data Vote"
        subtitle="Validasi data peserta, sinkron foto dari pendaftaran, bandingkan unggahan kandidat dengan kredensial, lalu kirim data yang sah sebagai kandidat."
        status={event.status}
      />
      <VoteDataRealtime eventId={event.id} />
      <div className="flex-1 min-h-0 overflow-y-auto px-8 pt-6.5 pb-10 bg-paper">
        <div className="flex flex-col gap-6">
          <VoteDataView eventId={event.id} rows={rows} editableStages={editableStages} />
          <UploadCandidatesPanel eventId={event.id} />
        </div>
      </div>
    </>
  );
}
