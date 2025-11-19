// app/api/sessions/start/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { ok: false, error: "Não autenticado." },
      { status: 401 }
    );
  }

  const user = session.user as any;
  const userId = user.id as string;

  let segmentKey: string | null = null;
  try {
    const body = await req.json();
    if (body && typeof body.segmentKey === "string") {
      segmentKey = body.segmentKey;
    }
  } catch {
    // se não vier body, também é ok
  }

  const callSession = await prisma.callSession.create({
    data: {
      userId,
      // se no futuro quiseres guardar o segmento na sessão:
      // segmentKey: segmentKey as any,
    }
  });

  return NextResponse.json({
    ok: true,
    sessionId: callSession.id,
    segmentKey
  });
}
