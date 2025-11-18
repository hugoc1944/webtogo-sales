// app/api/contacts/new-session/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getLisbonNow,
  pickSegmentForNow,
} from "@/lib/categories";

export const dynamic = "force-dynamic";

export async function POST() {
  const now = getLisbonNow();

  // 1) reativar contactos cujo reviveAt já passou
  await prisma.contact.updateMany({
    where: {
      state: { in: ["NO_ANSWER", "SKIP"] },
      reviveAt: { lte: now },
    },
    data: {
      state: "NEW",
      reviveAt: null,
    },
  });

  // 2) escolher segmento A–J com pesos por janela
  const chosenSegment = pickSegmentForNow(now);

  const baseWhere: any = {
    state: "NEW",
    assignedToId: null, // não mostrar pendentes atribuídos
    OR: [
      { reviveAt: null },
      { reviveAt: { lte: now } },
    ],
  };

  if (chosenSegment) {
    baseWhere.segmentKey = chosenSegment;
  }

  // 3) tentar primeiro com filtro por segmento
  let contact = await prisma.contact.findFirst({
    where: baseWhere,
    orderBy: [
      { lastCalledAt: "asc" },
      { createdAt: "asc" },
    ],
  });

  // 4) fallback – se não houver nesse segmento, vai a qualquer NEW
  if (!contact) {
    contact = await prisma.contact.findFirst({
      where: {
        state: "NEW",
        assignedToId: null,
        OR: [
          { reviveAt: null },
          { reviveAt: { lte: now } },
        ],
      },
      orderBy: [
        { lastCalledAt: "asc" },
        { createdAt: "asc" },
      ],
    });
  }

  if (!contact) {
    return NextResponse.json({ contact: null });
  }

  // marca último “chamado” (mesmo que ainda não tenha atendido)
  await prisma.contact.update({
    where: { id: contact.id },
    data: { lastCalledAt: now },
  });

  return NextResponse.json({ contact });
}
