// app/admin/importar/page.tsx
"use client";
import { useRef, useState } from "react";

export default function ImportarPage() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
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
    try {
      const fd = new FormData();
      fd.set("file", file);
      const r = await fetch("/api/admin/contacts/import", { method: "POST", body: fd });
      const js = await r.json();
      setRes(js);
      if (!r.ok) setError(js?.error || "Falha ao importar.");
    } catch (err: any) {
      setError("Erro ao importar. Veja a consola.");
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold mb-4 text-[#0e2a4a]">Importar contactos (CSV)</h1>

      <form onSubmit={submit} className="rounded-xl bg-white shadow p-5 flex flex-wrap items-center gap-3">
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

      {res && (
        <div className="mt-4 text-sm rounded-xl bg-white shadow p-4 space-y-1">
          <div><strong>Total lido:</strong> {res.total}</div>
          <div><strong>Inseridos:</strong> {res.inserted}</div>
          <div><strong>Atualizados:</strong> {res.updated}</div>
          <div><strong>Ignorados (duplicados):</strong> {res.skipped}</div>
          <div><strong>Inválidos (sem email/telefone):</strong> {res.invalid}</div>
          {Array.isArray(res.invalidRows) && res.invalidRows.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer">Ver linhas inválidas</summary>
              <pre className="mt-2 whitespace-pre-wrap">{JSON.stringify(res.invalidRows.slice(0,50), null, 2)}</pre>
            </details>
          )}
        </div>
      )}

      <p className="text-sm text-slate-600 mt-3">
        Headers esperados: <em>Company Name, First Name, Last Name, Title, Email, Work Direct Phone, Mobile Phone,
        Corporate Phone, Industry, Keywords, Website, City</em>. O import faz dedup por email OU telefone.
      </p>
    </div>
  );
}
