import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import { notFound } from "next/navigation";
import Sidebar from "./sidebar";

export default async function EventLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getAdminSession();

  const [event, events] = await Promise.all([
    prisma.event.findUnique({ where: { id }, include: { stages: true } }),
    prisma.event.findMany({
      where: { status: { not: "ARCHIVED" } },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, publicId: true, status: true },
    }),
  ]);

  if (!event) notFound();

  const hasLiveStage = event.stages.some((s) => s.status === "LIVE");

  return (
    <div className="max-w-[1440px] mx-auto px-6.5 py-6.5">
      <div className="bg-card border border-border-1 rounded-2xl overflow-hidden shadow-sm flex min-h-[760px]">
        <Sidebar
          currentEventId={event.id}
          currentEventName={event.name}
          currentEventStatus={event.status}
          currentEventPublicId={event.publicId}
          events={events}
          hasLiveStage={hasLiveStage}
          adminName={session?.name ?? "Administrator"}
        />
        <main className="flex-1 min-w-0 flex flex-col">{children}</main>
      </div>
    </div>
  );
}
