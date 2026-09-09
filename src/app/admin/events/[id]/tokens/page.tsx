import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { initials } from "@/lib/ids";
import { isEmailConfigured } from "@/lib/email";
import { Pill } from "@/components/ui/pill";
import { CopyButton } from "@/components/ui/copy-button";
import EventHeader from "../event-header";
import GenerateTokensButton from "./generate-tokens-button";
import TokenFormatSettings from "./token-format-settings";
import DeleteParticipantButton from "./delete-participant-button";
import CredentialsPanel from "./credentials-panel";
import TokenEmailCell from "./token-email-cell";
import SendAllTokensButton from "./send-all-tokens-button";

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
  const withEmailCount = event.participants.filter((p) => p.email).length;

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

          <div className="bg-card border border-border-1 rounded-xl p-5">
            <div className="text-sm font-semibold text-ink mb-1">Kirim token via email</div>
            <p className="m-0 mb-3.5 text-xs leading-relaxed text-body">
              Kirim token pribadi ke email masing-masing peserta lewat Resend. Tambahkan alamat email di kolom
              <span className="font-medium"> Token email</span> pada tabel, atau lewat kolom{" "}
              <span className="font-mono">Email</span> pada berkas kredensial.
            </p>
            {emailReady ? (
              <SendAllTokensButton eventId={event.id} withEmailCount={withEmailCount} emailReady={emailReady} />
            ) : (
              <p className="text-[12px] text-amber-text bg-amber-bg border border-amber-border rounded-md px-3 py-2">
                Layanan email belum dikonfigurasi. Isi <span className="font-mono">RESEND_API_KEY</span> dan{" "}
                <span className="font-mono">RESEND_FROM_EMAIL</span> pada environment server untuk mengaktifkan pengiriman.
              </p>
            )}
          </div>

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

          <div className="bg-card border border-border-1 rounded-xl overflow-hidden">
            <div className="flex items-center gap-3 px-4.5 py-3 border-b border-border-4 bg-paper-2">
              <span className="font-mono text-[10px] tracking-[.09em] text-fainter uppercase flex-1 min-w-[130px]">Participant</span>
              <span className="font-mono text-[10px] tracking-[.09em] text-fainter uppercase w-[100px]">Jemaat</span>
              <span className="font-mono text-[10px] tracking-[.09em] text-fainter uppercase w-[95px]">Token</span>
              <span className="font-mono text-[10px] tracking-[.09em] text-fainter uppercase w-[85px]">Status</span>
              <span className="font-mono text-[10px] tracking-[.09em] text-fainter uppercase w-[240px]">Token email</span>
              <span className="w-[56px]" />
            </div>
            {event.participants.length === 0 && (
              <div className="p-5 text-sm text-faint">
                {event.useCredentials ? "No one has registered yet." : "No tokens generated yet."}
              </div>
            )}
            {event.participants.map((p) => {
              const voted = liveStageId ? p.votes.some((v) => v.stageId === liveStageId) : false;
              const status = voted ? "Voted" : p.registeredAt ? "Registered" : "Not sent";
              return (
                <div key={p.id} className="flex items-center gap-3 px-4.5 py-2.5 border-b border-border-5 last:border-b-0">
                  <span className="flex items-center gap-2.5 flex-1 min-w-[130px]">
                    <span className="w-6.5 h-6.5 rounded-full bg-border-4 text-body text-[10px] font-semibold flex items-center justify-center flex-none">
                      {p.name ? initials(p.name) : "—"}
                    </span>
                    <span className="text-[13px] text-ink font-medium truncate">{p.name ?? <span className="text-faint font-normal">Not registered</span>}</span>
                  </span>
                  <span className="text-xs text-body w-[100px] overflow-hidden text-ellipsis whitespace-nowrap">{p.jemaat ?? "—"}</span>
                  <span className="font-mono text-xs text-ink-soft w-[95px] truncate">{p.token}</span>
                  <span className="w-[85px]">
                    <Pill kind={status} />
                  </span>
                  <span className="w-[240px]">
                    <TokenEmailCell
                      eventId={event.id}
                      participantId={p.id}
                      email={p.email}
                      tokenSentAt={p.tokenSentAt ? p.tokenSentAt.toISOString() : null}
                      emailReady={emailReady}
                    />
                  </span>
                  <span className="w-[56px] flex justify-end">
                    <DeleteParticipantButton eventId={event.id} participantId={p.id} />
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
