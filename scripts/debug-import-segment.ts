// scripts/debug-import-segment.ts
import { readFileSync } from "fs";
import { parse } from "csv-parse/sync";
import path from "path";

type Row = Record<string, string | undefined>;

const norm = (v: any) => (typeof v === "string" ? v.trim() : v ?? null);

function parseCsvAuto(raw: string) {
  let rows: any[] = [];
  try {
    rows = parse(raw, {
      columns: true,
      skip_empty_lines: true,
      delimiter: ";",
      bom: true,
      trim: true,
    });
    if (rows.length && Object.keys(rows[0] || {}).length === 1) throw new Error();
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

function main() {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error("Uso: npx ts-node scripts/debug-import-segment.ts <ficheiro.csv>");
    process.exit(1);
  }

  const raw = readFileSync(csvPath, "utf8");
  const rawLines = raw.split(/\r?\n/).length;
  const rows = parseCsvAuto(raw);

  let withoutCompany = 0;
  const byCompany = new Map<string, number>();

  rows.forEach((row, i) => {
    const companyName =
      norm(row["Business Name"]) ||
      norm(row["Business name"]) ||
      norm(row["Company Name"]) ||
      norm(row["company name"]) ||
      norm(row["Empresa"]);

    if (!companyName) {
      withoutCompany++;
      return;
    }

    const key = companyName.toLowerCase();
    byCompany.set(key, (byCompany.get(key) ?? 0) + 1);
  });

  const multi = [...byCompany.entries()].filter(([, count]) => count > 1);

  console.log("Linhas brutas do ficheiro (inclui vazias):", rawLines);
  console.log("Linhas lidas pelo parser (rows.length):   ", rows.length);
  console.log("Linhas com companyName vazio:             ", withoutCompany);
  console.log("Empresas únicas (groups.size):            ", byCompany.size);
  console.log("Empresas com mais de 1 linha:             ", multi.length);

  if (multi.length) {
    console.log("\nExemplos de empresas com várias linhas:");
    multi.slice(0, 20).forEach(([name, count]) => {
      console.log(`- ${name} -> ${count} linhas`);
    });
  }
}

main();
