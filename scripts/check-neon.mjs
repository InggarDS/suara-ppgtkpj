import { PrismaClient } from "@prisma/client";
const neon = new PrismaClient({ datasources: { db: { url: process.env.NEON_DATABASE_URL } } });
try {
  const counts = {};
  for (const m of [
    "admin",
    "event",
    "credential",
    "stage",
    "stageCheckIn",
    "candidate",
    "participant",
    "vote",
    "auditLog",
  ]) {
    counts[m] = await neon[m].count();
  }
  console.log("NEON OK — row counts:", JSON.stringify(counts));
} catch (e) {
  console.log("NEON FAIL:", (e.message || "").replace(/\s+/g, " ").slice(0, 200));
}
await neon.$disconnect();
