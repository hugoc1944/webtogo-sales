"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AddNoteButton({ contactId }: { contactId: string }) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const submit = async () => {
    if (!content.trim()) {
      alert("Escreve uma nota antes de confirmar.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/contacts/${contactId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err?.error || "Erro ao gravar nota");
        return;
      }
      setOpen(false);
      setContent("");
      router.refresh(); // reload server data
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        className="rounded-md border px-3 py-1 text-sm hover:bg-slate-50"
        onClick={() => setOpen(true)}
        title="Adicionar nota"
      >
        ✎
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(560px,94vw)] rounded-xl bg-white p-6">
            <h3 className="text-lg font-semibold">Adicionar nota</h3>
            <textarea
              className="mt-3 w-full min-h-[140px] rounded-md border p-3"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            <div className="mt-4 flex gap-2 justify-end">
              <button className="px-4 py-2" onClick={() => setOpen(false)} disabled={loading}>Cancelar</button>
              <button className="px-4 py-2 bg-emerald-600 text-white rounded" onClick={submit} disabled={loading}>
                {loading ? "A gravar..." : "Gravar nota"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
