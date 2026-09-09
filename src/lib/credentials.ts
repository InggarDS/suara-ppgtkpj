import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/ids";

/**
 * In credential mode every credential must own a participant (with a token) so
 * the token can be emailed and typed back in during registration. Call this
 * before emailing tokens or looking one up by email — it materialises a linked
 * participant for any credential that doesn't have one yet.
 *
 * Batched (createManyAndReturn + one transaction of links) so it stays well
 * under a serverless function's time budget even for a few hundred credentials.
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

  const rows = orphans.map((c) => {
    let token = generateToken(event.tokenPrefix, event.tokenSuffix);
    let guard = 0;
    while (used.has(token) && guard++ < 40) token = generateToken(event.tokenPrefix, event.tokenSuffix);
    used.add(token);
    return { credentialId: c.id, token, name: c.name, jemaat: c.jemaat, email: c.email };
  });

  const created = await prisma.participant.createManyAndReturn({
    data: rows.map((r) => ({ eventId, token: r.token, name: r.name, jemaat: r.jemaat, email: r.email })),
    select: { id: true, token: true },
  });

  const byToken = new Map(created.map((p) => [p.token, p.id]));
  await prisma.$transaction(
    rows
      .map((r) => ({ credId: r.credentialId, pid: byToken.get(r.token) }))
      .filter((x): x is { credId: string; pid: string } => Boolean(x.pid))
      .map((x) => prisma.credential.update({ where: { id: x.credId }, data: { participantId: x.pid } }))
  );
}
