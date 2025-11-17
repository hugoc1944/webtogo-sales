// app/api/admin/contacts/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const state = searchParams.get("state") as any | null;
  const q = searchParams.get("q")?.trim() || "";
  const take = Number(searchParams.get("take") ?? 50);
  const skip = Number(searchParams.get("skip") ?? 0);

  const where: any = {};
  if (state && state !== "ALL") where.state = state;
  if (q) {
    where.OR = [
      { companyName: { contains: q, mode: "insensitive" } },
      { firstName: { contains: q, mode: "insensitive" } },
      { lastName: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phoneWork: { contains: q } },
      { phoneMobile: { contains: q } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.contact.findMany({ where, orderBy: { updatedAt: "desc" }, take, skip }),
    prisma.contact.count({ where }),
  ]);

  return NextResponse.json({ rows, total });
}
