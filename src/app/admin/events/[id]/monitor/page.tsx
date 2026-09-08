import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getMonitorSnapshot } from "@/lib/monitor";
import EventHeader from "../event-header";
import MonitorView from "./monitor-view";

export const dynamic = "force-dynamic";

export default async function MonitorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) notFound();

  const snapshot = await getMonitorSnapshot(id);

  return (
    <>
      <EventHeader eventId={event.id} title="Live monitoring" subtitle="Turnout as it happens. Nothing here is visible to participants." status={event.status} />
      <div className="flex-1 min-h-0 overflow-y-auto px-8 pt-6.5 pb-10 bg-paper">
        <MonitorView eventId={id} initial={snapshot} />
      </div>
    </>
  );
}
