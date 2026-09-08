import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient(); // DATABASE_URL = Aiven
const email = process.env.ADMIN_EMAIL || "admin@ppgtkpj.org";
const password = process.env.ADMIN_PASSWORD || "change-me";
const name = process.env.ADMIN_NAME || "Administrator";

await prisma.admin.upsert({
  where: { email },
  update: { passwordHash: await bcrypt.hash(password, 10), name },
  create: { email, passwordHash: await bcrypt.hash(password, 10), name },
});
console.log("admin ready on Aiven:", email);
await prisma.$disconnect();
