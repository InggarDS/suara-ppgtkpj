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

  await prisma.$transaction([
    prisma.vote.deleteMany({ where: { stage: { eventId } } }),
    prisma.candidate.updateMany({ where: { stage: { eventId } }, data: { photo: null } }),
    prisma.participant.deleteMany({ where: { eventId } }),
    prisma.stage.updateMany({ where: { eventId }, data: { status: "NOT_STARTED", startedAt: null, completedAt: null } }),
    prisma.event.update({ where: { id: eventId }, data: { resultsRevealed: false } }),
  ]);
  await logAudit(eventId, "Full reset: all votes, participants and photos deleted", session.name);

  revalidatePath(`/admin/events/${eventId}`);
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
