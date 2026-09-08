/**
 * One-time copy of every row from the old Neon database (NEON_DATABASE_URL)
 * into the current DATABASE_URL (Aiven). Safe to re-run: it clears the target
 * tables first. Run only while Neon is reachable.
 *
 *   node scripts/migrate-neon-to-aiven.mjs
 */
import { PrismaClient } from "@prisma/client";

const src = new PrismaClient({ datasources: { db: { url: process.env.NEON_DATABASE_URL } } });
const dst = new PrismaClient(); // DATABASE_URL

// child -> parent order for deletes; reverse for inserts
const deleteOrder = ["vote", "stageCheckIn", "candidate", "credential", "participant", "stage", "auditLog", "event", "admin"];

async function copy(model, rows) {
  if (!rows.length) return 0;
  // createMany keeps it fast; skipDuplicates guards a partial re-run
  const res = await dst[model].createMany({ data: rows, skipDuplicates: true });
  return res.count;
}

try {
  console.log("Reading from Neon…");
  const data = {};
  for (const m of ["admin", "event", "stage", "participant", "credential", "candidate", "stageCheckIn", "vote", "auditLog"]) {
    data[m] = await src[m].findMany();
    console.log(`  ${m}: ${data[m].length}`);
  }

  console.log("Clearing target tables…");
  for (const m of deleteOrder) await dst[m].deleteMany({});

  console.log("Writing to Aiven…");
  // Credential.participantId -> Participant, Candidate.participantId -> Participant:
  // insert participants before credentials/candidates.
  console.log("  admin:", await copy("admin", data.admin));
  console.log("  event:", await copy("event", data.event));
  console.log("  stage:", await copy("stage", data.stage));
  console.log("  participant:", await copy("participant", data.participant));
  console.log("  credential:", await copy("credential", data.credential));
  console.log("  candidate:", await copy("candidate", data.candidate));
  console.log("  stageCheckIn:", await copy("stageCheckIn", data.stageCheckIn));
  console.log("  vote:", await copy("vote", data.vote));
  console.log("  auditLog:", await copy("auditLog", data.auditLog));

  console.log("Done.");
} catch (e) {
  console.error("MIGRATION FAILED:", e.message);
  process.exitCode = 1;
} finally {
  await src.$disconnect();
  await dst.$disconnect();
}
