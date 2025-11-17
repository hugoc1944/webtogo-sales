// app/api/contacts/new-session/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  // reativar NO_ANSWER/SKIP vencidos
  await prisma.contact.updateMany({
    where: { state: { in: ["NO_ANSWER", "SKIP"] }, reviveAt: { lte: new Date() } },
    data: { state: "NEW", reviveAt: null },
  });

  const contact = await prisma.contact.findFirst({
    where: { state: "NEW", /* plus your revive filters */ },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      companyName: true,
      firstName: true,
      lastName: true,
      title: true,             // 👈 add this
      email: true,
      industry: true,
      keywords: true,
      phoneWork: true,
      phoneMobile: true,
      phoneCorp: true,
      website: true,
    },
  });

  if (!contact) return NextResponse.json({ contact: null });

  await prisma.contact.update({
    where: { id: contact.id },
    data: { lastCalledAt: new Date() },
  });

  return NextResponse.json({ contact });
}
