import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id as string;
  const body = await req.json().catch(() => ({}));
  const contactId = body.contactId as string | undefined;
  const amount = typeof body.amount === "number" ? body.amount : undefined;

  if (!contactId) {
    return NextResponse.json({ error: "Missing contactId" }, { status: 400 });
  }

  await prisma.sale.create({
    data: {
      contactId,
      userId,
      amount,
    },
  });

  return NextResponse.json({ ok: true });
}
