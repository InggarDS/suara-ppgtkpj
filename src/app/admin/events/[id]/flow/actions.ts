"use server";

import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { autoSelectNextStageCandidates } from "@/lib/stage-transition";
import { revalidatePath } from "next/cache";

async function requireSession() {
  const session = await getAdminSession();
  if (!session) throw new Error("Not authenticated");
  return session;
}

export type StageRulePatch = Partial<{
  thresholdMin: number;
  advanceThreshold: number | null;
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
    await autoSelectNextStageCandidates(stage);
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

async function requireEditableStage(stageId: string) {
  const stage = await prisma.stage.findUniqueOrThrow({ where: { id: stageId } });
  if (stage.status !== "NOT_STARTED") return null;
  return stage;
}

export async function addCandidateAction(eventId: string, stageId: string, name: string, note: string) {
  const session = await requireSession();
  if (!name.trim()) return { ok: false, error: "Name is required." };
  const stage = await requireEditableStage(stageId);
  if (!stage) return { ok: false, error: "Candidates are locked once a stage has started." };

  const count = await prisma.candidate.count({ where: { stageId } });
  await prisma.candidate.create({
    data: { stageId, name: name.trim(), note: note.trim(), order: count + 1 },
  });
  await logAudit(eventId, `Added "${name.trim()}" to "${stage.name}" (manual)`, session.name);
  revalidatePath(`/admin/events/${eventId}/flow`);
  return { ok: true };
}

export async function addCandidateFromParticipantAction(eventId: string, stageId: string, participantId: string) {
  const session = await requireSession();
  const stage = await requireEditableStage(stageId);
  if (!stage) return { ok: false, error: "Candidates are locked once a stage has started." };
  const participant = await prisma.participant.findUnique({ where: { id: participantId } });
  if (!participant || !participant.name) return { ok: false, error: "Participant not found." };

  const count = await prisma.candidate.count({ where: { stageId } });
  await prisma.candidate.create({
    data: {
      stageId,
      name: participant.name,
      note: participant.jemaat ? `Jemaat ${participant.jemaat}` : "",
      photo: participant.photo,
      participantId: participant.id,
      order: count + 1,
    },
  });
  await logAudit(eventId, `Added "${participant.name}" to "${stage.name}" (manual)`, session.name);
  revalidatePath(`/admin/events/${eventId}/flow`);
  return { ok: true };
}

export async function addAllParticipantsAsCandidatesAction(eventId: string, stageId: string, participantIds: string[]) {
  const session = await requireSession();
  if (!participantIds.length) return { ok: false, error: "No participants to add." };
  const stage = await requireEditableStage(stageId);
  if (!stage) return { ok: false, error: "Candidates are locked once a stage has started." };

  const participants = await prisma.participant.findMany({
    where: { id: { in: participantIds }, name: { not: null } },
  });
  if (!participants.length) return { ok: false, error: "No participants to add." };

  const count = await prisma.candidate.count({ where: { stageId } });
  await prisma.candidate.createMany({
    data: participants.map((p, i) => ({
      stageId,
      name: p.name!,
      note: p.jemaat ? `Jemaat ${p.jemaat}` : "",
      photo: p.photo,
      participantId: p.id,
      order: count + i + 1,
    })),
  });
  await logAudit(eventId, `Added ${participants.length} participant(s) to "${stage.name}" (manual)`, session.name);
  revalidatePath(`/admin/events/${eventId}/flow`);
  return { ok: true, added: participants.length };
}

export async function removeCandidateAction(eventId: string, candidateId: string) {
  const session = await requireSession();
  const candidate = await prisma.candidate.findUniqueOrThrow({ where: { id: candidateId }, include: { stage: true } });
  if (candidate.stage.status !== "NOT_STARTED") {
    return { ok: false, error: "Candidates are locked once a stage has started." };
  }
  await prisma.candidate.delete({ where: { id: candidateId } });
  await logAudit(
    eventId,
    `Removed "${candidate.name}" from "${candidate.stage.name}"${
      candidate.selectionSource === "AUTO_THRESHOLD" ? " (was auto-selected via vote threshold)" : ""
    }`,
    session.name
  );
  revalidatePath(`/admin/events/${eventId}/flow`);
  return { ok: true };
}
