// app/admin/comerciais/SaleButton.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SaleButton({
  contactId,
  userId,
  initialAmount,
}: {
  contactId: string;
  userId: string;
  initialAmount?: number | null;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(
    initialAmount != null ? String(initialAmount) : ""
  );
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const hasSale = initialAmount != null;

  const save = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId,
          userId,
          amount: amount.trim() === "" ? null : amount,
        }),
      });

      if (!res.ok) {
        const js = await res.json().catch(() => null);
        alert(js?.error || "Erro ao registar venda.");
        return;
      }

      setOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          hasSale
            ? "inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition"
            : "inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
        }
      >
        {hasSale ? "Editar venda" : "Registar venda"}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-lg p-5 w-[min(420px,92vw)]">
            <h3 className="text-base font-semibold text-slate-900 mb-1">
              {hasSale ? "Editar venda" : "Registar venda"}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Liga esta venda ao booking deste contacto. O valor é opcional e
              pode ser atualizado mais tarde.
            </p>

            <label className="block text-sm font-medium text-slate-700 mb-1">
              Valor da venda (opcional, €)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500"
              placeholder="Ex.: 500"
            />

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => !loading && setOpen(false)}
                className="px-3 py-1.5 text-xs rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={save}
                disabled={loading}
                className="px-3 py-1.5 text-xs rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {loading ? "A guardar..." : "Guardar venda"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
