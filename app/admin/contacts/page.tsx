// app/admin/contacts/page.tsx
"use client";
import { useEffect, useState } from "react";

type Contact = {
  id: string; firstName?: string|null; title?: string|null; lastName?: string|null; companyName: string;
  email?: string|null; phoneWork?: string|null; phoneMobile?: string|null; state: string;
  updatedAt: string; callNote?: string|null;
};

export default function AdminContactsPage() {
  const [rows, setRows] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [state, setState] = useState("ALL");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Record<string,boolean>>({});

  const load = async () => {
    const r = await fetch(`/api/admin/contacts?state=${state}&q=${encodeURIComponent(q)}&take=100`);
    const js = await r.json();
    setRows(js.rows); setTotal(js.total); setSel({});
  };
  useEffect(() => { load(); }, [state]);

  const idsSel = Object.entries(sel).filter(([,v])=>v).map(([k])=>k);

  const bulk = async (to: string) => {
    if (!idsSel.length) return;
    await fetch("/api/admin/contacts/bulk", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: idsSel, state: to })
    });
    await load();
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold mb-6">Contactos</h1>

      <div className="flex flex-wrap gap-3 items-center mb-4">
        <select className="border rounded px-2 py-1" value={state} onChange={e=>setState(e.target.value)}>
          {["ALL","NEW","NO_ANSWER","CALL_LATER","BOOKED","REFUSED"].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <input
          value={q} onChange={e=>setQ(e.target.value)}
          placeholder="Procurar…" className="border rounded px-3 py-1"
        />
        <button onClick={load} className="rounded bg-black text-white px-3 py-1">Filtrar</button>

        <div className="ml-auto flex gap-2">
          {["NEW","NO_ANSWER","CALL_LATER","BOOKED","REFUSED"].map(s => (
            <button key={s} onClick={()=>bulk(s)} className="rounded bg-white shadow px-3 py-1 hover:bg-slate-50">
              Mudar p/ {s}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl overflow-hidden bg-white shadow">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2"><input type="checkbox"
                onChange={(e)=>setSel(Object.fromEntries(rows.map(r=>[r.id,e.target.checked])))} /></th>
              <th className="text-left px-3 py-2">Empresa</th>
              <th className="text-left px-3 py-2">Nome</th>
              <th className="px-4 py-2">Título</th>
              <th className="text-left px-3 py-2">Email</th>
              <th className="text-left px-3 py-2">Estado</th>
              <th className="text-left px-3 py-2">Notas</th>
              <th className="text-left px-3 py-2">Última atualização</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">
                  <input type="checkbox" checked={!!sel[r.id]} onChange={(e)=>setSel(s=>({...s,[r.id]:e.target.checked}))}/>
                </td>
                <td className="px-3 py-2">{r.companyName}</td>
                <td className="px-3 py-2">{[r.firstName,r.lastName].filter(Boolean).join(" ")}</td>
                <td className="px-4 py-2">{r.title || "-"}</td>
                <td className="px-3 py-2">{r.email ?? "-"}</td>
                <td className="px-3 py-2">{r.state}</td>
                <td className="px-3 py-2">{r.callNote ?? "-"}</td>
                <td className="px-3 py-2">{new Date(r.updatedAt).toLocaleDateString("pt-PT")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-sm text-slate-600 mt-3">Total: {total}</div>
    </div>
  );
}
