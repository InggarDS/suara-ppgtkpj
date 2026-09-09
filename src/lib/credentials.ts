import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/ids";

/**
 * In credential mode every credential must own a participant (with a token) so
 * the token can be emailed and typed back in during registration. Call this
 * before emailing tokens or looking one up by email — it materialises a linked
 * participant for any credential that doesn't have one yet.
 */
export async function ensureCredentialParticipants(eventId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { tokenPrefix: true, tokenSuffix: true, useCredentials: true },
  });
  if (!event || !event.useCredentials) return;

  const orphans = await prisma.credential.findMany({
    where: { eventId, participantId: null },
    select: { id: true, name: true, jemaat: true, email: true },
  });
  if (!orphans.length) return;

  const used = new Set(
    (await prisma.participant.findMany({ where: { eventId }, select: { token: true } })).map((p) => p.token)
  );

  for (const c of orphans) {
    let token = generateToken(event.tokenPrefix, event.tokenSuffix);
    let guard = 0;
    while (used.has(token) && guard++ < 20) token = generateToken(event.tokenPrefix, event.tokenSuffix);
    used.add(token);

    const participant = await prisma.participant.create({
      data: { eventId, token, name: c.name, jemaat: c.jemaat, email: c.email },
    });
    await prisma.credential.update({ where: { id: c.id }, data: { participantId: participant.id } });
  }
}
