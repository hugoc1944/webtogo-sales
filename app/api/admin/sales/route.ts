// app/api/admin/sales/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  const session: any = await getServerSession(authOptions);
  const userSession = session?.user as any;

  if (!session || userSession.role !== "ADMIN") {
    return NextResponse.json(
      { ok: false, error: "Não autorizado." },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => null);

  if (!body) {
    return NextResponse.json(
      { ok: false, error: "Body inválido." },
      { status: 400 }
    );
  }

  const { contactId, userId, amount } = body as {
    contactId?: string;
    userId?: string;
    amount?: number | string | null;
  };

  if (!contactId || !userId) {
    return NextResponse.json(
      { ok: false, error: "Falta contactId ou userId." },
      { status: 400 }
    );
  }

  const contact = await prisma.contact.findUnique({ where: { id: contactId } });

  if (!contact) {
    return NextResponse.json(
      { ok: false, error: "Contacto não encontrado." },
      { status: 404 }
    );
  }

  // Opcional: garantir que é um booking
  if (contact.state !== "BOOKED") {
    return NextResponse.json(
      { ok: false, error: "Só é possível associar vendas a contactos BOOKED." },
      { status: 400 }
    );
  }

  let amountNumber: number | null = null;
  if (amount !== undefined && amount !== null && amount !== "") {
    const normalized =
      typeof amount === "string" ? amount.replace(",", ".") : String(amount);
    const parsed = Number(normalized);
    if (Number.isNaN(parsed)) {
      return NextResponse.json(
        { ok: false, error: "Valor de venda inválido." },
        { status: 400 }
      );
    }
    amountNumber = parsed;
  }

  // Um registo de Sale por contacto (se existir, atualiza)
  const existing = await prisma.sale.findFirst({
    where: { contactId },
  });

  let sale;
  if (existing) {
    sale = await prisma.sale.update({
      where: { id: existing.id },
      data: {
        userId,
        amount: amountNumber,
      },
    });
  } else {
    sale = await prisma.sale.create({
      data: {
        contactId,
        userId,
        amount: amountNumber,
      },
    });
  }

  return NextResponse.json({ ok: true, sale });
}
