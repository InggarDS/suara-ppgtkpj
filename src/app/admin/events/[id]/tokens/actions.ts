"use server";

import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { generateToken } from "@/lib/ids";
import { revalidatePath } from "next/cache";

export async function generateTokensAction(eventId: string, count: number) {
  const session = await getAdminSession();
  if (!session) return { ok: false, error: "Not authenticated" };

  const tokens = new Set<string>();
  while (tokens.size < count) tokens.add(generateToken());

  // one round-trip to weed out rare collisions, instead of a query per token
  const existing = await prisma.participant.findMany({
    where: { token: { in: Array.from(tokens) } },
    select: { token: true },
  });
  for (const { token } of existing) tokens.delete(token);
  while (tokens.size < count) tokens.add(generateToken());

  const tokenList = Array.from(tokens);
  await prisma.participant.createMany({
    data: tokenList.map((token) => ({ eventId, token })),
  });
  await logAudit(eventId, `${count} tokens generated`, session.name);

  revalidatePath(`/admin/events/${eventId}/tokens`);
  return { ok: true, tokens: tokenList };
}
