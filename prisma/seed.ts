import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || "admin@ppgtkpj.org";
  const password = process.env.ADMIN_PASSWORD || "change-me";
  const name = process.env.ADMIN_NAME || "Administrator";

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.admin.upsert({
    where: { email },
    update: { passwordHash, name },
    create: { email, passwordHash, name },
  });

  console.log(`Seeded admin account: ${email}`);

  const existing = await prisma.event.findUnique({ where: { publicId: "evt_001" } });
  if (!existing) {
    await prisma.event.create({
      data: {
        publicId: "evt_001",
        name: "Pemilihan Ketua Umum",
        description: "Pemilihan pengurus harian periode 2026–2028.",
        status: "INACTIVE",
        expectedParticipants: 300,
        stages: {
          create: [
            {
              order: 1,
              name: "Pemilihan Bakal Calon",
              status: "NOT_STARTED",
              thresholdMin: 10,
              candidates: {
                create: [
                  { name: "Nadia Rahmawati", note: "Bidang Organisasi · 4 tahun", order: 1 },
                  { name: "Bagus Prakoso", note: "Bidang Kaderisasi · 6 tahun", order: 2 },
                  { name: "Sekar Ayu Pratiwi", note: "Bidang Advokasi · 3 tahun", order: 3 },
                ],
              },
            },
            {
              order: 2,
              name: "Pemilihan Calon Tetap",
              status: "NOT_STARTED",
              thresholdMin: 10,
              candidates: {
                create: [
                  { name: "Nadia Rahmawati", note: "Bidang Organisasi · 4 tahun", order: 1 },
                  { name: "Bagus Prakoso", note: "Bidang Kaderisasi · 6 tahun", order: 2 },
                  { name: "Sekar Ayu Pratiwi", note: "Bidang Advokasi · 3 tahun", order: 3 },
                ],
              },
            },
          ],
        },
      },
    });
    console.log("Seeded sample event evt_001");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
