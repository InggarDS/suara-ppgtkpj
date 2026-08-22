import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function maybeAutoAdvance(stageId: string) {
  const stage = await prisma.stage.findUnique({
    where: { id: stageId },
    include: { _count: { select: { votes: true } }, event: true },
  });
  if (!stage || stage.status !== "LIVE" || !stage.autoAdvance) return;
  if (stage._count.votes < stage.thresholdMin) return;

  const next = await prisma.stage.findFirst({
    where: { eventId: stage.eventId, order: { gt: stage.order }, status: "NOT_STARTED" },
    orderBy: { order: "asc" },
  });

  await prisma.stage.update({ where: { id: stage.id }, data: { status: "COMPLETED", completedAt: new Date() } });
  await logAudit(stage.eventId, `Stage "${stage.name}" auto-closed (threshold ${stage.thresholdMin} reached)`, "system");

  if (next) {
    await prisma.stage.update({ where: { id: next.id }, data: { status: "LIVE", startedAt: new Date() } });
    await logAudit(stage.eventId, `Stage "${next.name}" auto-opened (auto-advance, threshold ${stage.thresholdMin})`, "system");
  }
}
