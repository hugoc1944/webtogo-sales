// app/admin/importar/page.tsx
"use client";
import { useRef, useState } from "react";

export default function ImportarPage() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [segmentKey, setSegmentKey] = useState("A_CONSTRUCAO_SERVICOS_LAR");
  const [res, setRes] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openPicker = () => inputRef.current?.click();

  const onPick: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setError(null);
    setRes(null);
  };

  const submit: React.FormEventHandler = async (e) => {
    e.preventDefault();
    if (!file) {
      setError("Selecione um ficheiro CSV primeiro.");
      return;
    }
    setBusy(true);
    setError(null);
    setRes(null);

    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("segmentKey", segmentKey); // 👈 MANDAR O SEGMENTO

      const r = await fetch("/api/admin/contacts/import", {
        method: "POST",
        body: fd,
      });

      const js = await r.json();
      setRes(js);

      if (!r.ok) {
        setError(js?.error || "Falha ao importar.");
      }
    } catch (err) {
      console.error(err);
      setError("Erro ao importar. Veja a consola.");
    } finally {
      setBusy(false);
    }
  };

  const summary = res?.summary;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold mb-4 text-[#0e2a4a]">
        Importar contactos (CSV)
      </h1>

      <form
        onSubmit={submit}
        className="rounded-xl bg-white shadow p-5 flex flex-wrap items-center gap-3"
      >
        {/* input escondido */}
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={onPick}
          className="hidden"
        />

        {/* botão para abrir o seletor */}
        <button
          type="button"
          onClick={openPicker}
          className="rounded-md border px-4 py-2 hover:bg-slate-50 active:bg-slate-100 transition focus:outline-none focus:ring-2 focus:ring-[#00b8b8]"
          title="Selecionar ficheiro CSV"
        >
          Selecionar CSV
        </button>

        {/* nome do ficheiro escolhido */}
        <span className="text-sm text-slate-600">
          {file ? file.name : "Nenhum ficheiro selecionado"}
        </span>

        {/* Segmento */}
        <div className="flex flex-col gap-1 ml-auto min-w-[260px]">
          <label className="text-sm font-medium text-slate-700">
            Segmento (A-J)
          </label>
          <select
            value={segmentKey}
            onChange={(e) => setSegmentKey(e.target.value)}
            className="rounded-md border bg-white text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-[#00b8b8]"
          >
            <option value="A_CONSTRUCAO_SERVICOS_LAR">
              A — Construção & serviços lar
            </option>
            <option value="B_RESTAURACAO_CAFES_PASTELARIAS">
              B — Restauração & cafés
            </option>
            <option value="C_CABELEIREIROS_BARBEARIAS_ESTETICA">
              C — Cabeleireiros & estética
            </option>
            <option value="D_OFICINAS_AUTO_PNEUS_SERVICOS_AUTO">
              D — Oficinas & auto
            </option>
            <option value="E_MERCEARIAS_MERCADOS_PADARIAS">
              E — Mercearias & mercados
            </option>
            <option value="F_LOJAS_ROUPA_CALCADO_DECORACAO">
              F — Lojas de roupa & decoração
            </option>
            <option value="G_CLINICAS_SAUDE_WELLNESS">
              G — Clínicas & wellness
            </option>
            <option value="H_ALOJAMENTO_LOCAL_HOTEIS">
              H — Alojamento local & hotéis
            </option>
            <option value="I_ESCOLAS_CURSOS_CENTROS_ESTUDO">
              I — Escolas & centros de estudo
            </option>
            <option value="J_PROFISSIONAIS_LIBERAIS_SERVICOS">
              J — Profissionais liberais
            </option>
          </select>
        </div>

        {/* botão Importar */}
        <button
          type="submit"
          disabled={!file || busy}
          className="ml-auto rounded-md bg-[#0e2a4a] text-white px-4 py-2 disabled:opacity-50 hover:bg-[#0c2340] transition focus:outline-none focus:ring-2 focus:ring-[#00b8b8]"
          title={file ? "Importar" : "Selecione um CSV"}
        >
          {busy ? "A importar…" : "Importar"}
        </button>
      </form>

      {error && (
        <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      {summary && (
        <div className="mt-4 text-sm rounded-xl bg-white shadow p-4 space-y-1">
          <div>
            <strong>Total lido:</strong> {summary.lidas}
          </div>
          <div>
            <strong>Empresas (chaves únicas):</strong> {summary.empresas}
          </div>
          <div>
            <strong>Inseridos:</strong> {summary.inseridos}
          </div>
          <div>
            <strong>Atualizados:</strong> {summary.atualizados}
          </div>
          <div>
            <strong>Ignorados (sem empresa ou lixo):</strong> {summary.ignorados}
          </div>
        </div>
      )}

      <p className="text-sm text-slate-600 mt-3">
        Headers esperados:{" "}
        <em>
          Company Name, First Name, Last Name, Title, Email, Work Direct Phone,
          Mobile Phone, Corporate Phone, Industry, Keywords, Website, City
        </em>
        . O import faz dedup por empresa (Company Name/Empresa) e escolhe a
        melhor linha por título + contacto.
      </p>
    </div>
  );
}
