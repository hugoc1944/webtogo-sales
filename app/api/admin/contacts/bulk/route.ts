// app/api/admin/contacts/bulk/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const body = await req.json();
  const ids: string[] = body?.ids ?? [];
  const state = body?.state as "NEW"|"NO_ANSWER"|"CALL_LATER"|"BOOKED"|"REFUSED";
  if (!ids.length || !state) return NextResponse.json({ error: "Faltam dados" }, { status: 400 });

  await prisma.contact.updateMany({
    where: { id: { in: ids } },
    data: {
      state,
      callLaterAt: state === "CALL_LATER" ? new Date() : null,
      noAnswerAt: state === "NO_ANSWER" ? new Date() : null,
    },
  });
  return NextResponse.json({ ok: true, count: ids.length });
}
