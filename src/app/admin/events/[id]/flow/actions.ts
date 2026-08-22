"use server";

import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

async function requireSession() {
  const session = await getAdminSession();
  if (!session) throw new Error("Not authenticated");
  return session;
}

export type StageRulePatch = Partial<{
  thresholdMin: number;
  autoAdvance: boolean;
  allowAbstain: boolean;
  requireFingerprint: boolean;
  notifyOnQuorum: boolean;
}>;

export async function updateStageRulesAction(eventId: string, stageId: string, patch: StageRulePatch) {
  await requireSession();
  await prisma.stage.update({ where: { id: stageId }, data: patch });
  revalidatePath(`/admin/events/${eventId}/flow`);
  return { ok: true };
}

export async function startStageAction(eventId: string, stageId: string) {
  const session = await requireSession();
  const stage = await prisma.stage.findUniqueOrThrow({ where: { id: stageId } });

  await prisma.$transaction([
    prisma.stage.updateMany({
      where: { eventId, status: "LIVE" },
      data: { status: "COMPLETED", completedAt: new Date() },
    }),
    prisma.stage.update({
      where: { id: stageId },
      data: { status: "LIVE", startedAt: new Date() },
    }),
  ]);

  await logAudit(eventId, `Stage "${stage.name}" opened by admin`, session.name);
  revalidatePath(`/admin/events/${eventId}/flow`);
  revalidatePath(`/admin/events/${eventId}/monitor`);
  revalidatePath(`/admin/events/${eventId}`);
  return { ok: true };
}

export async function closeStageAction(eventId: string, stageId: string) {
  const session = await requireSession();
  const stage = await prisma.stage.findUniqueOrThrow({ where: { id: stageId } });

  await prisma.stage.update({
    where: { id: stageId },
    data: { status: "COMPLETED", completedAt: new Date() },
  });
  await logAudit(eventId, `Stage "${stage.name}" closed by admin`, session.name);

  if (stage.autoAdvance) {
    const next = await prisma.stage.findFirst({
      where: { eventId, order: { gt: stage.order }, status: "NOT_STARTED" },
      orderBy: { order: "asc" },
    });
    if (next) {
      await prisma.stage.update({ where: { id: next.id }, data: { status: "LIVE", startedAt: new Date() } });
      await logAudit(eventId, `Stage "${next.name}" auto-opened`, "system");
    }
  }

  revalidatePath(`/admin/events/${eventId}/flow`);
  revalidatePath(`/admin/events/${eventId}/monitor`);
  revalidatePath(`/admin/events/${eventId}`);
  return { ok: true };
}

export async function addStageAction(eventId: string, name: string, candidateNames: string[]) {
  const session = await requireSession();
  if (!name.trim()) return { ok: false, error: "Stage name is required." };

  const count = await prisma.stage.count({ where: { eventId } });
  const stage = await prisma.stage.create({
    data: {
      eventId,
      order: count + 1,
      name: name.trim(),
      candidates: {
        create: candidateNames
          .filter((n) => n.trim())
          .map((n, i) => ({ name: n.trim(), order: i + 1 })),
      },
    },
  });
  await logAudit(eventId, `Stage "${stage.name}" added`, session.name);
  revalidatePath(`/admin/events/${eventId}/flow`);
  revalidatePath(`/admin/events/${eventId}`);
  return { ok: true };
}

export async function addCandidateAction(eventId: string, stageId: string, name: string, note: string) {
  await requireSession();
  if (!name.trim()) return { ok: false, error: "Name is required." };
  const count = await prisma.candidate.count({ where: { stageId } });
  await prisma.candidate.create({
    data: { stageId, name: name.trim(), note: note.trim(), order: count + 1 },
  });
  revalidatePath(`/admin/events/${eventId}/flow`);
  return { ok: true };
}

export async function removeCandidateAction(eventId: string, candidateId: string) {
  await requireSession();
  await prisma.candidate.delete({ where: { id: candidateId } });
  revalidatePath(`/admin/events/${eventId}/flow`);
  return { ok: true };
}
