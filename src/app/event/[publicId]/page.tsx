import { prisma } from "@/lib/prisma";
import ParticipantApp from "./participant-app";

export const dynamic = "force-dynamic";

export default async function EventPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const event = await prisma.event.findUnique({ where: { publicId }, select: { id: true, name: true } });

  // Don't 404 a missing/deleted event — ParticipantApp's own state fetch
  // resolves to the "gone" screen ("Acara telah berakhir"), the same path
  // used when an event is deleted while a participant already has the page
  // open, so both cases render identically instead of a bare 404 page.
  return <ParticipantApp publicId={publicId} eventName={event?.name ?? ""} />;
}
