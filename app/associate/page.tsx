// page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getLisbonNow } from "@/lib/categories";
import React from "react";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfWeek(d: Date) {
  const x = startOfDay(d);
  const day = x.getDay(); // 0=Sun,1=Mon...
  const diff = (day === 0 ? -6 : 1) - day;
  x.setDate(x.getDate() + diff);
  return x;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function pct(actual: number, goal: number) {
  if (!goal) return 0;
  return Math.min(100, Math.round((actual / goal) * 100));
}

function formatMinutesFromSeconds(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  if (hh > 0) {
    return `${hh}h ${mm.toString().padStart(2, "0")}m`;
  }
  return `${mm}m ${s.toString().padStart(2, "0")}s`;
}

function computeLevel(totalSales: number) {
  if (totalSales < 20) {
    return {
      level: 1,
      label: "Nível 1 - Onboarding",
      description:
        "Até 20 vendas. A partir das 20 vendas esta conta passa para um patamar com comissão reforçada e bónus de arranque.",
    };
  }
  if (totalSales < 40) {
    return {
      level: 2,
      label: "Nível 2 - Consistente",
      description:
        "Entre 20 e 40 vendas. Fase de consolidação, com foco em criar um fluxo estável de bookings e vendas.",
    };
  }
  return {
    level: 3,
    label: "Nível 3 – Top performer",
    description:
      "Mais de 40 vendas. Perfil de alta performance, com espaço para reconhecimento extra e incentivos adicionais.",
  };
}

// Meta mensal de vendas (fixa, não depende de horas)
const MONTHLY_SALES_GOAL = 20;

/* -------------------- KPI CONSTANTS -------------------- */

// Each rep: daily target helpers (kept for bookings goals)
const HOURS_BASE = 5;
const CONTACTS_PER_HOUR = 1.0;
const BOOKINGS_PER_HOUR = 0.25;

// Main KPI: good conversations goal
const GOOD_CONVERSATIONS_GOAL = 8;

// Good conversation length threshold (in seconds)
// User requested main KPI = "Conversas qualificadas (>= 1 minute)".
// Change here if you want 120s instead: set to 120
const GOOD_CONVERSATION_SECONDS = 60;

/* ------- Weekly & Monthly goals helpers ------- */

function getManagerHours(date: Date) {
  const dow = date.getDay();
  if (dow === 5) return 3;
  return 8;
}

// Booking goal is always 2 per day, fixed
const DAILY_BOOKINGS_GOAL = 2;

function getDailyGoalsForAssociate(userRole: string, date: Date) {
  return {
    dailyBookings: DAILY_BOOKINGS_GOAL,
  };
}

function getWeeklyGoal(userRole: string, now: Date) {
  const weekStart = startOfWeek(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  let bookingGoal = 0;

  for (let d = new Date(weekStart); d <= weekEnd; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay();

    // Tuesday–Friday only
    if (![2, 3, 4, 5].includes(dow)) continue;

    // Skip holidays if needed
    if (d.getMonth() === 11 && d.getDate() === 25) continue;

    bookingGoal += 2; // 2 bookings per working day
  }

  return {
    weeklyBookings: bookingGoal,
  };
}

function getMonthlyGoal(userRole: string, now: Date) {
  const year = now.getFullYear();
  const month = now.getMonth();

  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);

  let bookingGoal = 0;

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay();

    if (![2, 3, 4, 5].includes(dow)) continue;

    if (d.getMonth() === 11 && d.getDate() === 25) continue;

    bookingGoal += 2;
  }

  return {
    monthlyBookings: bookingGoal,
  };
}

/* -------------------- Page (main) -------------------- */

