import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

type ClosingStage = { id: string; eventId: string; order: number; name: string; advanceThreshold: number | null };

export async function autoSelectNextStageCandidates(stage: ClosingStage) {
  const next = await prisma.stage.findFirst({
    where: { eventId: stage.eventId, order: { gt: stage.order }, status: "NOT_STARTED" },
    orderBy: { order: "asc" },
  });
  if (!next || !stage.advanceThreshold) return;

  const candidates = await prisma.candidate.findMany({
    where: { stageId: stage.id },
    include: { _count: { select: { votes: true } } },
  });
  const qualifying = candidates.filter((c) => c._count.votes >= stage.advanceThreshold!);
  if (!qualifying.length) return;

  const existingNext = await prisma.candidate.findMany({ where: { stageId: next.id } });
  const existingParticipantIds = new Set(existingNext.map((c) => c.participantId).filter(Boolean));
  const existingNames = new Set(existingNext.map((c) => c.name));

  const toAdd = qualifying.filter((c) =>
    c.participantId ? !existingParticipantIds.has(c.participantId) : !existingNames.has(c.name)
  );
  if (!toAdd.length) return;

  const startOrder = existingNext.length;
  await prisma.candidate.createMany({
    data: toAdd.map((c, i) => ({
      stageId: next.id,
      name: c.name,
      note: c.note,
      photo: c.photo,
      participantId: c.participantId,
      order: startOrder + i + 1,
      selectionSource: "AUTO_THRESHOLD" as const,
    })),
  });
  await logAudit(
    stage.eventId,
    `${toAdd.length} candidate(s) auto-selected for "${next.name}" (≥ ${stage.advanceThreshold} votes in "${stage.name}")`,
    "system"
  );
}

export async function maybeAutoAdvance(stageId: string) {
  const stage = await prisma.stage.findUnique({
    where: { id: stageId },
    include: { _count: { select: { votes: true } } },
  });
  if (!stage || stage.status !== "LIVE" || !stage.autoAdvance) return;
  if (stage._count.votes < stage.thresholdMin) return;

  await prisma.stage.update({ where: { id: stage.id }, data: { status: "COMPLETED", completedAt: new Date() } });
  await logAudit(stage.eventId, `Stage "${stage.name}" auto-closed (threshold ${stage.thresholdMin} reached)`, "system");

  await autoSelectNextStageCandidates(stage);
}
