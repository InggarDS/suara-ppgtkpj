"use server";

import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function setRevealAction(eventId: string, revealed: boolean) {
  const session = await getAdminSession();
  if (!session) return { ok: false, error: "Not authenticated" };

  await prisma.event.update({ where: { id: eventId }, data: { resultsRevealed: revealed } });
  await logAudit(eventId, revealed ? "Candidate names unlocked on shared screen" : "Candidate names hidden on shared screen", session.name);

  revalidatePath(`/admin/events/${eventId}/results`);
  return { ok: true };
}
