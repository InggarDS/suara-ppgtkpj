import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  token: z.string().min(1),
  name: z.string().min(1).max(120),
  photo: z.string().nullable().optional(),
  deviceId: z.string().min(1),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ ok: false, error: "Invalid input." }, { status: 400 });
  const { token, name, photo, deviceId } = body.data;

  const event = await prisma.event.findUnique({ where: { publicId } });
  if (!event) return NextResponse.json({ ok: false, error: "Event not found." }, { status: 404 });
  if (event.status !== "ACTIVE") return NextResponse.json({ ok: false, error: "This event is not open for registration." }, { status: 403 });

  const participant = await prisma.participant.findFirst({ where: { eventId: event.id, token: token.trim().toUpperCase() } });
  if (!participant) return NextResponse.json({ ok: false, error: "Invalid token. Check the code from your invitation." }, { status: 404 });

  if (participant.registeredAt && participant.deviceId && participant.deviceId !== deviceId) {
    return NextResponse.json({ ok: false, error: "This token has already been registered on another device." }, { status: 409 });
  }

  await prisma.participant.update({
    where: { id: participant.id },
    data: {
      name: name.trim(),
      photo: photo ?? participant.photo,
      deviceId,
      registeredAt: participant.registeredAt ?? new Date(),
    },
  });

  return NextResponse.json({ ok: true, token: participant.token });
}
