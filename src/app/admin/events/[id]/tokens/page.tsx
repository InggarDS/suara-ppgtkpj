import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { isEmailConfigured } from "@/lib/email";
import { CopyButton } from "@/components/ui/copy-button";
import EventHeader from "../event-header";
import GenerateTokensButton from "./generate-tokens-button";
import TokenFormatSettings from "./token-format-settings";
import CredentialsPanel from "./credentials-panel";
import ParticipantsPanel from "./participants-panel";

export const dynamic = "force-dynamic";
// Server actions on this page (bulk token email, credential materialisation)
// can run for a while — give them more than the default serverless budget.
export const maxDuration = 60;

export default async function TokensPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // select only what the page renders — participant photos and the event banner
  // are base64 and would bloat the RSC payload (and can break the response on
  // serverless) for an event with many registered participants.
  const event = await prisma.event.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      publicId: true,
      status: true,
      useCredentials: true,
      tokenPrefix: true,
      tokenSuffix: true,
      stages: { where: { status: "VOTING" }, select: { id: true } },
      participants: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          jemaat: true,
          token: true,
          email: true,
          registeredAt: true,
          tokenSentAt: true,
          votes: { select: { stageId: true } },
        },
      },
      credentials: {
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          jemaat: true,
          email: true,
          participant: { select: { registeredAt: true } },
        },
      },
    },
  });
  if (!event) notFound();

  const liveStageId = event.stages[0]?.id;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const inviteLink = `${baseUrl}/event/${event.publicId}`;
  const emailReady = isEmailConfigured();
  const participantRows = event.participants.map((p) => {
    const voted = liveStageId ? p.votes.some((v) => v.stageId === liveStageId) : false;
    return {
      id: p.id,
      name: p.name,
      jemaat: p.jemaat,
      token: p.token,
      email: p.email,
      tokenSentAt: p.tokenSentAt ? p.tokenSentAt.toISOString() : null,
      status: (voted ? "Voted" : p.registeredAt ? "Registered" : "Not sent") as "Voted" | "Registered" | "Not sent",
    };
  });

  return (
    <>
      <EventHeader eventId={event.id} title="Access & tokens" subtitle="One link for the event, one personal token per participant." status={event.status} />
      <div className="flex-1 min-h-0 overflow-y-auto px-8 pt-6.5 pb-10 bg-paper">
        <div className="flex flex-col gap-5">
          <div className="grid gap-4" style={{ gridTemplateColumns: "minmax(0,1fr) 250px" }}>
            <div className="bg-card border border-border-1 rounded-xl p-5">
              <div className="text-sm font-semibold text-ink mb-1">Event invite link</div>
              <p className="m-0 mb-3.5 text-xs leading-relaxed text-body">
                {event.useCredentials
                  ? "Share this once. Participants register with their name — no personal token needed."
                  : "Share this once. Each participant still needs their personal token to register."}
              </p>
              <div className="flex gap-2">
                <div className="flex-1 border border-border-1 rounded-lg bg-paper-2 px-3.5 py-2.5 font-mono text-[12.5px] text-ink-soft overflow-hidden text-ellipsis whitespace-nowrap">
                  {inviteLink}
                </div>
                <CopyButton text={inviteLink} className="text-[12.5px] font-medium text-white bg-brand rounded-lg px-4 flex-none cursor-pointer" />
              </div>
              {!event.useCredentials && (
                <div className="flex gap-2.5 mt-4 pt-4 border-t border-border-4">
                  <GenerateTokensButton eventId={event.id} />
                </div>
              )}
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

          <TokenFormatSettings eventId={event.id} tokenPrefix={event.tokenPrefix} tokenSuffix={event.tokenSuffix} />

          {event.useCredentials && (
            <CredentialsPanel
              eventId={event.id}
              credentials={event.credentials.map((c) => ({
                id: c.id,
                name: c.name,
                jemaat: c.jemaat,
                email: c.email,
                registered: Boolean(c.participant?.registeredAt),
              }))}
            />
          )}

          <ParticipantsPanel
            eventId={event.id}
            participants={participantRows}
            emailReady={emailReady}
            useCredentials={event.useCredentials}
          />
        </div>
      </div>
    </>
  );
}
