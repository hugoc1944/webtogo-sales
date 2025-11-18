// app/api/admin/contacts/summary/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const grouped = await prisma.contact.groupBy({
    by: ["segmentKey", "state"],
    _count: { _all: true },
  });

  type SegmentSummary = {
    total: number;
    NEW: number;
    NO_ANSWER: number;
    CALL_LATER: number;
    BOOKED: number;
    REFUSED: number;
    SKIP: number;
  };

  const summary: Record<string, SegmentSummary> = {};

  for (const row of grouped) {
    const seg = row.segmentKey || "UNSEGMENTED";
    if (!summary[seg]) {
      summary[seg] = {
        total: 0,
        NEW: 0,
        NO_ANSWER: 0,
        CALL_LATER: 0,
        BOOKED: 0,
        REFUSED: 0,
        SKIP: 0,
      };
    }
    summary[seg].total += row._count._all;
    // @ts-ignore – row.state é LeadState, mas tratamos como string
    summary[seg][row.state] += row._count._all;
  }

  return NextResponse.json({ summary });
}
