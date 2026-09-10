"use server";

import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { revalidateAndPublish } from "@/lib/realtime";
import { normKey } from "@/lib/normalize";

async function requireSession() {
  const session = await getAdminSession();
  if (!session) throw new Error("Not authenticated");
  return session;
}

const revalidateEvent = revalidateAndPublish;

/** Registered participants are the voter pool the 100% gates are measured against. */
function totalVoters(eventId: string) {
  return prisma.participant.count({ where: { eventId, registeredAt: { not: null } } });
}

export type StageRulePatch = Partial<{
  allowAbstain: boolean;
  requireFingerprint: boolean;
  promoteCount: number;
}>;

export async function updateStageRulesAction(eventId: string, stageId: string, patch: StageRulePatch) {
  await requireSession();
  const data: StageRulePatch = { ...patch };
  if (typeof data.promoteCount === "number") {
    data.promoteCount = Math.max(0, Math.min(999, Math.floor(data.promoteCount) || 0));
  }
  await prisma.stage.update({ where: { id: stageId }, data });
  revalidatePath(`/admin/events/${eventId}/flow`);
  return { ok: true };
}

/**
 * Promote the top `promoteCount` candidates of a stage (by vote count, ties
 * broken by ballot order) into the next stage. The manual per-candidate button
 * still works alongside this; both mark the copy as PROMOTED and dedupe.
 */
export async function promoteTopCandidatesAction(eventId: string, stageId: string) {
  const session = await requireSession();

  const stage = await prisma.stage.findUnique({
    where: { id: stageId },
    include: {
      candidates: { orderBy: { order: "asc" }, include: { _count: { select: { votes: true } } } },
    },
  });
  if (!stage || stage.eventId !== eventId) return { ok: false as const, error: "Stage tidak ditemukan." };

  const n = stage.promoteCount;
  if (n <= 0) return { ok: false as const, error: 'Atur "kandidat lolos" lebih dari 0 dulu.' };

  const next = await prisma.stage.findFirst({
    where: { eventId, order: { gt: stage.order } },
    orderBy: { order: "asc" },
    include: { candidates: true },
  });
  if (!next) return { ok: false as const, error: "Tidak ada stage berikutnya." };
  if (next.status !== "NOT_STARTED") {
    return { ok: false as const, error: `"${next.name}" sudah dimulai — kandidat terkunci.` };
  }

  const ranked = [...stage.candidates]
    .sort((a, b) => b._count.votes - a._count.votes || a.order - b.order)
    .slice(0, n);
  if (ranked.every((c) => c._count.votes === 0)) {
    return { ok: false as const, error: "Belum ada suara di stage ini." };
  }

  const existingPids = new Set(next.candidates.map((c) => c.participantId).filter(Boolean) as string[]);
  const existingNames = new Set(next.candidates.map((c) => normKey(c.name)));
  const fresh = ranked.filter((c) =>
    c.participantId ? !existingPids.has(c.participantId) : !existingNames.has(normKey(c.name))
  );
  if (!fresh.length) return { ok: false as const, error: "Semua kandidat teratas sudah ada di stage berikutnya." };

  const base = next.candidates.length;
  await prisma.candidate.createMany({
    data: fresh.map((c, i) => ({
      stageId: next.id,
      name: c.name,
      note: c.note,
      photo: c.photo,
      participantId: c.participantId,
      order: base + i + 1,
      selectionSource: "PROMOTED" as const,
    })),
  });
  await logAudit(
    eventId,
    `${fresh.length} kandidat teratas "${stage.name}" dipromosikan ke "${next.name}" (aturan: ${n} besar)`,
    session.name
  );
  revalidateEvent(eventId);
  return { ok: true as const, promoted: fresh.length, skipped: ranked.length - fresh.length };
}

/** Open a stage for check-in. Only one stage may be active at a time. */
export async function openStageAction(eventId: string, stageId: string) {
  const session = await requireSession();
  const stage = await prisma.stage.findUniqueOrThrow({ where: { id: stageId } });
  if (stage.status === "CLOSED") return { ok: false, error: "This stage is closed." };

  const otherActive = await prisma.stage.findFirst({
    where: { eventId, status: { in: ["CHECK_IN", "VOTING"] }, NOT: { id: stageId } },
  });
  if (otherActive) return { ok: false, error: `"${otherActive.name}" is still active. Stop or close it first.` };

  await prisma.$transaction([
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

export async function startVotingAction(eventId: string, stageId: string, opts?: { force?: boolean }) {
  const session = await requireSession();
  const stage = await prisma.stage.findUniqueOrThrow({ where: { id: stageId } });
  if (stage.status === "CLOSED") return { ok: false, error: "This stage is closed." };

  const [total, checkedIn] = await Promise.all([
    totalVoters(eventId),
    prisma.stageCheckIn.count({ where: { stageId } }),
  ]);
  if (!opts?.force && (total === 0 || checkedIn < total)) {
    return { ok: false, error: `Check-in is at ${checkedIn}/${total}. Wait for 100% or start anyway.` };
  }

  await prisma.stage.update({
    where: { id: stageId },
    data: { status: "VOTING", startedAt: new Date(), completedAt: null },
  });
  await logAudit(
    eventId,
    `Voting started for "${stage.name}"${opts?.force && checkedIn < total ? ` (forced at ${checkedIn}/${total} checked in)` : ""}`,
    session.name
  );
  revalidateEvent(eventId);
  return { ok: true };
}

/** Permanently finish a stage. Votes and the result are kept; it can no longer
 *  be reopened or restarted from the flow. */
export async function closeStageAction(eventId: string, stageId: string) {
  const session = await requireSession();
  const stage = await prisma.stage.findUniqueOrThrow({ where: { id: stageId } });

  await prisma.stage.update({
    where: { id: stageId },
    data: { status: "CLOSED", completedAt: stage.completedAt ?? new Date() },
  });
  await logAudit(eventId, `Stage "${stage.name}" closed (final)`, session.name);
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
  if (stage.status === "CLOSED") return { ok: false, error: "This stage is closed." };

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

export async function openResultsAction(
  eventId: string,
  stageId: string,
  open: boolean,
  opts?: { force?: boolean }
) {
  const session = await requireSession();
  const stage = await prisma.stage.findUniqueOrThrow({ where: { id: stageId } });

  if (open && stage.status !== "CLOSED") {
    const [total, voted] = await Promise.all([
      totalVoters(eventId),
      prisma.vote.count({ where: { stageId } }),
    ]);
    if (!opts?.force && (total === 0 || voted < total)) {
      return { ok: false, error: `Voting is at ${voted}/${total}. Wait for 100% or open anyway.` };
    }
  }

  await prisma.$transaction([
    prisma.stage.update({ where: { id: stageId }, data: { resultsOpen: open } }),
    prisma.event.update({ where: { id: eventId }, data: { resultsRevealed: open } }),
  ]);
  await logAudit(
    eventId,
    open ? `Results opened for "${stage.name}"${opts?.force ? " (forced)" : ""}` : `Results hidden for "${stage.name}"`,
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