export default async function AssociateHome() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const user = session.user as any;
  const userId = user.id as string;

  const now = getLisbonNow();
  const dayStart = startOfDay(now);
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);

  // Fetch required metrics: bookings, dials (timers), aggregate talk time, good conversations, totals, associates
  const [
    bookingsToday,
    bookingsWeek,
    bookingsMonth,

    callsToday,
    callsWeek,
    callsMonth,

    timersTodayAggregate,
    timersWeekAggregate,

    goodConversationsToday,
    goodConversationsWeek,
    goodConversationsMonth,

    totalBookingsAll,
    totalSalesAll,
    monthSales,

    associates,
  ] = await Promise.all([
    // BOOKINGS
    prisma.contact.count({
      where: { assignedToId: userId, lastCalledAt: { gte: dayStart }, state: "BOOKED" },
    }),
    prisma.contact.count({
      where: { assignedToId: userId, lastCalledAt: { gte: weekStart }, state: "BOOKED" },
    }),
    prisma.contact.count({
      where: { assignedToId: userId, lastCalledAt: { gte: monthStart }, state: "BOOKED" },
    }),

    // DIALS (timers count)
    prisma.contactTimer.count({
      where: { userId, endedAt: { gte: dayStart } },
    }),
    prisma.contactTimer.count({
      where: { userId, endedAt: { gte: weekStart } },
    }),
    prisma.contactTimer.count({
      where: { userId, endedAt: { gte: monthStart } },
    }),

    // AGG TALK TIME
    prisma.contactTimer.aggregate({
      _sum: { durationSec: true },
      where: { userId, endedAt: { gte: dayStart } },
    }),
    prisma.contactTimer.aggregate({
      _sum: { durationSec: true },
      where: { userId, endedAt: { gte: weekStart } },
    }),

    // GOOD CONVERSATIONS (>= GOOD_CONVERSATION_SECONDS)
    prisma.contactTimer.count({
      where: { userId, endedAt: { gte: dayStart }, durationSec: { gte: GOOD_CONVERSATION_SECONDS } },
    }),
    prisma.contactTimer.count({
      where: { userId, endedAt: { gte: weekStart }, durationSec: { gte: GOOD_CONVERSATION_SECONDS } },
    }),
    prisma.contactTimer.count({
      where: { userId, endedAt: { gte: monthStart }, durationSec: { gte: GOOD_CONVERSATION_SECONDS } },
    }),

    // TOTALS
    prisma.contact.count({
      where: { assignedToId: userId, state: "BOOKED" },
    }),
    prisma.sale.count({
      where: { userId },
    }),
    prisma.sale.count({
      where: { userId, createdAt: { gte: monthStart } },
    }),

    // ASSOCIATES
    prisma.user.findMany({
      where: { role: "ASSOCIATE" },
      select: { id: true, name: true },
    }),
  ]);

  // Normalize aggregates safely
  const talkSecToday = timersTodayAggregate?._sum?.durationSec ?? 0;
  const talkSecWeek = timersWeekAggregate?._sum?.durationSec ?? 0;

  // Recompute goals
  const dailyGoals = getDailyGoalsForAssociate(user.role, now);
  const weeklyGoals = getWeeklyGoal(user.role, now);
  const monthlyGoals = getMonthlyGoal(user.role, now);

  // Conversion: bookings per good conversation
  const dailyConv = goodConversationsToday ? bookingsToday / goodConversationsToday : 0;
  const weeklyConv = goodConversationsWeek ? bookingsWeek / goodConversationsWeek : 0;
  const monthlyConv = goodConversationsMonth ? bookingsMonth / goodConversationsMonth : 0;

  // Competitor (pairing)
  const competitor = associates.find((a) => a.id !== userId) || null;
  let competitorWeeklyBookings = 0;
  let competitorMonthlySales = 0;
  if (competitor) {
    const [cb, cs] = await Promise.all([
      prisma.contact.count({
        where: {
          assignedToId: competitor.id,
          lastCalledAt: { gte: weekStart },
          state: "BOOKED",
        },
      }),
      prisma.sale.count({
        where: {
          userId: competitor.id,
          createdAt: { gte: monthStart },
        },
      }),
    ]);
    competitorWeeklyBookings = cb;
    competitorMonthlySales = cs;
  }

  const levelInfo = computeLevel(totalSalesAll);
  const firstName =
    (typeof user.name === "string" ? user.name.split(" ")[0] : null) || "Comercial";

  // Render
  return (
    <div className="bg-slate-950/2">
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
        {/* Header */}
        <header className="rounded-2xl bg-gradient-to-r from-[#0b1f46] via-[#13406b] to-[#0c9bbf] px-6 py-5 text-white shadow-sm flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-white/60">WebtoGO Sales · Vista Geral</p>
            <h1 className="mt-1 text-2xl font-semibold">Olá, {firstName} 👋</h1>
            <p className="mt-2 text-sm text-white/85 max-w-lg">
              Resumo do teu ritmo diário, semanal e mensal. Foco em boas conversas (≥ 1min), agendamentos e tempo de contacto.
            </p>
          </div>
          <div className="hidden sm:flex flex-col items-end text-xs text-white/70">
            <span>Hoje: {now.toLocaleDateString("pt-PT")}</span>
            <span className="mt-1 px-2 py-1 rounded-full bg-black/20 border border-white/15">
              Dashboard de acompanhamento em tempo real
            </span>
          </div>
        </header>

        {/* KPIs Hoje / Semana / Mês */}
        <section className="grid gap-4 md:grid-cols-3">
          <KpiCard
            title="Hoje"
            subtitle="Conversas qualificadas (≥ 1min)"
            goodConversations={goodConversationsToday}
            goodConversationsGoal={GOOD_CONVERSATIONS_GOAL}
            bookings={bookingsToday}
            bookingsGoal={2}
            conversion={dailyConv}
            calls={callsToday}
            talkTimeSec={talkSecToday}
          />

          <KpiCard
            title="Esta semana"
            subtitle="Construção de pipeline"
            goodConversations={goodConversationsWeek}
            goodConversationsGoal={GOOD_CONVERSATIONS_GOAL}
            bookings={bookingsWeek}
            bookingsGoal={weeklyGoals.weeklyBookings}
            conversion={weeklyConv}
            calls={callsWeek}
            talkTimeSec={talkSecWeek}
          />

          <KpiCard
            title="Este mês"
            subtitle="Visão global de performance"
            goodConversations={goodConversationsMonth}
            goodConversationsGoal={GOOD_CONVERSATIONS_GOAL}
            bookings={bookingsMonth}
            bookingsGoal={monthlyGoals.monthlyBookings}
            conversion={monthlyConv}
            calls={callsMonth}
            talkTimeSec={0}
          />
        </section>

        {/* Summary + competitor */}
        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-white shadow-sm border border-slate-100 p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Resumo de performance</h2>
                <p className="text-sm text-slate-600">Os teus resultados consolidados.</p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 border border-emerald-100">
                <span className="text-[10px]">●</span> {levelInfo.label}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm mt-2">
              <div className="space-y-1 rounded-xl bg-slate-50/60 p-3">
                <p className="text-slate-500 text-xs">Bookings totais</p>
                <p className="text-2xl font-semibold text-slate-900">{totalBookingsAll}</p>
                <p className="text-[11px] text-slate-500">Reuniões agendadas a partir de conversas qualificadas.</p>
              </div>

              <div className="space-y-1 rounded-xl bg-slate-50/60 p-3">
                <p className="text-slate-500 text-xs">Vendas totais</p>
                <p className="text-2xl font-semibold text-emerald-600">{totalSalesAll}</p>
                <p className="text-[11px] text-slate-500">Negócios fechados associados às reuniões.</p>
              </div>

              <div className="space-y-1">
                <p className="text-slate-500 text-xs">Vendas este mês</p>
                <p className="text-lg font-semibold text-slate-900">{monthSales} / {MONTHLY_SALES_GOAL}</p>
                <ProgressBar percent={pct(monthSales, MONTHLY_SALES_GOAL)} />
              </div>

              <div className="space-y-1">
                <p className="text-slate-500 text-xs">Nível atual</p>
                <p className="text-lg font-semibold text-slate-900">{levelInfo.label}</p>
              </div>
            </div>

            <p className="text-xs text-slate-500 mt-2 leading-relaxed">{levelInfo.description}</p>
          </div>

          <div className="rounded-2xl bg-white shadow-sm border border-slate-100 p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Parceiro GOSales</h2>
                <p className="text-sm text-slate-600">
                  Comparação com o parceiro de performance do mês. Bónus mensal atribuído ao melhor desempenho.
                </p>
              </div>
            </div>

            {competitor ? (
              <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-2 rounded-xl bg-slate-50/80 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">{firstName}</p>
                  <div className="space-y-1">
                    <p className="text-slate-500 text-xs">Bookings (semana)</p>
                    <p className="text-base font-semibold text-slate-900">{bookingsWeek}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-slate-500 text-xs">Vendas (mês)</p>
                    <p className="text-base font-semibold text-emerald-600">{monthSales}</p>
                  </div>
                </div>

                <div className="space-y-2 rounded-xl bg-slate-50/40 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Parceiro do mês</p>
                  <div className="space-y-1">
                    <p className="text-slate-500 text-xs">Bookings (semana)</p>
                    <p className="text-base font-semibold text-slate-900">{competitorWeeklyBookings}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-slate-500 text-xs">Vendas (mês)</p>
                    <p className="text-base font-semibold text-emerald-600">{competitorMonthlySales}</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-500">
                Assim que existir outro comercial ativo, esta secção mostra a comparação com o parceiro e o bónus associado.
              </p>
            )}

            {competitor && (
              <p className="mt-3 text-xs text-slate-500 leading-relaxed">
                Este painel reflete a competição saudável entre <span className="font-medium">{firstName}</span> e o parceiro do mês.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

/* ---------- Reusable components ---------- */

function KpiCard(props: {
  title: string;
  subtitle: string;
  goodConversations: number;
  goodConversationsGoal: number;
  bookings: number;
  bookingsGoal: number;
  conversion: number;
  calls: number;
  talkTimeSec: number;
}) {
  const {
    title,
    subtitle,
    goodConversations,
    goodConversationsGoal,
    bookings,
    bookingsGoal,
    conversion,
    calls,
    talkTimeSec,
  } = props;

  return (
    <div className="rounded-2xl bg-white shadow-sm border border-slate-100 p-5 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
        <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">KPI</span>
      </div>

      <div className="space-y-3 text-sm">
        {/* Good conversations (main KPI) */}
        <div>
          <div className="flex items-baseline justify-between">
            <span className="text-slate-600">
              Conversas qualificadas
              <span className="block text-[10px] text-slate-400 mt-0.5">Duração ≥ {GOOD_CONVERSATION_SECONDS/60} minuto(s)</span>
            </span>
            <span className="font-semibold text-slate-900">{goodConversations} / {goodConversationsGoal}</span>
          </div>
          <ProgressBar percent={pct(goodConversations, goodConversationsGoal)} />
        </div>

        {/* Bookings */}
        <div>
          <div className="flex items-baseline justify-between">
            <span className="text-slate-600">Bookings</span>
            <span className="font-semibold text-slate-900">{bookings} / {bookingsGoal}</span>
          </div>
          <ProgressBar percent={pct(bookings, bookingsGoal)} />
          <p className="mt-1 text-xs text-slate-500">
            Conversão: {(conversion * 100).toFixed(1)}% (bookings ÷ conversas qualificadas)
          </p>
        </div>

        {/* Dials */}
        <div>
          <div className="flex items-baseline justify-between">
            <span className="text-slate-600">Dials (tentativas)</span>
            <span className="font-semibold text-slate-900">{calls}</span>
          </div>
          {calls > 0 && (
            <p className="text-xs text-slate-500 mt-1">Conversão dial → conversa qualificada: {(goodConversations / calls * 100 || 0).toFixed(1)}%</p>
          )}
        </div>

        {/* Talk time */}
        {talkTimeSec > 0 && (
          <div className="flex items-baseline justify-between text-xs text-slate-500">
            <span>Tempo registado</span>
            <span>{formatMinutesFromSeconds(talkTimeSec)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
      <div className="h-1.5 rounded-full bg-emerald-500 transition-all" style={{ width: `${percent}%` }} />
    </div>
  );
}
