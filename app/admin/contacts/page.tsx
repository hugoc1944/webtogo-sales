// app/admin/contacts/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type SegmentKey =
  | "A_CONSTRUCAO_SERVICOS_LAR"
  | "B_RESTAURACAO_CAFES_PASTELARIAS"
  | "C_CABELEIREIROS_BARBEARIAS_ESTETICA"
  | "D_OFICINAS_AUTO_PNEUS_SERVICOS_AUTO"
  | "E_MERCEARIAS_MERCADOS_PADARIAS"
  | "F_LOJAS_ROUPA_CALCADO_DECORACAO"
  | "G_CLINICAS_SAUDE_WELLNESS"
  | "H_ALOJAMENTO_LOCAL_HOTEIS"
  | "I_ESCOLAS_CURSOS_CENTROS_ESTUDO"
  | "J_PROFISSIONAIS_LIBERAIS_SERVICOS";

type SegmentSummary = {
  total: number;
  NEW: number;
  NO_ANSWER: number;
  CALL_LATER: number;
  BOOKED: number;
  REFUSED: number;
  SKIP: number;
};

const SEGMENTS: { key: SegmentKey; code: string; label: string; description: string }[] = [
  {
    key: "A_CONSTRUCAO_SERVICOS_LAR",
    code: "A",
    label: "Construção & serviços lar",
    description: "Caixilharia, estores, resguardos, obras em casa…",
  },
  {
    key: "B_RESTAURACAO_CAFES_PASTELARIAS",
    code: "B",
    label: "Restauração, cafés & pastelarias",
    description: "Restaurantes, snack-bares, cafés, pastelarias…",
  },
  {
    key: "C_CABELEIREIROS_BARBEARIAS_ESTETICA",
    code: "C",
    label: "Cabeleireiros, barbearias & estética",
    description: "Salões de beleza, barbearias, estética…",
  },
  {
    key: "D_OFICINAS_AUTO_PNEUS_SERVICOS_AUTO",
    code: "D",
    label: "Oficinas & serviços auto",
    description: "Oficinas, pneus, lavagem auto…",
  },
  {
    key: "E_MERCEARIAS_MERCADOS_PADARIAS",
    code: "E",
    label: "Mercearias & mercados",
    description: "Mercearias, minimercados, padarias…",
  },
  {
    key: "F_LOJAS_ROUPA_CALCADO_DECORACAO",
    code: "F",
    label: "Lojas de roupa & decoração",
    description: "Moda, calçado, decoração, mobiliário…",
  },
  {
    key: "G_CLINICAS_SAUDE_WELLNESS",
    code: "G",
    label: "Clínicas, saúde & wellness",
    description: "Clínicas, fisioterapia, spas, wellness…",
  },
  {
    key: "H_ALOJAMENTO_LOCAL_HOTEIS",
    code: "H",
    label: "Alojamento local & hotéis",
    description: "AL, hostels, hotéis, turismo rural…",
  },
  {
    key: "I_ESCOLAS_CURSOS_CENTROS_ESTUDO",
    code: "I",
    label: "Escolas & centros de estudo",
    description: "Escolas, formação, explicações, academias…",
  },
  {
    key: "J_PROFISSIONAIS_LIBERAIS_SERVICOS",
    code: "J",
    label: "Profissionais liberais & serviços",
    description: "Consultores, serviços especializados…",
  },
];

export default function AdminContactsDashboard() {
  const [summary, setSummary] = useState<Record<string, SegmentSummary>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/contacts/summary");
        const js = await res.json();
        setSummary(js.summary || {});
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold mb-2 text-[#0e2a4a]">Contactos por segmento</h1>
      <p className="text-sm text-slate-600 mb-6">
        Visão global dos segmentos A-J. Cada caixa mostra o número de contactos por estado. Clica em{" "}
        <strong>Expandir</strong> para ver a lista completa desse segmento, filtrada e ordenada pelos contactos mais
        recentemente actualizados.
      </p>

      {loading && <div className="mb-4 text-sm text-slate-500">A carregar resumo…</div>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {SEGMENTS.map((seg) => {
          const data = summary[seg.key] || {
            total: 0,
            NEW: 0,
            NO_ANSWER: 0,
            CALL_LATER: 0,
            BOOKED: 0,
            REFUSED: 0,
            SKIP: 0,
          };

          return (
            <div
              key={seg.key}
              className="rounded-2xl bg-white shadow-sm border border-slate-100 p-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#0e2a4a] text-white text-xs font-semibold">
                    {seg.code}
                  </span>
                  <h2 className="text-sm font-semibold text-[#0e2a4a]">{seg.label}</h2>
                </div>
                <p className="text-xs text-slate-500 mb-3">{seg.description}</p>

                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="font-medium text-slate-600">Total</span>
                    <span className="font-semibold">{data.total}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2">
                    <StateRow label="NEW" value={data.NEW} color="text-emerald-600" />
                    <StateRow label="CALL_LATER" value={data.CALL_LATER} color="text-amber-600" />
                    <StateRow label="BOOKED" value={data.BOOKED} color="text-sky-600" />
                    <StateRow label="NO_ANSWER" value={data.NO_ANSWER} color="text-slate-600" />
                    <StateRow label="REFUSED" value={data.REFUSED} color="text-red-600" />
                    <StateRow label="SKIP" value={data.SKIP} color="text-slate-500" />
                  </div>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <Link
                  href={`/admin/contacts/${seg.key}`}
                  className="inline-flex items-center justify-center rounded-md border border-[#0e2a4a]/30 px-3 py-1.5 text-xs font-medium text-[#0e2a4a] hover:bg-[#0e2a4a]/5 transition"
                >
                  Expandir
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StateRow({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="flex justify-between">
      <span className={`uppercase tracking-wide ${color || "text-slate-600"}`}>{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
