"use server";

import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { generateToken } from "@/lib/ids";
import { isMailjetConfigured, sendEmails } from "@/lib/mailjet";
import { buildTokenEmail } from "@/lib/token-email";
import { revalidatePath } from "next/cache";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

export async function addCredentialsAction(
  eventId: string,
  credentials: { name: string; jemaat: string; email?: string }[]
) {
  const session = await getAdminSession();
  if (!session) return { ok: false, error: "Not authenticated" };
  if (!credentials.length) return { ok: false, error: "No rows found in the file." };

  await prisma.credential.createMany({
    data: credentials.map((c) => ({
      eventId,
      name: c.name,
      jemaat: c.jemaat,
      email: c.email?.trim() ? c.email.trim() : null,
    })),
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

/* -------------------------------------------------------------------------- */
/* Emailing tokens to participants (Mailjet)                                 */
/* -------------------------------------------------------------------------- */

function inviteUrl(publicId: string) {
  return `${process.env.NEXT_PUBLIC_APP_URL || ""}/event/${publicId}`;
}

export async function updateParticipantEmailAction(eventId: string, participantId: string, email: string) {
  const session = await getAdminSession();
  if (!session) return { ok: false as const, error: "Not authenticated" };

  const value = email.trim();
  if (value && !EMAIL_RE.test(value)) return { ok: false as const, error: "Format email tidak valid." };

  const participant = await prisma.participant.findUnique({ where: { id: participantId } });
  if (!participant || participant.eventId !== eventId) return { ok: false as const, error: "Not found" };

  await prisma.participant.update({
    where: { id: participantId },
    data: { email: value || null },
  });
  revalidatePath(`/admin/events/${eventId}/tokens`);
  return { ok: true as const };
}

export async function sendTokenEmailAction(eventId: string, participantId: string) {
  const session = await getAdminSession();
  if (!session) return { ok: false as const, error: "Not authenticated" };
  if (!isMailjetConfigured()) return { ok: false as const, error: "Mailjet belum dikonfigurasi di server." };

  const event = await prisma.event.findUniqueOrThrow({ where: { id: eventId }, select: { name: true, publicId: true } });
  const participant = await prisma.participant.findUnique({ where: { id: participantId } });
  if (!participant || participant.eventId !== eventId) return { ok: false as const, error: "Peserta tidak ditemukan." };
  if (!participant.email) return { ok: false as const, error: "Peserta belum memiliki alamat email." };

  const mail = buildTokenEmail({
    eventName: event.name,
    recipientName: participant.name,
    token: participant.token,
    inviteUrl: inviteUrl(event.publicId),
  });
  const report = await sendEmails([{ ...mail, to: participant.email, toName: participant.name ?? undefined }]);

  if (!report.ok) {
    return { ok: false as const, error: report.failed[0]?.error ?? report.error ?? "Gagal mengirim email." };
  }

  await prisma.participant.update({ where: { id: participantId }, data: { tokenSentAt: new Date() } });
  await logAudit(eventId, `Token dikirim ke ${participant.email}`, session.name);
  revalidatePath(`/admin/events/${eventId}/tokens`);
  return { ok: true as const };
}

export async function sendAllTokenEmailsAction(eventId: string) {
  const session = await getAdminSession();
  if (!session) return { ok: false as const, error: "Not authenticated" };
  if (!isMailjetConfigured()) return { ok: false as const, error: "Mailjet belum dikonfigurasi di server." };

  const event = await prisma.event.findUniqueOrThrow({ where: { id: eventId }, select: { name: true, publicId: true } });
  const participants = await prisma.participant.findMany({
    where: { eventId, email: { not: null } },
    select: { id: true, name: true, token: true, email: true },
  });
  if (!participants.length) return { ok: false as const, error: "Tidak ada peserta dengan alamat email." };

  const link = inviteUrl(event.publicId);
  const emails = participants.map((p) => {
    const mail = buildTokenEmail({ eventName: event.name, recipientName: p.name, token: p.token, inviteUrl: link });
    return { ...mail, to: p.email!, toName: p.name ?? undefined };
  });

  const report = await sendEmails(emails);
  const failedSet = new Set(report.failed.map((f) => f.to));
  const okIds = participants.filter((p) => !failedSet.has(p.email!)).map((p) => p.id);

  if (okIds.length) {
    await prisma.participant.updateMany({ where: { id: { in: okIds } }, data: { tokenSentAt: new Date() } });
  }
  await logAudit(
    eventId,
    `Kirim token massal: ${report.sent} terkirim${report.failed.length ? `, ${report.failed.length} gagal` : ""}`,
    session.name
  );
  revalidatePath(`/admin/events/${eventId}/tokens`);
  return {
    ok: report.failed.length === 0,
    sent: report.sent,
    failed: report.failed.length,
    error: report.failed.length ? `${report.failed.length} email gagal terkirim.` : undefined,
  };
}
