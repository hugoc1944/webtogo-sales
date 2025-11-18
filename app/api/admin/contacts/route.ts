// app/api/admin/contacts/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const state = searchParams.get("state") || "ALL";
  const segmentKey = searchParams.get("segmentKey") || "ALL";
  const q = (searchParams.get("q") || "").trim();
  const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
  const take = Math.max(parseInt(searchParams.get("take") || "50", 10), 1);
  const skip = (page - 1) * take;

  const where: any = {};

  if (state !== "ALL") {
    where.state = state; // LeadState enum values: NEW, NO_ANSWER, CALL_LATER, BOOKED, REFUSED, SKIP
  }

  if (segmentKey !== "ALL") {
    // segmentKey is stored as the enum/string you used on import, e.g. "B_RESTAURACAO_CAFES_PASTELARIAS"
    where.segmentKey = segmentKey as any;
  }

  if (q) {
    where.OR = [
      { companyName: { contains: q, mode: "insensitive" } },
      { firstName: { contains: q, mode: "insensitive" } },
      { lastName: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      orderBy: { updatedAt: "desc" }, // 👈 sempre do mais recente p/ mais antigo
      skip,
      take,
    }),
    prisma.contact.count({ where }),
  ]);

  return NextResponse.json({
    rows,
    total,
    page,
    pageSize: take,
  });
}
