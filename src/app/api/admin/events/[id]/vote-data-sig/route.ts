import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Tiny signature of the vote-data table so an already-open Management Data Vote
 * page can detect a change (a registration, a photo replacement, a candidate
 * submission) and refresh. Uses a raw query so the (potentially large, base64)
 * photo column is never transferred — only its character length.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;

  const [participants, candidateAgg] = await Promise.all([
    prisma.$queryRaw<
      { id: string; name: string | null; jemaat: string | null; token: string; plen: number; v: number; r: number }[]
    >`
      SELECT "id", "name", "jemaat", "token",
             COALESCE(char_length("photo"), 0)::int AS "plen",
             (CASE WHEN "validatedAt" IS NULL THEN 0 ELSE 1 END)::int AS "v",
             (CASE WHEN "registeredAt" IS NULL THEN 0 ELSE 1 END)::int AS "r"
      FROM "Participant"
      WHERE "eventId" = ${id}
      ORDER BY "createdAt" ASC
    `,
    prisma.candidate.aggregate({ where: { stage: { eventId: id } }, _count: true }),
  ]);

  const sig =
    `c${candidateAgg._count};` +
    participants
      .map((p) => `${p.id}:${p.name ?? ""}:${p.jemaat ?? ""}:${p.token}:${p.plen}:${p.v}:${p.r}`)
      .join("|");

  return NextResponse.json({ sig }, { headers: { "Cache-Control": "no-store" } });
}
