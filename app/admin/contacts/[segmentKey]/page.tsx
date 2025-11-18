// app/admin/contacts/[segmentKey]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import NoteViewer from "../../../associate/pendentes/NoteViewer"; // ajusta o caminho conforme a pasta onde puseste o componente

type Contact = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  title?: string | null;
  companyName: string;
  email?: string | null;
  phoneWork?: string | null;
  phoneMobile?: string | null;
  companyCity?: string | null;
  segmentKey?: string | null;
  state: string;
  updatedAt: string;
  callNote?: string | null;
};

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

const SEGMENT_META: Record<
  SegmentKey,
  { code: string; label: string }
> = {
  A_CONSTRUCAO_SERVICOS_LAR: {
    code: "A",
    label: "Construção & serviços lar",
  },
  B_RESTAURACAO_CAFES_PASTELARIAS: {
    code: "B",
    label: "Restauração, cafés & pastelarias",
  },
  C_CABELEIREIROS_BARBEARIAS_ESTETICA: {
    code: "C",
    label: "Cabeleireiros, barbearias & estética",
  },
  D_OFICINAS_AUTO_PNEUS_SERVICOS_AUTO: {
    code: "D",
    label: "Oficinas & serviços auto",
  },
  E_MERCEARIAS_MERCADOS_PADARIAS: {
    code: "E",
    label: "Mercearias & mercados",
  },
  F_LOJAS_ROUPA_CALCADO_DECORACAO: {
    code: "F",
    label: "Lojas de roupa & decoração",
  },
  G_CLINICAS_SAUDE_WELLNESS: {
    code: "G",
    label: "Clínicas, saúde & wellness",
  },
  H_ALOJAMENTO_LOCAL_HOTEIS: {
    code: "H",
    label: "Alojamento local & hotéis",
  },
  I_ESCOLAS_CURSOS_CENTROS_ESTUDO: {
    code: "I",
    label: "Escolas & centros de estudo",
  },
  J_PROFISSIONAIS_LIBERAIS_SERVICOS: {
    code: "J",
    label: "Profissionais liberais & serviços",
  },
};

const STATES = ["ALL", "NEW", "NO_ANSWER", "CALL_LATER", "BOOKED", "REFUSED", "SKIP"] as const;

