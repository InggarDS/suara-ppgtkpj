import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/ids";
import { publish } from "@/lib/realtime";
import { z } from "zod";

const schema = z.object({
  token: z.string().optional(),
  name: z.string().min(1).max(120),
  jemaat: z.string().max(120).optional(),
  photo: z.string().nullable().optional(),
  deviceId: z.string().min(1),
  deviceLabel: z.string().max(80).optional(),
});

async function uniqueToken(prefix: string, suffix: string) {
  for (let i = 0; i < 10; i++) {
    const token = generateToken(prefix, suffix);
    const existing = await prisma.participant.findUnique({ where: { token } });
    if (!existing) return token;
  }
  throw new Error("Could not generate a unique token.");
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ ok: false, error: "Input tidak valid." }, { status: 400 });
  const { name, photo, deviceId, deviceLabel } = body.data;

  const event = await prisma.event.findUnique({ where: { publicId } });
  if (!event) return NextResponse.json({ ok: false, error: "Acara tidak ditemukan." }, { status: 404 });
  if (event.status !== "ACTIVE") return NextResponse.json({ ok: false, error: "Pendaftaran untuk acara ini belum dibuka." }, { status: 403 });

  if (event.useCredentials) {
    const credential = await prisma.credential.findFirst({
      where: { eventId: event.id, name: { equals: name.trim(), mode: "insensitive" } },
    });
    if (!credential) return NextResponse.json({ ok: false, error: "Nama tidak sesuai kredensi" }, { status: 404 });

    if (credential.participantId) {
      const participant = await prisma.participant.findUnique({ where: { id: credential.participantId } });
      if (participant) {
        if (participant.deviceId && participant.deviceId !== deviceId) {
          return NextResponse.json({ ok: false, error: "Nama ini sudah terdaftar di perangkat lain." }, { status: 409 });
        }
        await prisma.participant.update({
          where: { id: participant.id },
          data: {
            photo: photo ?? participant.photo,
            deviceId,
            deviceLabel: deviceLabel ?? participant.deviceLabel,
            registeredAt: participant.registeredAt ?? new Date(),
          },
        });
        publish(event.id);
        return NextResponse.json({ ok: true, token: participant.token });
      }
    }

    const token = await uniqueToken(event.tokenPrefix, event.tokenSuffix);
    const participant = await prisma.participant.create({
      data: {
        eventId: event.id,
        name: credential.name,
        jemaat: credential.jemaat,
        token,
        photo: photo ?? null,
        deviceId,
        deviceLabel: deviceLabel ?? null,
        registeredAt: new Date(),
      },
    });
    await prisma.credential.update({
      where: { id: credential.id },
      data: { participantId: participant.id, usedAt: new Date() },
    });

    publish(event.id);
    return NextResponse.json({ ok: true, token: participant.token });
  }

  const token = body.data.token?.trim().toUpperCase();
  const jemaat = body.data.jemaat?.trim();
  if (!token || !jemaat) return NextResponse.json({ ok: false, error: "Token dan jemaat wajib diisi." }, { status: 400 });

  const participant = await prisma.participant.findFirst({ where: { eventId: event.id, token } });
  if (!participant) return NextResponse.json({ ok: false, error: "Token tidak valid. Periksa kembali kode dari undangan Anda." }, { status: 404 });

  if (participant.registeredAt && participant.deviceId && participant.deviceId !== deviceId) {
    return NextResponse.json({ ok: false, error: "Token ini sudah terdaftar di perangkat lain." }, { status: 409 });
  }

  await prisma.participant.update({
    where: { id: participant.id },
    data: {
      name: name.trim(),
      jemaat,
      photo: photo ?? participant.photo,
      deviceId,
      deviceLabel: deviceLabel ?? participant.deviceLabel,
      registeredAt: participant.registeredAt ?? new Date(),
    },
  });

  publish(event.id);
  return NextResponse.json({ ok: true, token: participant.token });
}
