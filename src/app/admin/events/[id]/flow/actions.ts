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

function revalidateEvent(eventId: string) {
  revalidatePath(`/admin/events/${eventId}/flow`);
  revalidatePath(`/admin/events/${eventId}/monitor`);
  revalidatePath(`/admin/events/${eventId}/results`);
  revalidatePath(`/admin/events/${eventId}`);
}

export type StageRulePatch = Partial<{
  allowAbstain: boolean;
  requireFingerprint: boolean;
}>;

export async function updateStageRulesAction(eventId: string, stageId: string, patch: StageRulePatch) {
  await requireSession();
  await prisma.stage.update({ where: { id: stageId }, data: patch });
  revalidatePath(`/admin/events/${eventId}/flow`);
  return { ok: true };
}

/** Open a stage for check-in. Any other active stage is stopped. */
export async function openStageAction(eventId: string, stageId: string) {
  const session = await requireSession();
  const stage = await prisma.stage.findUniqueOrThrow({ where: { id: stageId } });

  await prisma.$transaction([
    prisma.stage.updateMany({
      where: { eventId, status: { in: ["CHECK_IN", "VOTING"] }, NOT: { id: stageId } },
      data: { status: "STOPPED", completedAt: new Date() },
    }),
    prisma.stageCheckIn.deleteMany({ where: { stageId } }),
    prisma.stage.update({
      where: { id: stageId },
      data: { status: "CHECK_IN", startedAt: null, completedAt: null, resultsOpen: false },
    }),
    prisma.event.update({ where: { id: eventId }, data: { resultsRevealed: false } }),
  ]);

  await logAudit(eventId, `Stage "${stage.name}" opened for check-in`, session.name);
  revalidateEvent(eventId);
  return { ok: true };
}

export async function startVotingAction(eventId: string, stageId: string) {
  const session = await requireSession();
  const stage = await prisma.stage.findUniqueOrThrow({ where: { id: stageId } });

  await prisma.stage.update({
    where: { id: stageId },
    data: { status: "VOTING", startedAt: new Date(), completedAt: null },
  });
  await logAudit(eventId, `Voting started for "${stage.name}"`, session.name);
  revalidateEvent(eventId);
  return { ok: true };
}

export async function stopVotingAction(eventId: string, stageId: string) {
  const session = await requireSession();
  const stage = await prisma.stage.findUniqueOrThrow({ where: { id: stageId } });

  await prisma.stage.update({
    where: { id: stageId },
    data: { status: "STOPPED", completedAt: new Date() },
  });
  await logAudit(eventId, `Voting stopped for "${stage.name}"`, session.name);
  revalidateEvent(eventId);
  return { ok: true };
}

/** Wipe this stage's votes and reopen voting from scratch. */
export async function restartVotingAction(eventId: string, stageId: string) {
  const session = await requireSession();
  const stage = await prisma.stage.findUniqueOrThrow({ where: { id: stageId } });

  await prisma.$transaction([
    prisma.vote.deleteMany({ where: { stageId } }),
    prisma.stage.update({
      where: { id: stageId },
      data: { status: "VOTING", startedAt: new Date(), completedAt: null },
    }),
  ]);
  await logAudit(eventId, `Voting restarted for "${stage.name}" — all votes cleared`, session.name);
  revalidateEvent(eventId);
  return { ok: true };
}

export async function openResultsAction(eventId: string, stageId: string, open: boolean) {
  const session = await requireSession();
  const stage = await prisma.stage.findUniqueOrThrow({ where: { id: stageId } });

  await prisma.stage.update({ where: { id: stageId }, data: { resultsOpen: open } });
  await logAudit(
    eventId,
    open ? `Results opened for "${stage.name}"` : `Results hidden for "${stage.name}"`,
    session.name
  );
  revalidateEvent(eventId);
  return { ok: true };
}

/** Copy a candidate from its stage into the next stage's ballot. */
export async function sendCandidateToNextStageAction(eventId: string, candidateId: string) {
  const session = await requireSession();
  const candidate = await prisma.candidate.findUniqueOrThrow({
    where: { id: candidateId },
    include: { stage: true },
  });

  const next = await prisma.stage.findFirst({
    where: { eventId, order: { gt: candidate.stage.order } },
    orderBy: { order: "asc" },
    include: { candidates: true },
  });
  if (!next) return { ok: false, error: "No next stage." };

  const clash = next.candidates.some((c) =>
    candidate.participantId ? c.participantId === candidate.participantId : c.name === candidate.name
  );
  if (clash) return { ok: false, error: "Already in the next stage." };

  await prisma.candidate.create({
    data: {
      stageId: next.id,
      name: candidate.name,
      note: candidate.note,
      photo: candidate.photo,
      participantId: candidate.participantId,
      order: next.candidates.length + 1,
      selectionSource: "PROMOTED",
    },
  });
  await logAudit(
    eventId,
    `"${candidate.name}" promoted from "${candidate.stage.name}" to "${next.name}"`,
    session.name
  );
  revalidatePath(`/admin/events/${eventId}/flow`);
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
  await logAudit(eventId, `Removed "${candidate.name}" from "${candidate.stage.name}"`, session.name);
  revalidatePath(`/admin/events/${eventId}/flow`);
  return { ok: true };
}
