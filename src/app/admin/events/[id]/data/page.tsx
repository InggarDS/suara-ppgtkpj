import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import EventHeader from "../event-header";
import DangerZone from "./danger-zone";
import ArchiveButton from "./archive-button";

export const dynamic = "force-dynamic";

export default async function DataPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) notFound();

  const audit = await prisma.auditLog.findMany({
    where: { eventId: id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return (
    <>
      <EventHeader eventId={event.id} title="Data & cleanup" subtitle="Export first, then reset. Destructive actions are logged in the audit trail." status={event.status} />
      <div className="flex-1 px-8 pt-6.5 pb-10 bg-paper">
        <div className="flex flex-col gap-5 max-w-[900px]">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card border border-border-1 rounded-xl p-5">
              <div className="text-sm font-semibold text-ink mb-1">Export audit log</div>
              <p className="m-0 mb-3.5 text-xs leading-relaxed text-body">
                Download the full vote record before clearing anything. Includes timestamps and tokens.
              </p>
              <a
                href={`/api/admin/events/${event.id}/export`}
                className="inline-block text-[12.5px] font-medium text-ink bg-border-5 border border-border-1 rounded-lg px-3.5 py-2 hover:bg-[#EAE7E0]"
              >
                Download CSV
              </a>
            </div>
            <div className="bg-card border border-border-1 rounded-xl p-5">
              <div className="text-sm font-semibold text-ink mb-1">Archive event</div>
              <p className="m-0 mb-3.5 text-xs leading-relaxed text-body">
                Freeze this event as read-only and move it to the archive. Participant links stop working.
              </p>
              <ArchiveButton eventId={event.id} />
            </div>
          </div>

          <DangerZone eventId={event.id} />

          <div>
            <div className="font-mono text-[10px] tracking-[.09em] text-fainter uppercase mb-2.5">Audit trail</div>
            <div className="bg-card border border-border-1 rounded-xl overflow-hidden">
              {audit.length === 0 && <div className="p-4 text-sm text-faint">No activity yet.</div>}
              {audit.map((t) => (
                <div key={t.id} className="flex items-center gap-3.5 px-4.5 py-2.5 border-b border-border-6 last:border-b-0">
                  <span className="font-mono text-[11px] text-faint w-[150px] flex-none">{t.createdAt.toLocaleString()}</span>
                  <span className="text-[12.5px] text-ink flex-1">{t.message}</span>
                  <span className="text-xs text-body flex-none">{t.actor}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
