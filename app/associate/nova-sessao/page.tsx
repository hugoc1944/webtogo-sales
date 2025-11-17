"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

type Contact = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  companyName: string;
  title?: string | null;       
  email?: string | null;
  industry?: string | null;
  keywords?: string | null;
  phoneWork?: string | null;
  phoneMobile?: string | null;
  phoneCorp?: string | null;
  website?: string | null;
};

export default function NovaSessao() {
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user as any;

  const [phase, setPhase] = useState<"idle"|"starting"|"active">("idle");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [since, setSince] = useState<number>(0);
  const [contact, setContact] = useState<Contact | null>(null);
  const contactStartRef = useRef<number | null>(null);

  // tick da sessão
  useEffect(() => {
    if (phase !== "active") return;
    const t = setInterval(() => setSince(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  const fmt = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2,"0");
    const ss = (s % 60).toString().padStart(2,"0");
    return `${m}:${ss}`;
  };

  // Hora/data com atualização automática
  const [nowStr, setNowStr] = useState(
    new Date().toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" })
  );
  useEffect(() => {
    const i = setInterval(() => {
      setNowStr(new Date().toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" }));
    }, 30_000);
    return () => clearInterval(i);
  }, []);

  // começar sessão
  const startSession = async () => {
    setPhase("starting");
    const res = await fetch("/api/sessions/start", { method: "POST" });
    const js = await res.json();
    setSessionId(js.sessionId as string);

    // “A iniciar”: 2s
    setTimeout(async () => {
      setPhase("active");
      await loadNext();
    }, 2000);
  };

  // carrega próximo NEW
  const loadNext = async () => {
    const res = await fetch("/api/contacts/new-session", { method: "POST" });
    const js = await res.json();
    setContact(js.contact);
    contactStartRef.current = 0; // reset
    // começar cronómetro por contacto
    startContactTimer();
  };

  // cronómetro por contacto
  const [contactSeconds, setContactSeconds] = useState(0);
  const startContactTimer = () => {
    setContactSeconds(0);
    contactStartRef.current = Date.now() / 1000;
  };
  const stopContactTimer = () => {
    if (!contactStartRef.current) return 0;
    const end = Date.now() / 1000;
    const dur = Math.max(0, Math.round(end - contactStartRef.current));
    contactStartRef.current = null;
    return dur;
  };

  // terminar sessão
  const endSession = async () => {
    const durationSec = since;
    if (sessionId) await fetch("/api/sessions/end", {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify({ sessionId, durationSec })
    });
    router.push("/associate");
  };

  // handlers de ação
  const phone = contact?.phoneWork || contact?.phoneMobile || contact?.phoneCorp || "";
  const keywords = (contact?.keywords || "").split(",").map(s => s.trim()).filter(Boolean).slice(0,2);
  const [loadingNext, setLoadingNext] = useState(false);

  const doDisposition = async (
    action: "NO_ANSWER"|"CALL_LATER"|"BOOKED"|"REFUSED",
    extra?: any
  ) => {
    if (!contact) return;
    const durationSec = stopContactTimer();
    setLoadingNext(true);

    const res = await fetch(`/api/contacts/${contact.id}/disposition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra, durationSec, sessionId, userId: user?.id }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("Disposition failed", err);
      alert("Não foi possível gravar o estado. Ver consola.");
      setLoadingNext(false);
      return;
    }

    setTimeout(async () => {
      setLoadingNext(false);
      await loadNext();
    }, 500);
  };

  // UI – fases
  if (phase === "idle") {
    return (
      <Bg>
        <div className="flex flex-col h-full items-center justify-center text-white text-center gap-3 animate-fadeIn">
          <h1 className="text-4xl font-semibold">Nova Sessão</h1>
          <p className="mt-4 text-lg">Comerciante: <span className="font-medium">{user?.name ?? "-"}</span></p>
          <p className="mt-1">Data: {nowStr}</p>
          <button
            onClick={startSession}
            className="mt-8 rounded-md bg-black/70 px-8 py-3 transition-colors duration-200 hover:bg-black/80 focus:outline-none focus:ring-2 focus:ring-white/50"
          >
            Começar
          </button>
        </div>
      </Bg>
    );
  }

  if (phase === "starting") {
    return (
      <Bg>
        <div className="h-full flex items-center justify-center">
          <p className="text-white text-xl font-medium">A iniciar…</p>
        </div>
      </Bg>
    );
  }

  // phase === active
  return (
    <Bg>
      {/* barras topo */}
      <div className="absolute top-3 left-4 text-white/90">
        <button onClick={endSession} className="underline underline-offset-4">Terminar sessão</button>
      </div>
      <div className="absolute top-3 right-4 text-white/90 tabular-nums">{fmt(since)}</div>

      {/* contacto */}
      <div className="h-full flex items-center justify-center">
        {!contact ? (
          <p className="text-white/90">Sem mais contactos em NEW.</p>
        ) : (
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
                  href={`tel:${phone.replace(/\s/g,"")}`}
                  className="rounded-md bg-black/70 px-5 py-3 inline-flex items-center gap-2 hover:bg-black/80 transition">
                  {/* ícone simples inline */}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.02-.24 11.36 11.36 0 003.56.57 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1 11.36 11.36 0 00.57 3.56 1 1 0 01-.24 1.02l-2.21 2.21z"/></svg>
                  {phone}
                </a>
              ) : (
                <span className="rounded-md bg-black/40 px-5 py-3">Sem telefone</span>
              )}

              {contact.website ? (
                <a href={contact.website} target="_blank" className="rounded-md bg-black/70 px-5 py-3 hover:bg-black/80 transition">Website</a>
              ) : (
                <span className="rounded-md bg-black/40 px-5 py-3">Sem website</span>
              )}
            </div>

            <div className="mt-6 flex items-center justify-center gap-4">
              <ScheduleModal
                onConfirmBooked={() => doDisposition("BOOKED")}
                calendlyUrl={process.env.NEXT_PUBLIC_CALENDLY_URL || "https://calendly.com/"}
              />

              <PendingModal
                onNoAnswer={() => doDisposition("NO_ANSWER")}
                onCallLater={(note) => doDisposition("CALL_LATER", { note })}
              />
            </div>

            <div className="mt-6 flex items-center justify-between text-sm">
              <button
                className="text-red-400 underline underline-offset-4"
                onClick={() => {
                  if (confirm("Tens a certeza que queres marcar como Recusado?")) {
                    doDisposition("REFUSED");
                  }
                }}
              >
                Recusado
              </button>

              <button
                className="text-white/70 underline underline-offset-4"
                onClick={() => {
                  if (confirm("Queres mesmo fazer Skip deste contacto?")) {
                    doDisposition("NO_ANSWER", { skip: true }); // trata como SKIP no backend
                  }
                }}
              >
                Skip
              </button>
            </div>
            {loadingNext && (
              <div className="fixed inset-0 z-50 grid place-items-center bg-black/50">
                <div className="text-white text-lg font-medium animate-pulse">A carregar…</div>
              </div>
            )}
          </div>
        )}
      </div>
    </Bg>
  );
}

/* ---------- componentes auxiliares ---------- */

function Bg({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen">
      <Image src="/blueBG.png" alt="" fill className="object-cover" priority />
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a2a6b]/80 via-[#0a2a6b]/70 to-[#04265a]/90" />
      {/* content layer centrado */}
      <div className="absolute inset-0 flex items-center justify-center px-6">
        <div className="w-full max-w-3xl">{children}</div>
      </div>
    </div>
  );
}


function PendingModal({
  onNoAnswer,
  onCallLater,
}: { onNoAnswer: () => void; onCallLater: (note: string) => void }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");

  const close = () => setOpen(false);

  return (
    <>
      <button
        className="rounded-md bg-black/70 px-6 py-3"
        onClick={() => {
          setNote("");          // 👈 limpa notas sempre que abre
          setOpen(true);
        }}
      >
        Pending
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={close} />
          <div className="relative bg-white text-slate-900 rounded-xl p-6 w-[min(520px,94vw)]">
            <h3 className="text-center text-xl font-bold">Pending</h3>

            <label className="block mt-4 text-sm font-medium">
              Notas (apenas para ligar mais tarde)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-2 w-full min-h-[140px] rounded-md border p-3 outline-none focus:ring-2 focus:ring-[#00b8b8]"
            />

            <div className="mt-4 flex gap-3 justify-center">
              <button
                className="rounded-md bg-[#0e2a4a] text-white px-5 py-2"
                onClick={() => {
                  close();
                  setNote("");   // 👈 limpa após ação
                  onNoAnswer();
                }}
              >
                Não Atendeu
              </button>

              <button
                className="rounded-md bg-[#0e2a4a] text-white px-5 py-2"
                onClick={() => {
                  const val = note.trim();
                  close();
                  setNote("");   // 👈 limpa após ação
                  onCallLater(val);
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
      {/* Botão principal que abre o pop-up */}
      <button
        className="rounded-md bg-black/70 px-6 py-3 hover:bg-black/80 transition"
        onClick={() => setOpen(true)}
      >
        Agendar
      </button>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center">
          {/* overlay */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => !confirming && setOpen(false)}
          />
          {/* caixa */}
          <div className="relative bg-white rounded-xl p-6 w-[min(420px,94vw)] text-slate-900 shadow-xl">
            <h3 className="text-lg font-semibold text-center">
              Agendar reunião
            </h3>
            <p className="mt-3 text-sm text-center text-slate-600">
              1) Clica em <strong>Book</strong> para abrir o Calendly e marcar. <br />
              2) Depois de marcares, clica em <strong>Confirmar</strong> para
              registar este contacto como <em>BOOKED</em> na app.
            </p>

            <div className="mt-5 flex flex-col sm:flex-row gap-3 justify-center">
              {/* Book → abre Calendly */}
              <a
                href={calendlyUrl}
                target="_blank"
                className="flex-1 rounded-md bg-[#0e2a4a] text-white px-4 py-2 text-center hover:bg-[#123667] transition"
                onClick={() => {
                  // apenas abre o Calendly, não muda estado
                }}
              >
                Book
              </a>

              {/* Confirmar → muda estado para BOOKED */}
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