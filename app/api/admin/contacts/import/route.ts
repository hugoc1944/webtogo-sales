// app/admin/importar/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parse } from "csv-parse/sync";

type Row = Record<string, string | undefined>;

const norm = (v: any) => (typeof v === "string" ? v.trim() : v ?? null);
const cleanPhone = (v?: string | null) =>
  v ? v.replace(/[^\d+]/g, "").replace(/^00/, "+").trim() : null;

function parseCsvAuto(raw: string) {
  // tenta ; e depois ,
  let rows: any[] = [];
  try {
    rows = parse(raw, { columns: true, skip_empty_lines: true, delimiter: ";", bom: true, trim: true });
    if (rows.length && Object.keys(rows[0] || {}).length === 1) throw new Error();
  } catch {
    rows = parse(raw, { columns: true, skip_empty_lines: true, delimiter: ",", bom: true, trim: true });
  }
  return rows as Row[];
}

// -------- PRIORIDADE DE TÍTULOS (pt/en + variantes) --------
function titleScore(t?: string | null): number {
  const s = (t || "").toLowerCase();

  const tests: Array<[RegExp, number]> = [
    [/\b(owner|propriet[aá]rio|dono)\b/, 100],
    [/\b(co[-\s]?founder|founder|fundador)\b/, 95],
    [/\b(ceo|chief\s+executive|administrador(?:-delegado)?|s[óo]cio-?gerente|gerente\s+geral)\b/, 90],
    [/\b(gerente|manager|director\s*geral|diretor[a]?\s*geral)\b/, 85],
    [/\b(director|diretor[a]?)\s*(comercial|de\s*vendas)|\b(head\s*of\s*sales|sales\s*director)\b/, 80],
    [/\b(director|diretor[a]?)\s*(de\s*produ[cç][aã]o)|\b(plant\s*manager|production\s*director)\b/, 75],
    [/\b(compras|procurement|buyer|sourcing)\b/, 70],
  ];

  for (const [re, score] of tests) if (re.test(s)) return score;
  return 10; // OUTRO
}

// desempate: tel > email > tem title
function tiebreak(a: Row, b: Row) {
  const phonesA = [a["Work Direct Phone"], a["Mobile Phone"], a["Corporate Phone"]].map(x => cleanPhone(norm(x)));
  const phonesB = [b["Work Direct Phone"], b["Mobile Phone"], b["Corporate Phone"]].map(x => cleanPhone(norm(x)));
  const hasPhoneA = phonesA.some(Boolean);
  const hasPhoneB = phonesB.some(Boolean);
  if (hasPhoneA !== hasPhoneB) return hasPhoneA ? -1 : 1;

  const hasEmailA = !!norm(a["Email"]);
  const hasEmailB = !!norm(b["Email"]);
  if (hasEmailA !== hasEmailB) return hasEmailA ? -1 : 1;

  const hasTitleA = !!norm(a["Title"]);
  const hasTitleB = !!norm(b["Title"]);
  if (hasTitleA !== hasTitleB) return hasTitleA ? -1 : 1;

  return 0;
}

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ ok: false, error: "Ficheiro não enviado" }, { status: 400 });

  const raw = await file.text();
  const rows = parseCsvAuto(raw);

  // 1) agrupar por companyName (exact match — pedido por ti)
  const groups = new Map<string, Row[]>();
  for (const r of rows) {
    const company = norm(r["Company name"] || r["Company Name"]);
    if (!company) continue;
    const arr = groups.get(company) ?? [];
    arr.push(r);
    groups.set(company, arr);
  }

  // 2) escolher o “melhor” por empresa
  const winners: Row[] = [];
  for (const [company, arr] of groups.entries()) {
    const ranked = arr
      .map(r => ({ r, score: titleScore(norm(r["Title"])) }))
      .sort((a, b) => (b.score - a.score) || tiebreak(a.r, b.r));
    winners.push(ranked[0].r);
  }

  let inserted = 0, updated = 0, skipped = 0;

  for (const r of winners) {
    const companyName = norm(r["Company name"] || r["Company Name"]);
    if (!companyName) { skipped++; continue; }

    const firstName = norm(r["First name"] || r["First Name"]);
    const lastName  = norm(r["Last name"] || r["Last Name"]);
    const title     = norm(r["Title"]);
    const email     = norm(r["Email"]);
    const phoneW    = cleanPhone(norm(r["Work Direct Phone"]));
    const phoneM    = cleanPhone(norm(r["Mobile Phone"]));
    const phoneC    = cleanPhone(norm(r["Corporate Phone"]));
    const industry  = norm(r["Industry"]);
    const keywords  = norm(r["Keywords"]);
    const website   = norm(r["Website"]);
    const city      = norm(r["City"] || r["Company city"] || r["Company City"]);

    const data = {
      firstName, lastName, title, email,
      phoneWork: phoneW, phoneMobile: phoneM, phoneCorp: phoneC,
      industry, keywords, website, companyCity: city,
    };

    // 3) upsert “manual” por companyName (1 por empresa)
    const exists = await prisma.contact.findFirst({ where: { companyName } });
    if (!exists) {
      await prisma.contact.create({ data: { companyName, ...data } });
      inserted++;
    } else {
      await prisma.contact.update({
        where: { id: exists.id },
        data, // atualiza dados “rico” mantendo o state atual do contacto
      });
      updated++;
    }
  }

  return NextResponse.json({
    ok: true,
    summary: {
      lidas: rows.length,
      empresas: groups.size,
      inseridos: inserted,
      atualizados: updated,
      ignorados: skipped,
    }
  });
}
