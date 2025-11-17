// app/api/contacts/[id]/disposition/route.ts
export const runtime = "nodejs"; // Prisma precisa de Node

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Action = "NO_ANSWER" | "CALL_LATER" | "BOOKED" | "REFUSED";
const THREE_HOURS_MS = 3 * 60 * 60 * 1000;

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> } // 👈 params é Promise
) {
  // 👇 DESENPACOTAR params com await
  const { id } = await ctx.params;

  try {
    if (!id) {
      console.error("[disposition] missing id");
      return NextResponse.json({ ok: false, error: "missing id" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const action: Action | undefined = body?.action;
    const userId: string | undefined = body?.userId || undefined;
    const sessionId: string | null = body?.sessionId ?? null;
    const durationSec: number | undefined =
      typeof body?.durationSec === "number" ? Math.max(0, body.durationSec) : undefined;

    if (!action) {
      console.error("[disposition] missing action");
      return NextResponse.json({ ok: false, error: "missing action" }, { status: 400 });
    }

    // registo do tempo por contacto (opcional)
    if (durationSec && userId) {
      await prisma.contactTimer.create({
        data: { contactId: id, userId, sessionId, durationSec, endedAt: new Date() },
      });
    }

    const now = new Date();

    switch (action) {
      case "CALL_LATER": {
        await prisma.contact.update({
          where: { id },
          data: {
            state: "CALL_LATER",
            callNote: body.note ?? null,
            callLaterAt: body.callLaterAt ? new Date(body.callLaterAt) : now,
            assignedToId: userId ?? null,
            reviveAt: null,
            lastCalledAt: now,
          },
        });
        return NextResponse.json({ ok: true });
      }

      case "BOOKED": {
        await prisma.contact.update({
          where: { id },
          data: { state: "BOOKED", reviveAt: null, lastCalledAt: now },
        });
        return NextResponse.json({ ok: true });
      }

      case "REFUSED": {
        await prisma.contact.update({
          where: { id },
          data: { state: "REFUSED", callNote: body.note ?? null, reviveAt: null, lastCalledAt: now },
        });
        return NextResponse.json({ ok: true });
      }

      case "NO_ANSWER": {
        if (body?.skip) {
          // SKIP não incrementa contagem
          await prisma.contact.update({
            where: { id },
            data: {
              state: "SKIP",
              reviveAt: new Date(Date.now() + THREE_HOURS_MS),
              lastCalledAt: now,
            },
          });
          return NextResponse.json({ ok: true });
        }

        // Não atendeu — incrementa contagem; à 5ª passa a REFUSED
        const c = await prisma.contact.update({
          where: { id },
          data: {
            state: "NO_ANSWER",
            noAnswerCount: { increment: 1 },
            reviveAt: new Date(Date.now() + THREE_HOURS_MS),
            lastCalledAt: now,
          },
        });

        if ((c.noAnswerCount ?? 0) + 0 >= 5) {
          await prisma.contact.update({
            where: { id },
            data: { state: "REFUSED", reviveAt: null },
          });
        }
        return NextResponse.json({ ok: true });
      }
    }

    return NextResponse.json({ ok: false, error: "invalid action" }, { status: 400 });
  } catch (err) {
    console.error("[disposition] error", err);
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
  }
}
