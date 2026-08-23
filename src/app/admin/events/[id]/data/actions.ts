"use server";

import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function resetVotesAction(eventId: string) {
  const session = await getAdminSession();
  if (!session) return { ok: false, error: "Not authenticated" };

  const stages = await prisma.stage.findMany({ where: { eventId }, select: { id: true } });
  await prisma.vote.deleteMany({ where: { stageId: { in: stages.map((s) => s.id) } } });
  await logAudit(eventId, "All votes reset", session.name);

  revalidatePath(`/admin/events/${eventId}/data`);
  revalidatePath(`/admin/events/${eventId}/monitor`);
  return { ok: true };
}

export async function fullResetAction(eventId: string) {
  const session = await getAdminSession();
  if (!session) return { ok: false, error: "Not authenticated" };

  const stages = await prisma.stage.findMany({ where: { eventId }, select: { id: true, order: true } });
  const firstStageOrder = stages.length ? Math.min(...stages.map((s) => s.order)) : 0;
  const laterStageIds = stages.filter((s) => s.order !== firstStageOrder).map((s) => s.id);

  await prisma.$transaction([
    prisma.vote.deleteMany({ where: { stage: { eventId } } }),
    // Stage 1's candidate list is the admin's original ballot; every later stage's list
    // was populated during the run (auto-selected or added live), so it goes with the reset.
    prisma.candidate.deleteMany({ where: { stageId: { in: laterStageIds } } }),
    prisma.candidate.updateMany({ where: { stage: { eventId } }, data: { photo: null } }),
    prisma.participant.deleteMany({ where: { eventId } }),
    prisma.stage.updateMany({ where: { eventId }, data: { status: "NOT_STARTED", startedAt: null, completedAt: null } }),
    prisma.event.update({ where: { id: eventId }, data: { resultsRevealed: false } }),
  ]);
  await logAudit(
    eventId,
    "Full reset: all votes, participants, photos, and later-stage candidate lists deleted",
    session.name
  );

  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath(`/admin/events/${eventId}/flow`);
  return { ok: true };
}

export async function deleteEventAction(eventId: string) {
  const session = await getAdminSession();
  if (!session) return { ok: false, error: "Not authenticated" };

  await prisma.event.delete({ where: { id: eventId } });

  revalidatePath("/admin/events");
  redirect("/admin/events");
}

export async function archiveEventAction(eventId: string) {
  const session = await getAdminSession();
  if (!session) throw new Error("Not authenticated");

  await prisma.event.update({ where: { id: eventId }, data: { status: "ARCHIVED" } });
  await logAudit(eventId, "Event archived", session.name);

  revalidatePath("/admin/events");
  redirect("/admin/events");
}
