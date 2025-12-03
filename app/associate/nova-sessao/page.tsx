"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

type Contact = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  title?: string | null;
  companyName: string;
  email?: string | null;
  industry?: string | null; // Category
  keywords?: string | null;
  phoneWork?: string | null;
  phoneMobile?: string | null;
  phoneCorp?: string | null;
  website?: string | null; // Social / Website
  companyCity?: string | null;
  segmentKey?: string | null; // A–J
};

// segmentos principais para foco de sessão
const SEGMENT_CHOICES: {
  key: string;
  label: string;
  description: string;
}[] = [
  {
    key: "F_LOJAS_ROUPA_CALCADO_DECORACAO",
    label: "Lojas de Roupa & Decoração",
    description:
      "Lojas de vestuário, calçado, decoração, concept stores e boutiques.",
  },
  {
    key: "E_MERCEARIAS_MERCADOS_PADARIAS",
    label: "Mercearias & Mercados",
    description:
      "Pequenos mercados, mercearias, padarias e negócios de proximidade.",
  },

  {
    key: "C_CABELEIREIROS_BARBEARIAS_ESTETICA",
    label: "Cabeleireiros & Estética",
    description: "Salões, barbearias, estética e beleza em geral.",
  },
];

export default function NovaSessao() {
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user as any;

  const [phase, setPhase] = useState<"idle" | "starting" | "active">("idle");
  const [selectedSegmentKey, setSelectedSegmentKey] = useState<string | null>(
    null
  );
  const [activeSegmentKey, setActiveSegmentKey] = useState<string | null>(null);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [since, setSince] = useState<number>(0);
  const [contact, setContact] = useState<Contact | null>(null);
  const contactStartRef = useRef<number | null>(null);

  // tick da sessão (cronómetro global)
  useEffect(() => {
    if (phase !== "active") return;
    const t = setInterval(() => setSince((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  const fmt = (s: number) => {
    const m = Math.floor(s / 60)
      .toString()
      .padStart(2, "0");
    const ss = (s % 60).toString().padStart(2, "0");
    return `${m}:${ss}`;
  };

  // Hora/data com atualização automática
  const [nowStr, setNowStr] = useState(
    new Date().toLocaleString("pt-PT", {
      dateStyle: "short",
      timeStyle: "short",
    })
  );
  useEffect(() => {
    const i = setInterval(() => {
      setNowStr(
        new Date().toLocaleString("pt-PT", {
          dateStyle: "short",
          timeStyle: "short",
        })
      );
    }, 30_000);
    return () => clearInterval(i);
  }, []);

  // começar sessão (já com segmento escolhido)
  const startSession = async (segmentKey: string) => {
    setPhase("starting");
    setActiveSegmentKey(segmentKey);

    const res = await fetch("/api/sessions/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ segmentKey }),
    });

    const js = await res.json();
    setSessionId(js.sessionId as string);

    // “A iniciar”: 2s
    setTimeout(async () => {
      setPhase("active");
      await loadNext(segmentKey);
    }, 2000);
  };

  // cronómetro por contacto
  const [, setContactSeconds] = useState(0);
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

  // carrega próximo NEW desse segmento
  const loadNext = async (segmentOverride?: string) => {
    const seg = segmentOverride ?? activeSegmentKey;
    if (!seg) return;

    const res = await fetch("/api/contacts/new-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ segmentKey: seg }),
    });

    const js = await res.json();
    setContact(js.contact);
    startContactTimer();
  };

  // terminar sessão
  const endSession = async () => {
    const durationSec = since;
    if (sessionId)
      await fetch("/api/sessions/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, durationSec }),
      });
    router.push("/associate");
  };

  // handlers de ação
  const phone =
    contact?.phoneWork || contact?.phoneMobile || contact?.phoneCorp || "";
  const keywords = (contact?.keywords || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 2);
  const [loadingNext, setLoadingNext] = useState(false);

  // 👇 notas rápidas por segmento (apenas na fase ativa)
  const segmentTips =
    phase === "active" ? getSegmentTips(activeSegmentKey, contact) : [];

  const doDisposition = async (
    action: "NO_ANSWER" | "CALL_LATER" | "BOOKED" | "REFUSED",
    extra?: any
  ) => {
    if (!contact) return;
    const durationSec = stopContactTimer();
    setLoadingNext(true);

    const res = await fetch(`/api/contacts/${contact.id}/disposition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        ...extra,
        durationSec,
        sessionId,
        userId: user?.id,
      }),
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

  /* ---------- UI: fase de escolha de segmento ---------- */

  if (phase === "idle") {
    return (
      <Bg>
        <div className="flex flex-col h-full items-center justify-center text-white text-center gap-4 animate-fadeIn">
          <h1 className="text-4xl font-semibold">Nova sessão</h1>

          <p className="mt-2 text-lg">
            Comercial:{" "}
            <span className="font-medium">{user?.name ?? "-"}</span>
          </p>
          <p className="text-sm text-white/80">Data: {nowStr}</p>

          <p className="mt-4 max-w-xl text-sm text-white/80">
            Para esta sessão, escolhe um tipo de negócio para te concentrares.
            Só vais ver contactos desse segmento até terminares a sessão.
          </p>

          <div className="mt-4 grid gap-3 w-full max-w-3xl md:grid-cols-3">
            {SEGMENT_CHOICES.map((opt, idx) => {
              const isSelected = selectedSegmentKey === opt.key;
              const isRecommended = idx === 0; // primeiro = recomendado agora

              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setSelectedSegmentKey(opt.key)}
                  className={[
                    "rounded-xl border px-4 py-3 text-left text-sm transition-all",
                    "bg-black/35 border-white/15 hover:border-white/35 hover:bg-black/45",
                    isSelected &&
                      "border-emerald-300/80 bg-emerald-500/20 shadow-lg",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-[15px]">
                      {opt.label}
                    </span>
                    {isRecommended && (
                      <span className="inline-flex items-center rounded-full border border-emerald-300/80 bg-emerald-500/20 px-2 py-[2px] text-[10px] uppercase tracking-wide">
                        Recomendado agora
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] text-white/80">
                    {opt.description}
                  </p>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => {
              if (!selectedSegmentKey) {
                alert("Escolhe um segmento para começar a sessão.");
                return;
              }
              startSession(selectedSegmentKey);
            }}
            disabled={!selectedSegmentKey}
            className="mt-6 rounded-md bg-black/80 px-8 py-3 text-sm font-medium transition-colors duration-200 hover:bg-black/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Começar sessão
          </button>
        </div>
      </Bg>
    );
  }

  /* ---------- UI: fase de arranque ---------- */

  if (phase === "starting") {
    return (
      <Bg>
        <div className="h-full flex flex-col items-center justify-center text-white gap-2">
          <p className="text-xl font-medium">A iniciar…</p>
          {activeSegmentKey && (
            <p className="text-sm text-white/80">
              Segmento desta sessão:{" "}
              <span className="font-semibold">
                {segmentLabel(activeSegmentKey)}
              </span>
            </p>
          )}
        </div>
      </Bg>
    );
  }

  /* ---------- UI: fase ativa ---------- */

  return (
    <Bg>
      {/* barras topo */}
      <div className="absolute top-3 left-4 text-white/90 flex flex-col gap-1">
        <button onClick={endSession} className="underline underline-offset-4">
          Terminar sessão
        </button>
        {activeSegmentKey && (
          <span className="text-xs text-white/75">
            Segmento desta sessão:{" "}
            <span className="font-semibold">
              {segmentLabel(activeSegmentKey)}
            </span>
          </span>
        )}
      </div>
      <div className="absolute top-3 right-4 text-white/90 tabular-nums">
        {fmt(since)}
      </div>

      {/* contacto */}
      <div className="h-full flex items-center justify-center">
        {!contact ? (
          <p className="text-white/90">
            Sem mais contactos em NEW para este segmento.
          </p>
        ) : (
          <div className="text-white text-center max-w-3xl space-y-4">
            <h2 className="text-3xl font-extrabold tracking-wide">
              {contact.companyName}
            </h2>

            {/* Pessoa + título + email */}
            <div className="space-y-1">
              <p className="text-lg">
                {[contact.firstName, contact.lastName].filter(Boolean).join(" ")}
                {contact.firstName || contact.lastName ? " – " : ""}
                <span className="opacity-90">{contact.title || ""}</span>
              </p>
              {contact.email && (
                <p className="opacity-90 text-sm">{contact.email}</p>
              )}
            </div>

            {/* Cidade + categoria */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center text-sm opacity-90">
              <span>
                <span className="font-medium">Cidade:</span>{" "}
                {contact.companyCity || "-"}
              </span>
              <span>
                <span className="font-medium">Categoria:</span>{" "}
                {contact.industry || "-"}
              </span>
              {activeSegmentKey && (
                <span>
                  <span className="font-medium">Segmento:</span>{" "}
                  {segmentLabel(activeSegmentKey)}
                </span>
              )}
            </div>

            {/* 🔹 Notas rápidas por segmento (discretas) */}
            {segmentTips.length > 0 && (
              <div className="mt-3 text-left text-sm flex justify-center">
                <div className="inline-block rounded-lg bg-black/35 border border-white/15 px-3 py-2 max-w-xl">
                  <p className="text-[11px] uppercase tracking-wide text-white/60 mb-1">
                    Lembretes para este segmento
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-white/85">
                    {segmentTips.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* botões de contacto primário */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
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

              {/* Social */}
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

              {/* Pesquisa Google com cidade (sem CP) */}
              <a
                href={`https://www.google.com/search?q=${encodeURIComponent(
                  `${contact.companyName} ${extractCity(contact.companyCity)}`
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
                  process.env.NEXT_PUBLIC_CALENDLY_URL ||
                  "https://calendly.com/"
                }
                onConfirmBooked={(note) =>
                  doDisposition("BOOKED", { note })
                }
              />

              <PendingModal
                onNoAnswer={() => doDisposition("NO_ANSWER")}
                onCallLater={(note) =>
                  doDisposition("CALL_LATER", { note })
                }
              />
            </div>

            {/* Recusado + Skip */}
            <div className="mt-6 flex items-center justify-between text-sm">
              <button
                className="text-red-400 underline underline-offset-4"
                onClick={() => {
                  if (
                    confirm(
                      "Tens a certeza que queres marcar como Recusado?"
                    )
                  ) {
                    doDisposition("REFUSED");
                  }
                }}
              >
                Recusado
              </button>

              <button
                className="text-white/70 underline underline-offset-4"
                onClick={() => {
                  if (
                    confirm("Queres mesmo fazer Skip deste contacto?")
                  ) {
                    // backend já trata `skip: true` como SKIP
                    doDisposition("NO_ANSWER", { skip: true });
                  }
                }}
              >
                Skip
              </button>
            </div>

            {/* overlay de loading entre contactos */}
            {loadingNext && (
              <div className="fixed inset-0 z-50 grid place-items-center bg-black/50">
                <div className="text-white text-lg font-medium animate-pulse">
                  A carregar…
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Bg>
  );
}

/* ---------- helpers ---------- */

function segmentLabel(key?: string | null): string {
  if (!key) return "-";
  const map: Record<string, string> = {
    A_CONSTRUCAO_SERVICOS_LAR: "Construção & Serviços de Lar",
    B_RESTAURACAO_CAFES_PASTELARIAS: "Restaurantes & Cafés",
    C_CABELEIREIROS_BARBEARIAS_ESTETICA: "Cabeleireiros & Estética",
    D_OFICINAS_AUTO_PNEUS_SERVICOS_AUTO: "Oficinas & Serviços Auto",
    E_MERCEARIAS_MERCADOS_PADARIAS: "Mercearias & Padarias",
    F_LOJAS_ROUPA_CALCADO_DECORACAO:
      "Lojas de Roupa, Calçado & Decoração",
    G_CLINICAS_SAUDE_WELLNESS: "Clínicas, Saúde & Wellness",
    H_ALOJAMENTO_LOCAL_HOTEIS: "Alojamento Local & Hotéis",
    I_ESCOLAS_CURSOS_CENTROS_ESTUDO:
      "Escolas, Cursos & Centros de Estudo",
    J_PROFISSIONAIS_LIBERAIS_SERVICOS:
      "Profissionais Liberais & Serviços",
  };
  return map[key] ?? key;
}

function extractCity(companyCity?: string | null): string {
  if (!companyCity) return "";
  // ex: "3800-209 Aveiro" → "Aveiro"
  const parts = companyCity.split(" ");
  const firstWord = parts[0] || "";
  if (/^\d{4}-\d{3}$/.test(firstWord)) {
    return parts.slice(1).join(" ");
  }
  return companyCity;
}

// normaliza para comparar "Aveiro", "AVÉIRO", etc.
function normalizeString(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// 🔹 devolve notas rápidas por segmento + contexto (cidade, etc.)
function getSegmentTips(
  segmentKey: string | null | undefined,
  contact: Contact | null
): string[] {
  const tips: string[] = [];
  if (!segmentKey || !contact) return tips;

  if (segmentKey === "B_RESTAURACAO_CAFES_PASTELARIAS") {
    tips.push(
      "Reforça que incluímos uma sessão fotográfica profissional do espaço, pratos e equipa."
    );

    const city = extractCity(contact.companyCity).trim();
    if (city) {
      const normCity = normalizeString(city);
      if (normCity.includes("aveiro")) {
        tips.push(
          "Se fizer sentido, menciona que já fizemos vários projetos para restaurantes em Aveiro, incluindo o Alicarius."
        );
      }
    }
  }

  // outros segmentos podem ser adicionados aqui no futuro

  return tips;
}

function Bg({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen">
      <Image src="/blueBG.png" alt="" fill className="object-cover" priority />
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a2a6b]/80 via-[#0a2a6b]/70 to-[#04265a]/90" />
      <div className="absolute inset-0 flex items-center justify-center px-6">
        <div className="w-full max-w-3xl">{children}</div>
      </div>
    </div>
  );
}
function PendingModal({
  onNoAnswer,
  onCallLater
}: {
  onNoAnswer: () => void;
  onCallLater: (note: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");

  const close = () => setOpen(false);

  return (
    <>
      <button
        className="rounded-md bg-black/70 px-6 py-3"
        onClick={() => {
          setNote("");
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
                  setNote("");
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
                  setNote("");
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
  calendlyUrl
}: {
  onConfirmBooked: (note: string) => Promise<void> | void;
  calendlyUrl: string;
}) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [note, setNote] = useState("");

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
          <div className="relative bg-white rounded-xl p-6 w-[min(480px,94vw)] text-slate-900 shadow-xl">
            <h3 className="text-lg font-semibold text-center">
              Agendar reunião
            </h3>
            <p className="mt-3 text-sm text-center text-slate-600">
              1) Clica em <strong>Book</strong> para abrir o Calendly e marcar.{" "}
              <br />
              2) Depois de marcares, escreve abaixo as notas para o vendedor e
              clica em <strong>Confirmar</strong> para registar este contacto
              como <em>BOOKED</em> na app.
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
              {/* Book → abre Calendly */}
              <a
                href={calendlyUrl}
                target="_blank"
                className="flex-1 rounded-md bg-[#0e2a4a] text-white px-4 py-2 text-center hover:bg-[#123667] transition"
              >
                Book
              </a>

              {/* Confirmar → muda estado para BOOKED + guarda nota */}
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
