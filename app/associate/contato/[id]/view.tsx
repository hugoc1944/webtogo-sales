"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useRef, useState } from "react";

export default function ClientContact({ contact, userId }: { contact: any; userId: string }) {
  const router = useRouter();

  const phone =
    contact.phoneWork || contact.phoneMobile || contact.phoneCorp || "";
  const keywords = (contact.keywords || "")
    .split(",")
    .map((s: string) => s.trim())
    .filter(Boolean)
    .slice(0, 2);

  // cronómetro por contacto
  const start = useRef(Date.now() / 1000);
  const doDisposition = async (
    action: "NO_ANSWER" | "CALL_LATER" | "BOOKED" | "REFUSED",
    extra?: any
  ) => {
    const durationSec = Math.round(Date.now() / 1000 - start.current);
    const res = await fetch(`/api/contacts/${contact.id}/disposition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra, durationSec, userId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("Disposition failed", err);
      alert("Não foi possível gravar o estado.");
      return;
    }
    router.push("/associate/pendentes");
  };

  return (
    <div className="relative min-h-screen"> {/* altura total da viewport */}
      {/* BG */}
      <Image src="/blueBG.png" alt="" fill className="object-cover" priority />
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a2a6b]/80 via-[#0a2a6b]/70 to-[#04265a]/90" />

      {/* Top bar */}
      <div className="absolute top-3 left-4 z-20 text-white/90">
        <Link
          href="/associate/pendentes"
          prefetch={false}
          className="underline underline-offset-4 hover:opacity-90 transition"
        >
          Voltar
        </Link>
      </div>

      {/* Conteúdo centrado vertical/horizontal */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
        <div className="text-white text-center max-w-3xl">
          <h2 className="text-3xl font-extrabold tracking-wide">
            {contact.companyName}
          </h2>

          <p className="mt-4 text-lg">
            {[contact.firstName, contact.lastName].filter(Boolean).join(" ")}
            {contact.firstName || contact.lastName ? " - " : ""}
            <span className="opacity-90">{contact.title || ""}</span>
          </p>
          <p className="opacity-90">{contact.email ?? ""}</p>

          <p className="mt-2 opacity-90">Indústria: {contact.industry ?? "-"}</p>
          <p className="opacity-90">Keywords: {keywords.join(", ") || "-"}</p>

          <div className="mt-6 flex items-center justify-center gap-4">
            {phone ? (
              <a
                href={`tel:${phone.replace(/\s/g, "")}`}
                className="rounded-md bg-black/70 px-5 py-3 hover:bg-black/80 transition"
              >
                {phone}
              </a>
            ) : (
              <span className="rounded-md bg-black/40 px-5 py-3">Sem telefone</span>
            )}
            {contact.website ? (
              <a
                href={contact.website}
                target="_blank"
                className="rounded-md bg-black/70 px-5 py-3 hover:bg-black/80 transition"
              >
                Website
              </a>
            ) : (
              <span className="rounded-md bg-black/40 px-5 py-3">Sem website</span>
            )}
          </div>

          <div className="mt-6 flex items-center justify-center gap-4">
            <ScheduleModal
              onConfirmBooked={() => doDisposition("BOOKED")}
              calendlyUrl={process.env.NEXT_PUBLIC_CALENDLY_URL || "https://calendly.com/"}
            />

            <PendingMini
              onNoAnswer={() => doDisposition("NO_ANSWER")}
              onCallLater={(note) => doDisposition("CALL_LATER", { note })}
            />
          </div>

          <div className="mt-6">
            <button
              className="text-red-300 underline underline-offset-4 hover:opacity-80 transition"
              onClick={() => doDisposition("REFUSED")}
            >
              Recusado
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PendingMini({
  onNoAnswer,
  onCallLater,
}: {
  onNoAnswer: () => void;
  onCallLater: (note: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");

  return (
    <>
      <button
        className="rounded-md bg-black/70 px-6 py-3 hover:bg-black/80 transition"
        onClick={() => {
          setNote(""); // limpa ao abrir
          setOpen(true);
        }}
      >
        Pending
      </button>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-xl p-6 w-[min(520px,94vw)]">
            <h3 className="text-xl font-bold text-center">Pending</h3>
            <label className="block mt-4 text-sm font-medium">
              Notas (apenas para ligar mais tarde)
            </label>
            <textarea
              className="mt-2 w-full min-h-[140px] rounded-md border p-3 outline-none focus:ring-2 focus:ring-[#00b8b8]"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <div className="mt-4 flex gap-3 justify-center">
              <button
                className="rounded-md bg-[#0e2a4a] text-white px-5 py-2"
                onClick={() => {
                  setOpen(false);
                  setNote("");
                  onNoAnswer();
                }}
              >
                Não Atendeu
              </button>
              <button
                className="rounded-md bg-[#0e2a4a] text-white px-5 py-2"
                onClick={() => {
                  const v = note.trim();
                  setOpen(false);
                  setNote("");
                  onCallLater(v);
                }}
              >
                Ligar mais tarde
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
function ScheduleModal({
  onConfirmBooked,
  calendlyUrl,
}: {
  onConfirmBooked: () => void;
  calendlyUrl: string;
}) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <button
        className="rounded-md bg-black/70 px-6 py-3 hover:bg-black/80 transition"
        onClick={() => setOpen(true)}
      >
        Agendar
      </button>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => !confirming && setOpen(false)}
          />
          <div className="relative bg-white rounded-xl p-6 w-[min(420px,94vw)] text-slate-900 shadow-xl">
            <h3 className="text-lg font-semibold text-center">
              Agendar reunião
            </h3>
            <p className="mt-3 text-sm text-center text-slate-600">
              1) Clica em <strong>Book</strong> para abrir o Calendly e marcar. <br />
              2) Depois de marcares, clica em <strong>Confirmar</strong> para
              registar este contacto como <em>BOOKED</em>.
            </p>

            <div className="mt-5 flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href={calendlyUrl}
                target="_blank"
                className="flex-1 rounded-md bg-[#0e2a4a] text-white px-4 py-2 text-center hover:bg-[#123667] transition"
              >
                Book
              </a>

              <button
                className="flex-1 rounded-md bg-emerald-600 text-white px-4 py-2 hover:bg-emerald-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
                onClick={async () => {
                  try {
                    setConfirming(true);
                    await onConfirmBooked();
                    setOpen(false);
                  } finally {
                    setConfirming(false);
                  }
                }}
              >
                Confirmar
              </button>
            </div>

            <button
              className="mt-4 mx-auto block text-xs text-slate-500 hover:text-slate-700 underline underline-offset-2"
              onClick={() => !confirming && setOpen(false)}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </>
  );
}