import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const name = req.nextUrl.searchParams.get("name")?.trim();
  if (!name) return NextResponse.json({ found: false });

  const event = await prisma.event.findUnique({ where: { publicId } });
  if (!event || !event.useCredentials) return NextResponse.json({ found: false });

  const credential = await prisma.credential.findFirst({
    where: { eventId: event.id, name: { equals: name, mode: "insensitive" } },
  });

  if (!credential) return NextResponse.json({ found: false });
  return NextResponse.json({ found: true, jemaat: credential.jemaat });
}