export default function SegmentContactsPage() {
  const params = useParams<{ segmentKey: string }>();
  const segmentKey = params.segmentKey as SegmentKey;

  const meta = SEGMENT_META[segmentKey];

  const [rows, setRows] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [state, setState] = useState<string>("ALL");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Record<string, boolean>>({});
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const [loading, setLoading] = useState(false);

  const totalPages = useMemo(
    () => (total ? Math.max(1, Math.ceil(total / pageSize)) : 1),
    [total, pageSize]
  );

  const load = async () => {
    if (!segmentKey) return;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("segmentKey", segmentKey);
      params.set("page", String(page));
      params.set("take", String(pageSize));
      if (state !== "ALL") params.set("state", state);
      if (q.trim()) params.set("q", q.trim());

      const res = await fetch(`/api/admin/contacts?${params.toString()}`);
      const js = await res.json();
      setRows(js.rows ?? []);
      setTotal(js.total ?? 0);
      setSel({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segmentKey, state, page]);

  const idsSel = Object.entries(sel)
    .filter(([, v]) => v)
    .map(([id]) => id);

  const bulk = async (to: string) => {
    if (!idsSel.length) return;
    await fetch("/api/admin/contacts/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: idsSel, state: to }),
    });
    await load();
  };

  const toggleAll = (checked: boolean) => {
    setSel(Object.fromEntries(rows.map((r) => [r.id, checked])));
  };

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-2">
        <Link
          href="/admin/contacts"
          className="text-xs text-slate-500 hover:text-slate-700 underline underline-offset-2"
        >
          ← Voltar ao resumo
        </Link>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#0e2a4a] text-white text-xs font-semibold">
          {meta?.code ?? "?"}
        </span>
        <h1 className="text-xl font-semibold text-[#0e2a4a]">
          Segmento {meta?.code}: {meta?.label}
        </h1>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center mb-4">
        <select
          className="border rounded px-2 py-1 text-sm"
          value={state}
          onChange={(e) => {
            setState(e.target.value);
            setPage(1);
          }}
        >
          {STATES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Procurar por empresa, nome ou email…"
          className="border rounded px-3 py-1 min-w-[220px] text-sm"
        />
        <button
          onClick={() => {
            setPage(1);
            load();
          }}
          className="rounded bg-black text-white px-3 py-1 text-sm hover:bg-black/80 transition"
        >
          Filtrar
        </button>

        {/* Botões de bulk à direita */}
        <div className="ml-auto flex flex-wrap gap-2">
          {["NEW", "NO_ANSWER", "CALL_LATER", "BOOKED", "REFUSED", "SKIP"].map((s) => (
            <button
              key={s}
              onClick={() => bulk(s)}
              className="rounded bg-white shadow px-3 py-1 hover:bg-slate-50 text-xs"
            >
              Mudar p/ {s}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela */}
      <div className="rounded-xl overflow-hidden bg-white shadow">
        <table className="w-full text-xs md:text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2">
                <input
                  type="checkbox"
                  onChange={(e) => toggleAll(e.target.checked)}
                  checked={rows.length > 0 && rows.every((r) => sel[r.id])}
                />
              </th>
              <th className="text-left px-3 py-2">Empresa</th>
              <th className="text-left px-3 py-2">Nome</th>
              <th className="px-3 py-2">Título</th>
              <th className="text-left px-3 py-2">Email</th>
              <th className="text-left px-3 py-2">Telefone</th>
              <th className="text-left px-3 py-2">Cidade</th>
              <th className="text-left px-3 py-2">Estado</th>
              <th className="text-left px-3 py-2">Notas</th>
              <th className="text-left px-3 py-2">Última atualização</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const nome = [r.firstName, r.lastName].filter(Boolean).join(" ");
              const phone = r.phoneWork || r.phoneMobile || "-";
              return (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={!!sel[r.id]}
                      onChange={(e) =>
                        setSel((prev) => ({ ...prev, [r.id]: e.target.checked }))
                      }
                    />
                  </td>
                  <td className="px-3 py-2">{r.companyName}</td>
                  <td className="px-3 py-2">{nome || "-"}</td>
                  <td className="px-3 py-2">{r.title || "-"}</td>
                  <td className="px-3 py-2">{r.email ?? "-"}</td>
                  <td className="px-3 py-2">{phone}</td>
                  <td className="px-3 py-2">{r.companyCity ?? "-"}</td>
                  <td className="px-3 py-2">{r.state}</td>
                  <td className="px-3 py-2">
                    <NoteViewer note={r.callNote} />
                  </td>
                  <td className="px-3 py-2">
                    {r.updatedAt
                      ? new Date(r.updatedAt).toLocaleString("pt-PT")
                      : "-"}
                  </td>
                </tr>
              );
            })}
            {!rows.length && (
              <tr>
                <td colSpan={10} className="px-4 py-6 text-center text-slate-500 text-sm">
                  Sem contactos neste filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
        <div>
          Total: {total} contactos &nbsp;|&nbsp; Página {page} de {totalPages}
        </div>
        <div className="flex items-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-2 py-1 rounded border text-xs disabled:opacity-40 hover:bg-slate-50"
          >
            Anterior
          </button>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="px-2 py-1 rounded border text-xs disabled:opacity-40 hover:bg-slate-50"
          >
            Seguinte
          </button>
        </div>
      </div>

      {loading && (
        <div className="mt-2 text-xs text-slate-500">
          A carregar contactos…
        </div>
      )}
    </div>
  );
}
