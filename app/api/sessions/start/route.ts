import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const created = await prisma.callSession.create({
    data: { userId: (session.user as any).id! },
  });
  return NextResponse.json({ sessionId: created.id, startedAt: created.startedAt });
}
