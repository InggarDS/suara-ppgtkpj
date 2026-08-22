import { prisma } from "@/lib/prisma";

export async function logAudit(eventId: string, message: string, actor: string) {
  await prisma.auditLog.create({ data: { eventId, message, actor } });
}
