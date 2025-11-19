// app/api/contacts/new-session/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLisbonNow } from "@/lib/categories";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Helper: try to claim ONE contact for this user (with optimistic locking)
async function claimNextContact(where: any, userId: string, now: Date) {
  // A few retries in case of race-conditions
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = await prisma.contact.findFirst({
      where,
      orderBy: [
        { lastCalledAt: "asc" },
        { createdAt: "asc" },
      ],
    });

    if (!candidate) return null;

    // Only claim if it's still NEW and not assigned to another commercial
    const result = await prisma.contact.updateMany({
      where: {
        id: candidate.id,
        state: "NEW",
        OR: [
          { assignedToId: null },
          { assignedToId: userId }, // allow re-claiming own NEW contacts if needed
        ],
      },
      data: {
        assignedToId: userId,
        lastCalledAt: now,
      },
    });

    if (result.count === 1) {
      // Claimed successfully by this user
      return candidate;
    }

    // If count === 0, someone else took it in the meantime – loop and try another
  }

  return null;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userSession = session?.user as any;

  if (!session || !userSession?.id) {
    return NextResponse.json(
      { contact: null, error: "Não autenticado." },
      { status: 401 }
    );
  }

  const userId = userSession.id as string;
  const now = getLisbonNow();

  // 👇 Ler o segmento escolhido vindo do front-end
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const segmentKey = body.segmentKey as string | undefined;

  if (!segmentKey) {
    return NextResponse.json(
      { contact: null, error: "Falta segmentKey nesta sessão." },
      { status: 400 }
    );
  }

  // 1) Reativar contactos que já passaram o reviveAt
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

  // 2) Filtro base: NEW + segmento desta sessão + não pertencem a outro comercial
  const baseWhere: any = {
    state: "NEW",
    segmentKey, // <- só este segmento
    AND: [
      {
        // Só contactos livres ou já deste comercial
        OR: [{ assignedToId: null }, { assignedToId: userId }],
      },
      {
        // Segurança extra com reviveAt
        OR: [{ reviveAt: null }, { reviveAt: { lte: now } }],
      },
    ],
  };

  // 3) Tenta obter e "claimar" um contacto deste segmento
  const contact = await claimNextContact(baseWhere, userId, now);

  // 4) Sem fallback para outros segmentos – sessão é focada
  if (!contact) {
    return NextResponse.json({ contact: null });
  }

  return NextResponse.json({ contact });
}
