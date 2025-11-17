import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  const { sessionId, durationSec } = body || {};
  if (!sessionId) return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });

  const ended = await prisma.callSession.update({
    where: { id: sessionId },
    data: { endedAt: new Date(), durationSec: Math.max(0, Number(durationSec || 0)) },
  });
  return NextResponse.json({ ok: true, endedAt: ended.endedAt });
}
