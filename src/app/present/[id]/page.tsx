import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getResultsSnapshot } from "@/lib/results";
import PresentView from "./present-view";

export const dynamic = "force-dynamic";

export default async function PresentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await prisma.event.findUnique({ where: { id }, select: { name: true } });
  if (!event) notFound();

  const snapshot = await getResultsSnapshot(id);

  return <PresentView eventId={id} eventName={event.name} initial={snapshot} />;
}
