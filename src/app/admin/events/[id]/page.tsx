import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Pill } from "@/components/ui/pill";
import { CopyButton } from "@/components/ui/copy-button";
import { pct } from "@/lib/format";
import EventHeader from "./event-header";
import BannerEditor from "./banner-editor";

export const dynamic = "force-dynamic";

const QUICK_ACTIONS = [
  { key: "monitor", label: "Live monitoring", hint: "Turnout as it happens", icon: "M4 20V11M10 20V4M16 20v-6M2 20h20" },
  { key: "results", label: "Shared screen", hint: "Push results to the projector", icon: "M3 4.5h18v12H3zM9 20.5h6" },
  { key: "tokens", label: "Access & tokens", hint: "Invite link and personal tokens", icon: "M14 8a5 5 0 1 0-4.6 5H11v3h3v-3h1.2A5 5 0 0 0 14 8Z" },
  { key: "data", label: "Data & cleanup", hint: "Export, archive, reset", icon: "M4 7c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3ZM4 7v10c0 1.7 3.6 3 8 3s8-1.3 8-3V7" },
];

export default async function EventOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      stages: { orderBy: { order: "asc" }, include: { _count: { select: { votes: true } } } },
      _count: { select: { participants: true } },
    },
  });
  if (!event) notFound();

  const liveStage = event.stages.find((s) => s.status === "LIVE");
  const turnout = liveStage ? pct(liveStage._count.votes, event.expectedParticipants || event._count.participants || 1) : null;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";

  return (
    <>
      <EventHeader eventId={event.id} title={event.name} subtitle={event.description || "No description yet."} status={event.status} />
      <div className="flex-1 px-8 pt-6.5 pb-10 bg-paper">
        <div className="flex flex-col gap-5 max-w-[1000px]">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/events"
              className="flex items-center gap-1.5 text-[12.5px] font-medium text-body border border-border-1 rounded-lg px-3 py-1.5 hover:border-hairline hover:text-ink"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 6 8 12l6 6"></path>
              </svg>
              All events
            </Link>
            <span className="font-mono text-[11px] text-faint">{event.publicId}</span>
            <Pill kind={event.status} />
          </div>

          <BannerEditor eventId={event.id} bannerImage={event.bannerImage} />

          <div className="grid grid-cols-4 gap-3.5">
            <Stat label="Participants" value={event._count.participants} unit="registered" />
            <Stat label="Turnout" value={turnout !== null ? `${turnout}%` : "—"} unit="this stage" />
            <Stat label="Stages" value={event.stages.length} unit="configured" />
            <Stat label="Threshold" value={liveStage ? liveStage.thresholdMin : "—"} unit="min. voters" />
          </div>

          <div className="grid gap-4 items-start" style={{ gridTemplateColumns: "minmax(0,1.3fr) minmax(0,1fr)" }}>
            <div className="bg-card border border-border-1 rounded-xl p-5">
              <div className="text-sm font-semibold text-ink mb-3.5">Stages</div>
              <div className="flex flex-col">
                {event.stages.map((st) => (
                  <div key={st.id} className="flex items-center gap-3 py-2.5 border-b border-border-5 last:border-b-0">
                    <span
                      className={`w-[7px] h-[7px] rounded-full flex-none ${
                        st.status === "LIVE" ? "bg-brand-accent" : st.status === "COMPLETED" ? "bg-brand-muted" : "bg-border-2"
                      }`}
                    />
                    <span className="font-mono text-[10.5px] text-fainter w-[58px] flex-none">Stage {st.order}</span>
                    <span className="flex-1 text-[13px] font-medium text-ink">{st.name}</span>
                    <span className={`text-[11.5px] font-medium ${st.status === "LIVE" ? "text-brand" : "text-faint"}`}>
                      {st.status === "LIVE" ? "Live now" : st.status === "COMPLETED" ? "Completed" : "Not started"}
                    </span>
                  </div>
                ))}
              </div>
              <Link
                href={`/admin/events/${event.id}/flow`}
                className="inline-block mt-3.5 text-[12.5px] font-medium text-brand bg-brand-soft rounded-lg px-3.5 py-2"
              >
                Edit voting flow
              </Link>
            </div>

            <div className="bg-card border border-border-1 rounded-xl p-5 flex flex-col gap-3">
              <div className="text-sm font-semibold text-ink">Quick actions</div>
              {QUICK_ACTIONS.map((q) => (
                <Link
                  key={q.key}
                  href={`/admin/events/${event.id}/${q.key}`}
                  className="flex items-center gap-2.5 w-full text-left bg-paper-2 border border-border-3 rounded-[18px] px-3.5 py-2.5 hover:border-hairline"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8D97C2" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="flex-none">
                    <path d={q.icon}></path>
                  </svg>
                  <span className="flex-1">
                    <span className="block text-[12.5px] font-medium text-ink">{q.label}</span>
                    <span className="block text-[11px] text-faint">{q.hint}</span>
                  </span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5B6AA8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-none">
                    <path d="m10 6 6 6-6 6"></path>
                  </svg>
                </Link>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border-1 rounded-xl p-5 flex items-center gap-4">
            <div className="flex-1">
              <div className="text-[13px] font-semibold text-ink">Participant link</div>
              <div className="font-mono text-xs leading-relaxed text-body">{baseUrl}/event/{event.publicId}</div>
            </div>
            <CopyButton
              text={`${baseUrl}/event/${event.publicId}`}
              className="text-[12.5px] font-medium text-ink bg-border-5 border border-border-1 rounded-lg px-3.5 py-2 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value, unit }: { label: string; value: string | number; unit: string }) {
  return (
    <div className="bg-card border border-border-1 rounded-xl px-4.5 py-4">
      <div className="text-[11.5px] text-faint mb-2">{label}</div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-[25px] font-semibold tracking-tight text-ink">{value}</span>
        <span className="text-[11.5px] text-faint">{unit}</span>
      </div>
    </div>
  );
}
