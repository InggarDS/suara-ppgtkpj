import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ParticipantApp from "./participant-app";

export const dynamic = "force-dynamic";

export default async function EventPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const event = await prisma.event.findUnique({ where: { publicId }, select: { id: true, name: true } });
  if (!event) notFound();

  return <ParticipantApp publicId={publicId} eventName={event.name} />;
}
