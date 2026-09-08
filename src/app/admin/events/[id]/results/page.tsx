import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getResultsSnapshot } from "@/lib/results";
import EventHeader from "../event-header";
import ResultsView from "./results-view";

export const dynamic = "force-dynamic";

export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) notFound();

  const snapshot = await getResultsSnapshot(id);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";

  return (
    <>
      <EventHeader eventId={event.id} title="Shared screen" subtitle="Compose what the room sees, then push it to the projector." status={event.status} />
      <div className="flex-1 min-h-0 overflow-y-auto px-8 pt-6.5 pb-10 bg-paper">
        <ResultsView eventId={id} eventName={event.name} inviteUrl={`${baseUrl}/event/${event.publicId}`} initial={snapshot} />
      </div>
    </>
  );
}
