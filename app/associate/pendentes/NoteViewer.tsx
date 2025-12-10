"use client";
import { useState } from "react";

export default function NoteViewer({ note }: { note?: string | null }) {
  const [open, setOpen] = useState(false);
  const safe = note?.trim() ?? "";

  if (!safe) return <span className="text-slate-400">-</span>;
  const preview = safe.length > 30 ? safe.slice(0, 30) + "…" : safe;

  return (
    <>
      <div className="flex items-center gap-2">
        <span
          className="max-w-[160px] truncate inline-block align-middle"
          title="Clique no olho para ver a nota completa"
        >
          {preview}
        </span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center justify-center rounded-md border px-2 py-1 text-xs hover:bg-slate-50"
          aria-label="Ver nota completa"
          title="Ver nota"
        >
          {/* Ícone “olho” minimal */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" stroke="currentColor" strokeWidth="2"/>
            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
          </svg>
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="absolute left-1/2 top-1/2 w-[min(680px,94vw)] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Nota completa</h3>
              <button
                onClick={() => setOpen(false)}
                className="rounded-md border px-2 py-1 text-sm hover:bg-slate-50"
                aria-label="Fechar"
              >
                Fechar
              </button>
            </div>
            <div className="whitespace-pre-wrap text-slate-800">
              {safe}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
