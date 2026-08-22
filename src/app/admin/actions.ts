"use server";

import { prisma } from "@/lib/prisma";
import { destroyAdminSession, getAdminSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function logoutAction() {
  await destroyAdminSession();
  redirect("/admin/login");
}

export type CreateEventInput = {
  name: string;
  description: string;
  expectedParticipants: number;
  openNow: boolean;
  stageNames: string[];
  threshold: number;
};

export async function createEventAction(input: CreateEventInput) {
  const session = await getAdminSession();
  if (!session) throw new Error("Not authenticated");
  if (input.name.trim().length <= 2) return { ok: false, error: "Event name is too short." };

  const count = await prisma.event.count();
  const publicId = "evt_" + String(count + 1).padStart(3, "0");

  const stageNames = input.stageNames.filter((n) => n.trim().length > 0);

  const event = await prisma.event.create({
    data: {
      publicId,
      name: input.name.trim(),
      description: input.description.trim(),
      status: input.openNow ? "ACTIVE" : "INACTIVE",
      expectedParticipants: input.expectedParticipants,
      stages: {
        create: (stageNames.length ? stageNames : ["Stage 1"]).map((name, i) => ({
          order: i + 1,
          name,
          thresholdMin: input.threshold,
        })),
      },
    },
  });

  await logAudit(event.id, `Event ${event.publicId} created`, session.name);

  revalidatePath("/admin/events");
  return { ok: true, id: event.id };
}

export async function toggleEventStatusAction(eventId: string) {
  const session = await getAdminSession();
  if (!session) throw new Error("Not authenticated");

  const event = await prisma.event.findUniqueOrThrow({ where: { id: eventId } });
  const next = event.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
  await prisma.event.update({ where: { id: eventId }, data: { status: next } });
  await logAudit(eventId, `Event toggled ${next}`, session.name);

  revalidatePath("/admin/events");
  revalidatePath(`/admin/events/${eventId}`);
  return { ok: true, status: next };
}
