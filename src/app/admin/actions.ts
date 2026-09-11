"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureCredentialParticipants } from "@/lib/credentials";
import { destroyAdminSession, getAdminSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { publish } from "@/lib/realtime";
import { uploadImage, deleteImage } from "@/lib/storage";
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
  bannerImage?: string | null;
  useCredentials?: boolean;
  credentials?: { name: string; jemaat: string; email?: string }[];
};

export async function createEventAction(input: CreateEventInput) {
  const session = await getAdminSession();
  if (!session) throw new Error("Not authenticated");
  if (input.name.trim().length <= 2) return { ok: false, error: "Event name is too short." };
  if (input.useCredentials && !(input.credentials && input.credentials.length)) {
    return { ok: false, error: "Upload a credential sheet before creating the event." };
  }

  const stageNames = input.stageNames.filter((n) => n.trim().length > 0);

  const eventData = {
    name: input.name.trim(),
    description: input.description.trim(),
    // Banner is uploaded to R2 after the event exists (the object key is
    // keyed by eventId) — see the upload below.
    bannerImage: null as string | null,
    status: input.openNow ? ("ACTIVE" as const) : ("INACTIVE" as const),
    expectedParticipants: input.expectedParticipants,
    useCredentials: Boolean(input.useCredentials),
    stages: {
      create: (stageNames.length ? stageNames : ["Stage 1"]).map((name, i) => ({
        order: i + 1,
        name,
      })),
    },
    credentials: input.useCredentials
      ? { create: input.credentials!.map((c) => ({ name: c.name, jemaat: c.jemaat, email: c.email?.trim() || null })) }
      : undefined,
  };

  // publicIds look like "evt_003"; derive the next free number from the highest
  // existing one (not the row count — events can be deleted, leaving gaps) and
  // retry on the off chance of a concurrent create racing us to the same id.
  const existing = await prisma.event.findMany({ select: { publicId: true } });
  let nextNum =
    existing.reduce((max, e) => {
      const m = /^evt_(\d+)$/.exec(e.publicId);
      return m ? Math.max(max, Number(m[1])) : max;
    }, 0) + 1;

  let event;
  for (let attempt = 0; ; attempt++) {
    const publicId = "evt_" + String(nextNum).padStart(3, "0");
    try {
      event = await prisma.event.create({ data: { publicId, ...eventData } });
      break;
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002" &&
        attempt < 25
      ) {
        nextNum++;
        continue;
      }
      throw err;
    }
  }

  if (input.bannerImage) {
    const stored = await uploadImage(input.bannerImage, `banners/${event.id}.jpg`);
    await prisma.event.update({ where: { id: event.id }, data: { bannerImage: stored } });
  }

  if (input.useCredentials) await ensureCredentialParticipants(event.id);

  await logAudit(
    event.id,
    `Event ${event.publicId} created${input.useCredentials ? ` with ${input.credentials!.length} credentials` : ""}`,
    session.name
  );

  revalidatePath("/admin/events");
  return { ok: true, id: event.id };
}

export async function updateBannerAction(eventId: string, bannerImage: string | null) {
  const session = await getAdminSession();
  if (!session) return { ok: false, error: "Not authenticated" };

  const stored = bannerImage ? await uploadImage(bannerImage, `banners/${eventId}.jpg`) : null;
  if (!bannerImage) await deleteImage(`banners/${eventId}.jpg`);
  await prisma.event.update({ where: { id: eventId }, data: { bannerImage: stored } });
  await logAudit(eventId, bannerImage ? "Banner image updated" : "Banner image removed", session.name);

  revalidatePath(`/admin/events/${eventId}`);
  return { ok: true };
}

export async function reorderEventsAction(orderedIds: string[]) {
  const session = await getAdminSession();
  if (!session) return { ok: false, error: "Not authenticated" };

  await prisma.$transaction(
    orderedIds.map((id, i) =>
      prisma.event.update({ where: { id }, data: { order: i + 1 } })
    )
  );

  revalidatePath("/admin/events");
  return { ok: true };
}

export async function deleteEventFromListAction(eventId: string) {
  const session = await getAdminSession();
  if (!session) return { ok: false, error: "Not authenticated" };

  await prisma.event.delete({ where: { id: eventId } });

  revalidatePath("/admin/events");
  return { ok: true };
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
  publish(eventId);
  return { ok: true, status: next };
}
