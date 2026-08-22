import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { initials } from "@/lib/ids";
import { Pill } from "@/components/ui/pill";
import { CopyButton } from "@/components/ui/copy-button";
import EventHeader from "../event-header";
import GenerateTokensButton from "./generate-tokens-button";

export const dynamic = "force-dynamic";

export default async function TokensPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      stages: { where: { status: "LIVE" } },
      participants: { orderBy: { createdAt: "asc" }, include: { votes: true } },
    },
  });
  if (!event) notFound();

  const liveStageId = event.stages[0]?.id;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const inviteLink = `${baseUrl}/event/${event.publicId}`;

  return (
    <>
      <EventHeader eventId={event.id} title="Access & tokens" subtitle="One link for the event, one personal token per participant." status={event.status} />
      <div className="flex-1 px-8 pt-6.5 pb-10 bg-paper">
        <div className="flex flex-col gap-5">
          <div className="grid gap-4" style={{ gridTemplateColumns: "minmax(0,1fr) 250px" }}>
            <div className="bg-card border border-border-1 rounded-xl p-5">
              <div className="text-sm font-semibold text-ink mb-1">Event invite link</div>
              <p className="m-0 mb-3.5 text-xs leading-relaxed text-body">
                Share this once. Each participant still needs their personal token to register.
              </p>
              <div className="flex gap-2">
                <div className="flex-1 border border-border-1 rounded-lg bg-paper-2 px-3.5 py-2.5 font-mono text-[12.5px] text-ink-soft overflow-hidden text-ellipsis whitespace-nowrap">
                  {inviteLink}
                </div>
                <CopyButton text={inviteLink} className="text-[12.5px] font-medium text-white bg-brand rounded-lg px-4 flex-none cursor-pointer" />
              </div>
              <div className="flex gap-2.5 mt-4 pt-4 border-t border-border-4">
                <GenerateTokensButton eventId={event.id} />
              </div>
            </div>
            <div className="bg-card border border-border-1 rounded-xl p-5 flex flex-col items-center gap-2.5">
              <div className="w-[132px] h-[132px] rounded-lg bg-border-5 border border-dashed border-border-2 flex items-center justify-center text-[11px] text-fainter text-center leading-tight">
                QR code
                <br />
                placeholder
              </div>
              <span className="text-[11.5px] text-faint text-center">Print for the venue entrance</span>
            </div>
          </div>

          <div className="bg-card border border-border-1 rounded-xl overflow-hidden">
            <div className="flex items-center gap-3.5 px-4.5 py-3 border-b border-border-4 bg-paper-2">
              <span className="font-mono text-[10px] tracking-[.09em] text-fainter uppercase flex-1">Participant</span>
              <span className="font-mono text-[10px] tracking-[.09em] text-fainter uppercase w-[110px]">Token</span>
              <span className="font-mono text-[10px] tracking-[.09em] text-fainter uppercase w-[110px]">Status</span>
            </div>
            {event.participants.length === 0 && <div className="p-5 text-sm text-faint">No tokens generated yet.</div>}
            {event.participants.map((p) => {
              const voted = liveStageId ? p.votes.some((v) => v.stageId === liveStageId) : false;
              const status = voted ? "Voted" : p.registeredAt ? "Registered" : "Not sent";
              return (
                <div key={p.id} className="flex items-center gap-3.5 px-4.5 py-2.5 border-b border-border-5 last:border-b-0">
                  <span className="flex items-center gap-2.5 flex-1 min-w-0">
                    <span className="w-6.5 h-6.5 rounded-full bg-border-4 text-body text-[10px] font-semibold flex items-center justify-center flex-none">
                      {p.name ? initials(p.name) : "—"}
                    </span>
                    <span className="text-[13px] text-ink font-medium">{p.name ?? <span className="text-faint font-normal">Not registered</span>}</span>
                  </span>
                  <span className="font-mono text-xs text-ink-soft w-[110px]">{p.token}</span>
                  <span className="w-[110px]">
                    <Pill kind={status} />
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
