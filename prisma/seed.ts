import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
const db = new PrismaClient();

async function main() {
  const adminPass = await bcrypt.hash("admin123", 10);
  const assocPass = await bcrypt.hash("associate123", 10);

  await db.user.upsert({
    where: { email: "admin@webtogo.pt" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@webtogo.pt",
      role: "ADMIN",
      passwordHash: adminPass,
    },
  });

  await db.user.upsert({
    where: { email: "comercial@webtogo.pt" },
    update: {},
    create: {
      name: "Comercial",
      email: "comercial@webtogo.pt",
      role: "ASSOCIATE",
      passwordHash: assocPass,
    },
  });
}

main().then(()=>db.$disconnect());
