import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { publish } from "@/lib/realtime";
import { z } from "zod";

const schema = z.object({ token: z.string().min(1) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ ok: false, error: "Input tidak valid." }, { status: 400 });
  const token = body.data.token.trim().toUpperCase();

  const event = await prisma.event.findUnique({
    where: { publicId },
    include: { stages: { where: { status: { in: ["CHECK_IN", "VOTING"] } }, orderBy: { order: "asc" } } },
  });
  if (!event) return NextResponse.json({ ok: false, error: "Acara tidak ditemukan." }, { status: 404 });
  if (event.status !== "ACTIVE") return NextResponse.json({ ok: false, error: "Acara ini sudah ditutup." }, { status: 403 });

  const stage = event.stages[0];
  if (!stage) return NextResponse.json({ ok: false, error: "Belum ada stage yang dibuka." }, { status: 409 });

  const participant = await prisma.participant.findFirst({ where: { eventId: event.id, token } });
  if (!participant || !participant.registeredAt) {
    return NextResponse.json({ ok: false, error: "Daftar terlebih dahulu." }, { status: 403 });
  }

  // Registered after this stage's check-in window opened — not eligible until
  // the next stage. `openedAt` is null for stages opened before this column
  // existed, so those stay ungated.
  if (stage.openedAt && participant.registeredAt > stage.openedAt) {
    return NextResponse.json(
      { ok: false, error: "Maaf anda sudah terlambat melakukan registrasi ulang, harap hubungi admin." },
      { status: 403 }
    );
  }

  await prisma.stageCheckIn.upsert({
    where: { stageId_participantId: { stageId: stage.id, participantId: participant.id } },
    create: { stageId: stage.id, participantId: participant.id },
    update: {},
  });
  publish(event.id);

  return NextResponse.json({ ok: true });
}
