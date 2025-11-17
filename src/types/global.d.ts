import type { PrismaClient } from "@prisma/client";

declare global {
  // Evita recriar o client a cada hot-reload em dev
  var prisma: PrismaClient | undefined;
}

export {};
