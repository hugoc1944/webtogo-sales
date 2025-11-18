"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useRef, useState } from "react";

type Contact = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  title?: string | null;
  companyName: string;
  email?: string | null;
  industry?: string | null;
  keywords?: string | null;
  phoneWork?: string | null;
  phoneMobile?: string | null;
  phoneCorp?: string | null;
  website?: string | null;
  companyCity?: string | null;
  segmentKey?: string | null;
};

export default function ClientContact({
  contact,
  userId,
}: {
  contact: Contact;
  userId: string;
}) {
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
    extra?: any,
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
    <div className="relative min-h-screen">
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
        <div className="text-white text-center max-w-3xl space-y-4">
          <h2 className="text-3xl font-extrabold tracking-wide">
            {contact.companyName}
          </h2>

          {/* Pessoa + título + email */}
          <div className="space-y-1">
            <p className="mt-4 text-lg">
              {[contact.firstName, contact.lastName]
                .filter(Boolean)
                .join(" ")}
              {contact.firstName || contact.lastName ? " – " : ""}
              <span className="opacity-90">{contact.title || ""}</span>
            </p>
            {contact.email && (
              <p className="opacity-90 text-sm">{contact.email}</p>
            )}
          </div>

          {/* Cidade + categoria */}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 justify-center text-sm opacity-90">
            <span>
              <span className="font-medium">Cidade:</span>{" "}
              {contact.companyCity || "-"}
            </span>
            <span>
              <span className="font-medium">Categoria:</span>{" "}
              {contact.industry || "-"}
            </span>
          </div>

          {/* Keywords */}
          <p className="opacity-90 text-sm">
            Keywords: {keywords.join(", ") || "-"}
          </p>

          {/* Contacto primário + social + pesquisa */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {phone ? (
              <a
                href={`tel:${phone.replace(/\s/g, "")}`}
                className="rounded-md bg-black/70 px-5 py-3 inline-flex items-center gap-2 hover:bg-black/80 transition"
              >
                {/* ícone telefone simples */}
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.02-.24 11.36 11.36 0 003.56.57 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1 11.36 11.36 0 00.57 3.56 1 1 0 01-.24 1.02l-2.21 2.21z" />
                </svg>
                {phone}
              </a>
            ) : (
              <span className="rounded-md bg-black/40 px-5 py-3">
                Sem telefone
              </span>
            )}

            {contact.website ? (
              <a
                href={contact.website}
                target="_blank"
                className="rounded-md bg-black/70 px-5 py-3 text-sm hover:bg-black/80 transition"
              >
                Social / Site
              </a>
            ) : (
              <span className="rounded-md bg-black/40 px-5 py-3 text-sm">
                Sem social
              </span>
            )}

            <a
              href={`https://www.google.com/search?q=${encodeURIComponent(
                `${contact.companyName} ${extractCity(contact.companyCity)}`,
              )}`}
              target="_blank"
              className="rounded-md bg-black/70 px-5 py-3 text-sm hover:bg-black/80 transition"
            >
              Pesquisa
            </a>
          </div>

          {/* Agendar + Pending */}
          <div className="mt-6 flex items-center justify-center gap-4">
            <ScheduleModal
              calendlyUrl={
                process.env.NEXT_PUBLIC_CALENDLY_URL || "https://calendly.com/"
              }
              onConfirmBooked={(note) =>
                doDisposition("BOOKED", { note })
              }
            />

            <PendingMini
              onNoAnswer={() => doDisposition("NO_ANSWER")}
              onCallLater={(note) =>
                doDisposition("CALL_LATER", { note })
              }
            />
          </div>

          {/* Recusado + Skip */}
          <div className="mt-6 flex items-center justify-between text-sm">
            <button
              className="text-red-300 underline underline-offset-4 hover:opacity-80 transition"
              onClick={() => {
                if (
                  confirm("Tens a certeza que queres marcar como Recusado?")
                ) {
                  doDisposition("REFUSED");
                }
              }}
            >
              Recusado
            </button>

            <button
              className="text-white/70 underline underline-offset-4 hover:opacity-80 transition"
              onClick={() => {
                if (confirm("Queres mesmo fazer Skip deste contacto?")) {
                  // mesmo comportamento que na nova sessão: trata como SKIP no backend
                  doDisposition("NO_ANSWER", { skip: true });
                }
              }}
            >
              Skip
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- componentes auxiliares ---------- */

function extractCity(companyCity?: string | null): string {
  if (!companyCity) return "";
  const parts = companyCity.split(" ");
  const firstWord = parts[0] || "";
  if (/^\d{4}-\d{3}$/.test(firstWord)) {
    return parts.slice(1).join(" ");
  }
  return companyCity;
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
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <div className="relative bg-white rounded-xl p-6 w-[min(520px,94vw)] text-slate-900">
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
  onConfirmBooked: (note: string) => Promise<void> | void;
  calendlyUrl: string;
}) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [note, setNote] = useState("");

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
          <div className="relative bg-white rounded-xl p-6 w-[min(480px,94vw)] text-slate-900 shadow-xl">
            <h3 className="text-lg font-semibold text-center">
              Agendar reunião
            </h3>
            <p className="mt-3 text-sm text-center text-slate-600">
              1) Clica em <strong>Book</strong> para abrir o Calendly e marcar.{" "}
              <br />
              2) Depois de marcares, escreve abaixo as notas para o vendedor e
              clica em <strong>Confirmar</strong> para registar este contacto
              como <em>BOOKED</em>.
            </p>

            <label className="mt-4 block text-sm font-medium">
              Notas para a reunião
              <span className="block text-xs font-normal text-slate-500">
                Ex.: soluções propostas, serviços em que demonstrou interesse,
                contexto do negócio, objeções, etc.
              </span>
            </label>
            <textarea
              className="mt-2 w-full min-h-[120px] rounded-md border p-3 text-sm outline-none focus:ring-2 focus:ring-[#00b8b8]"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex.: Interessado em website + Google Ads; quer aumentar reservas ao almoço durante a semana..."
            />

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
                    const trimmed = note.trim();
                    await onConfirmBooked(trimmed);
                    setOpen(false);
                    setNote("");
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
