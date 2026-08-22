import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";

function csvEscape(v: string) {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      participants: {
        include: { votes: { include: { stage: true, candidate: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!event) return NextResponse.json({ error: "not found" }, { status: 404 });

  const rows = [["Participant", "Token", "Registered At", "Stage", "Candidate", "Abstain", "Voted At"]];
  for (const p of event.participants) {
    if (p.votes.length === 0) {
      rows.push([p.name ?? "", p.token, p.registeredAt?.toISOString() ?? "", "", "", "", ""]);
    }
    for (const v of p.votes) {
      rows.push([
        p.name ?? "",
        p.token,
        p.registeredAt?.toISOString() ?? "",
        v.stage.name,
        v.candidate?.name ?? "",
        v.isAbstain ? "yes" : "no",
        v.createdAt.toISOString(),
      ]);
    }
  }

  const csv = rows.map((r) => r.map(csvEscape).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${event.publicId}-audit-log.csv"`,
    },
  });
}
