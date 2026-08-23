import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getResultsSnapshot } from "@/lib/results";
import PresentView from "./present-view";

export const dynamic = "force-dynamic";

export default async function PresentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await prisma.event.findUnique({ where: { id }, select: { name: true, publicId: true } });
  if (!event) notFound();

  const snapshot = await getResultsSnapshot(id);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";

  return <PresentView eventId={id} eventName={event.name} inviteUrl={`${baseUrl}/event/${event.publicId}`} initial={snapshot} />;
}
