// app/api/admin/contacts/import/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parse } from "csv-parse/sync";

type Row = Record<string, string | undefined>;

const norm = (v: any) => (typeof v === "string" ? v.trim() : v ?? null);

function parseCsvAuto(raw: string) {
  // tenta ; e depois ,
  let rows: any[] = [];
  try {
    rows = parse(raw, {
      columns: true,
      skip_empty_lines: true,
      delimiter: ";",
      bom: true,
      trim: true,
    });
    if (rows.length && Object.keys(rows[0] || {}).length === 1) {
      throw new Error();
    }
  } catch {
    rows = parse(raw, {
      columns: true,
      skip_empty_lines: true,
      delimiter: ",",
      bom: true,
      trim: true,
    });
  }
  return rows as Row[];
}

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const segmentKey = formData.get("segmentKey") as string | null;

  if (!file) {
    return NextResponse.json(
      { ok: false, error: "Sem ficheiro." },
      { status: 400 }
    );
  }
  if (!segmentKey) {
    return NextResponse.json(
      { ok: false, error: "Sem segmento." },
      { status: 400 }
    );
  }

  const raw = Buffer.from(await file.arrayBuffer()).toString("utf8");
  const rows = parseCsvAuto(raw);

  let inserted = 0;
  let skippedDuplicate = 0;
  let invalidNoPhone = 0;

  for (const row of rows) {
    // Novo formato: Place ID, Business Name, Phone, City, Category, Website
    // Ignoramos Place ID completamente
    const phone = norm(row["Phone"]);

    if (!phone) {
      // não vale a pena guardar contactos sem telefone
      invalidNoPhone++;
      continue;
    }

    const companyName =
      norm(row["Business Name"]) ||
      norm(row["Business name"]) ||
      norm(row["Empresa"]) ||
      norm(row["Company Name"]) ||
      "(Sem nome)";

    const city = norm(row["City"]) || norm(row["Cidade"]);
    const category = norm(row["Category"]) || norm(row["Categoria"]);
    const website =
      norm(row["Website"]) ||
      norm(row["Site"]) ||
      norm(row["Facebook url"]);

    // DEDUPE POR TELEFONE:
    // se já existir um contacto com este telefone (em qualquer campo), não inserimos
    const existing = await prisma.contact.findFirst({
      where: {
        OR: [
          { phoneWork: phone },
          { phoneMobile: phone },
          { phoneCorp: phone },
        ],
      },
    });

    if (existing) {
      skippedDuplicate++;
      continue;
    }

    await prisma.contact.create({
      data: {
        companyName,
        phoneWork: phone,
        companyCity: city,
        industry: category,
        website,
        segmentKey: segmentKey as any,
        state: "NEW",
      },
    });

    inserted++;
  }

  return NextResponse.json({
    ok: true,
    // mantemos a forma que o teu /admin/importar/page.tsx espera
    total: rows.length,        // linhas lidas do CSV
    inserted,                  // novos contactos
    updated: 0,                // já não fazemos updates neste fluxo
    skipped: skippedDuplicate, // duplicados por telefone
    invalid: invalidNoPhone,   // sem telefone
  });
}
