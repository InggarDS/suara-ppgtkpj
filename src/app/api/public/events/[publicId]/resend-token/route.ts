import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureCredentialParticipants } from "@/lib/credentials";
import { isEmailConfigured, sendEmails } from "@/lib/email";
import { buildTokenEmail } from "@/lib/token-email";
import { z } from "zod";

export const maxDuration = 60;

const schema = z.object({ email: z.string().min(1).max(160) });
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest, { params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ ok: false, error: "Masukkan alamat email." }, { status: 400 });

  const email = body.data.email.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return NextResponse.json({ ok: false, error: "Format email tidak valid." }, { status: 400 });

  const event = await prisma.event.findUnique({ where: { publicId } });
  if (!event) return NextResponse.json({ ok: false, error: "Acara tidak ditemukan." }, { status: 404 });
  if (event.status !== "ACTIVE") return NextResponse.json({ ok: false, error: "Acara ini sudah ditutup." }, { status: 403 });
  if (!isEmailConfigured()) {
    return NextResponse.json({ ok: false, error: "Pengiriman email belum tersedia. Hubungi panitia." }, { status: 503 });
  }

  await ensureCredentialParticipants(event.id);

  // Match the email on the credential list first, then on the participant record.
  const credential = await prisma.credential.findFirst({
    where: { eventId: event.id, email: { equals: email, mode: "insensitive" } },
    include: { participant: true },
  });
  const participant =
    credential?.participant ??
    (await prisma.participant.findFirst({
      where: { eventId: event.id, email: { equals: email, mode: "insensitive" } },
    }));

  if (!participant) {
    return NextResponse.json({ ok: false, error: "Email tidak terdaftar." }, { status: 404 });
  }

  const mail = buildTokenEmail({
    eventName: event.name,
    recipientName: participant.name,
    token: participant.token,
    inviteUrl: `${process.env.NEXT_PUBLIC_APP_URL || ""}/event/${event.publicId}`,
  });
  const report = await sendEmails([{ ...mail, to: email, toName: participant.name ?? undefined }]);
  if (!report.ok) {
    return NextResponse.json({ ok: false, error: "Gagal mengirim email. Coba lagi nanti." }, { status: 502 });
  }

  await prisma.participant.update({ where: { id: participant.id }, data: { tokenSentAt: new Date() } });
  // Never return the token itself.
  return NextResponse.json({ ok: true });
}
