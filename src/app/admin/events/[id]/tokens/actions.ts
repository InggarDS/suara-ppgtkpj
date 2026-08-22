"use server";

import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { generateToken } from "@/lib/ids";
import { revalidatePath } from "next/cache";

export async function generateTokensAction(eventId: string, count: number) {
  const session = await getAdminSession();
  if (!session) return { ok: false, error: "Not authenticated" };
  count = Math.max(1, Math.min(1000, Math.floor(count) || 0));

  const event = await prisma.event.findUniqueOrThrow({ where: { id: eventId } });
  const { tokenPrefix, tokenSuffix } = event;

  const tokens = new Set<string>();
  while (tokens.size < count) tokens.add(generateToken(tokenPrefix, tokenSuffix));

  // one round-trip to weed out rare collisions, instead of a query per token
  const existing = await prisma.participant.findMany({
    where: { token: { in: Array.from(tokens) } },
    select: { token: true },
  });
  for (const { token } of existing) tokens.delete(token);
  while (tokens.size < count) tokens.add(generateToken(tokenPrefix, tokenSuffix));

  const tokenList = Array.from(tokens);
  await prisma.participant.createMany({
    data: tokenList.map((token) => ({ eventId, token })),
  });
  await logAudit(eventId, `${count} tokens generated`, session.name);

  revalidatePath(`/admin/events/${eventId}/tokens`);
  return { ok: true, tokens: tokenList };
}

export async function updateTokenFormatAction(eventId: string, tokenPrefix: string, tokenSuffix: string) {
  const session = await getAdminSession();
  if (!session) return { ok: false, error: "Not authenticated" };

  await prisma.event.update({ where: { id: eventId }, data: { tokenPrefix, tokenSuffix } });
  await logAudit(eventId, `Token format changed to "${tokenPrefix}____${tokenSuffix}"`, session.name);

  revalidatePath(`/admin/events/${eventId}/tokens`);
  return { ok: true };
}

export async function addCredentialsAction(eventId: string, credentials: { name: string; jemaat: string }[]) {
  const session = await getAdminSession();
  if (!session) return { ok: false, error: "Not authenticated" };
  if (!credentials.length) return { ok: false, error: "No rows found in the file." };

  await prisma.credential.createMany({
    data: credentials.map((c) => ({ eventId, name: c.name, jemaat: c.jemaat })),
  });
  await logAudit(eventId, `${credentials.length} credentials uploaded`, session.name);

  revalidatePath(`/admin/events/${eventId}/tokens`);
  return { ok: true };
}

export async function deleteCredentialAction(eventId: string, credentialId: string) {
  const session = await getAdminSession();
  if (!session) return { ok: false, error: "Not authenticated" };

  const credential = await prisma.credential.findUnique({ where: { id: credentialId } });
  if (!credential || credential.eventId !== eventId) return { ok: false, error: "Not found" };

  await prisma.credential.delete({ where: { id: credentialId } });
  await logAudit(eventId, `Credential "${credential.name}" removed`, session.name);

  revalidatePath(`/admin/events/${eventId}/tokens`);
  return { ok: true };
}

export async function deleteParticipantAction(eventId: string, participantId: string) {
  const session = await getAdminSession();
  if (!session) return { ok: false, error: "Not authenticated" };

  const participant = await prisma.participant.findUnique({ where: { id: participantId } });
  if (!participant || participant.eventId !== eventId) return { ok: false, error: "Not found" };

  await prisma.participant.delete({ where: { id: participantId } });
  await logAudit(eventId, `Participant ${participant.name ?? participant.token} deleted`, session.name);

  revalidatePath(`/admin/events/${eventId}/tokens`);
  return { ok: true };
}
