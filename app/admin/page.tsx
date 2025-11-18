// app/admin/page.tsx
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getLisbonNow } from "@/lib/categories";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfWeek(d: Date) {
  const x = startOfDay(d);
  const day = x.getDay(); // 0=Dom,1=Seg,...
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
  if (hh > 0) return `${hh}h ${mm.toString().padStart(2, "0")}m`;
  return `${mm}m ${s.toString().padStart(2, "0")}s`;
}

export default async function AdminDashboard() {
 const session: any = await getServerSession(authOptions);
  const userSession = session?.user as any;

  if (!session || userSession.role !== "ADMIN") redirect("/login");

  const now = getLisbonNow();
  const dayStart = startOfDay(now);
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);

  const [
    total,
    novo,
    callLater,
    noAns,
    booked,
    refused,
    skip,
    totalSalesCount,
    salesAggAll,
    monthSalesCount,
    monthSalesAgg,
    contactsToday,
    bookingsToday,
    salesTodayCount,
    contactsWeek,
    bookingsWeek,
    salesWeekCount,
    contactsMonth,
    bookingsMonth,
    salesMonthCountConfirm,
    associates,
    timersToday,
  ] = await Promise.all([
    prisma.contact.count(),
    prisma.contact.count({ where: { state: "NEW" } }),
    prisma.contact.count({ where: { state: "CALL_LATER" } }),
    prisma.contact.count({ where: { state: "NO_ANSWER" } }),
    prisma.contact.count({ where: { state: "BOOKED" } }),
    prisma.contact.count({ where: { state: "REFUSED" } }),
    prisma.contact.count({ where: { state: "SKIP" } }),

    prisma.sale.count(),
    prisma.sale.aggregate({ _sum: { amount: true } }),
    prisma.sale.count({
      where: { createdAt: { gte: monthStart } },
    }),
    prisma.sale.aggregate({
      where: { createdAt: { gte: monthStart } },
      _sum: { amount: true },
    }),

    prisma.contact.count({
      where: {
        lastCalledAt: { gte: dayStart },
        state: { notIn: ["NEW", "NO_ANSWER"] },
      },
    }),
    prisma.contact.count({
      where: {
        lastCalledAt: { gte: dayStart },
        state: "BOOKED",
      },
    }),
    prisma.sale.count({
      where: { createdAt: { gte: dayStart } },
    }),

    prisma.contact.count({
      where: {
        lastCalledAt: { gte: weekStart },
        state: { notIn: ["NEW", "NO_ANSWER"] },
      },
    }),
    prisma.contact.count({
      where: {
        lastCalledAt: { gte: weekStart },
        state: "BOOKED",
      },
    }),
    prisma.sale.count({
      where: { createdAt: { gte: weekStart } },
    }),

    prisma.contact.count({
      where: {
        lastCalledAt: { gte: monthStart },
        state: { notIn: ["NEW", "NO_ANSWER"] },
      },
    }),
    prisma.contact.count({
      where: {
        lastCalledAt: { gte: monthStart },
        state: "BOOKED",
      },
    }),
    prisma.sale.count({
      where: { createdAt: { gte: monthStart } },
    }),

    prisma.user.findMany({
      where: { role: "ASSOCIATE" },
      select: { id: true, name: true, email: true },
    }),

    prisma.contactTimer.findMany({
      where: { startedAt: { gte: dayStart } },
      select: { userId: true, durationSec: true },
    }),
  ]);

  const totalSalesAmountAll = salesAggAll._sum.amount ?? 0;
  const monthSalesAmount = monthSalesAgg._sum.amount ?? 0;

  const todayConv =
    contactsToday > 0 ? (bookingsToday / contactsToday) * 100 : 0;
  const weekConv =
    contactsWeek > 0 ? (bookingsWeek / contactsWeek) * 100 : 0;
  const monthConv =
    contactsMonth > 0 ? (bookingsMonth / contactsMonth) * 100 : 0;
  const salesFromBookings =
    booked > 0 ? (totalSalesCount / booked) * 100 : 0;

  const timersByUser: Record<string, { calls: number; secs: number }> = {};
  for (const t of timersToday) {
    timersByUser[t.userId] ??= { calls: 0, secs: 0 };
    timersByUser[t.userId].calls += 1;
    timersByUser[t.userId].secs += t.durationSec ?? 0;
  }

  // Per-commercial stats (semana + mês)
  const associatesWithStats = await Promise.all(
    associates.map(async (u) => {
      const [weekContacts, weekBookings, monthSalesUser, pendentesUser] =
        await Promise.all([
          prisma.contact.count({
            where: {
              assignedToId: u.id,
              lastCalledAt: { gte: weekStart },
              state: { notIn: ["NEW", "NO_ANSWER"] },
            },
          }),
          prisma.contact.count({
            where: {
              assignedToId: u.id,
              lastCalledAt: { gte: weekStart },
              state: "BOOKED",
            },
          }),
          prisma.sale.count({
            where: {
              userId: u.id,
              createdAt: { gte: monthStart },
            },
          }),
          prisma.contact.count({
            where: {
              assignedToId: u.id,
              state: "CALL_LATER",
            },
          }),
        ]);

      return {
        ...u,
        weekContacts,
        weekBookings,
        weekConv:
          weekContacts > 0 ? (weekBookings / weekContacts) * 100 : 0,
        monthSalesUser,
        pendentesUser,
      };
    })
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
        {/* Header */}
        <header className="rounded-2xl bg-gradient-to-r from-[#0b1f46] via-[#13406b] to-[#0c9bbf] px-6 py-5 text-white shadow-sm flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-white/60">
              WebtoGO Sales · Painel de Operação
            </p>
            <h1 className="mt-1 text-2xl font-semibold">
              Visão geral de leads, bookings e vendas
            </h1>
            <p className="mt-2 text-sm text-white/85 max-w-xl">
              Aqui tens o fluxo global de leads, agendamentos e vendas. Ideal
              para perceber o ritmo da operação, gargalos e performance por
              comercial.
            </p>
          </div>
          <div className="hidden sm:flex flex-col items-end text-xs text-white/70">
            <span>Hoje: {now.toLocaleDateString("pt-PT")}</span>
            <span className="mt-1 px-2 py-1 rounded-full bg-black/20 border border-white/15">
              Visão consolidada (tempo real)
            </span>
          </div>
        </header>

        {/* Pipeline + vendas */}
        <section className="grid gap-4 md:grid-cols-4 lg:grid-cols-8">
          {[
            ["Total contactos", total],
            ["NEW", novo],
            ["CALL_LATER", callLater],
            ["NO_ANSWER", noAns],
            ["BOOKED", booked],
            ["REFUSED", refused],
            ["SKIP", skip],
            ["Vendas (total)", totalSalesCount],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-xl bg-white shadow-sm border border-slate-100 px-4 py-3"
            >
              <div className="text-[11px] uppercase tracking-wide text-slate-500">
                {label}
              </div>
              <div className="mt-1 text-xl font-semibold text-slate-900">
                {value as number}
              </div>
            </div>
          ))}
        </section>

        {/* Vendas & conversões */}
        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-white shadow-sm border border-slate-100 p-5 space-y-2">
            <h2 className="text-sm font-semibold text-slate-900">
              Receita total
            </h2>
            <p className="text-2xl font-semibold text-emerald-600">
              {totalSalesAmountAll.toFixed(2)} €
            </p>
            <p className="text-xs text-slate-500">
              Soma de todas as vendas registadas no CRM.
            </p>
          </div>

          <div className="rounded-2xl bg-white shadow-sm border border-slate-100 p-5 space-y-2">
            <h2 className="text-sm font-semibold text-slate-900">
              Vendas este mês
            </h2>
            <p className="text-2xl font-semibold text-slate-900">
              {monthSalesCount} vendas
            </p>
            <p className="text-sm text-emerald-600">
              {monthSalesAmount.toFixed(2)} €
            </p>
            <p className="text-xs text-slate-500">
              Vendas com data &ge; início do mês atual.
            </p>
          </div>

          <div className="rounded-2xl bg-white shadow-sm border border-slate-100 p-5 space-y-2">
            <h2 className="text-sm font-semibold text-slate-900">
              Conversão de BOOKED → venda
            </h2>
            <p className="text-2xl font-semibold text-slate-900">
              {salesFromBookings.toFixed(1)}%
            </p>
            <p className="text-xs text-slate-500">
              {booked} bookings totais · {totalSalesCount} vendas registadas.
            </p>
          </div>
        </section>

        {/* Funil Hoje / Semana / Mês */}
        <section className="grid gap-4 md:grid-cols-3">
          <FunnelCard
            title="Hoje"
            contacts={contactsToday}
            bookings={bookingsToday}
            sales={salesTodayCount}
            conversion={todayConv}
          />
          <FunnelCard
            title="Esta semana"
            contacts={contactsWeek}
            bookings={bookingsWeek}
            sales={salesWeekCount}
            conversion={weekConv}
          />
          <FunnelCard
            title="Este mês"
            contacts={contactsMonth}
            bookings={bookingsMonth}
            sales={salesMonthCountConfirm}
            conversion={monthConv}
          />
        </section>

        {/* Tabela por comercial (semana) */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">
            Performance por comercial
          </h2>
          <p className="text-xs text-slate-500">
            Contactos trabalhados e bookings da semana, vendas do mês e pendentes
            em follow-up.
          </p>

          <div className="rounded-2xl overflow-hidden bg-white shadow-sm border border-slate-100">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3">Comercial</th>
                  <th className="px-4 py-3">Contactos (semana)</th>
                  <th className="px-4 py-3">Bookings (semana)</th>
                  <th className="px-4 py-3">Conversão (semana)</th>
                  <th className="px-4 py-3">Vendas (mês)</th>
                  <th className="px-4 py-3">Pendentes</th>
                  <th className="px-4 py-3">Chamadas hoje</th>
                  <th className="px-4 py-3">Tempo hoje</th>
                </tr>
              </thead>
              <tbody>
                {associatesWithStats.map((u) => {
                  const t = timersByUser[u.id] ?? { calls: 0, secs: 0 };
                  return (
                    <tr
                      key={u.id}
                      className="border-t border-slate-100"
                    >
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-900">
                            {u.name}
                          </span>
                          <span className="text-xs text-slate-500">
                            {u.email}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">{u.weekContacts}</td>
                      <td className="px-4 py-3">{u.weekBookings}</td>
                      <td className="px-4 py-3">
                        {u.weekContacts > 0
                          ? `${u.weekConv.toFixed(1)}%`
                          : "–"}
                      </td>
                      <td className="px-4 py-3">{u.monthSalesUser}</td>
                      <td className="px-4 py-3">{u.pendentesUser}</td>
                      <td className="px-4 py-3">{t.calls}</td>
                      <td className="px-4 py-3">
                        {t.secs
                          ? formatMinutesFromSeconds(t.secs)
                          : "00:00"}
                      </td>
                    </tr>
                  );
                })}
                {associatesWithStats.length === 0 && (
                  <tr>
                    <td
                      className="px-4 py-6 text-center text-slate-500"
                      colSpan={8}
                    >
                      Ainda não existem comerciais registados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

/* ---------- auxiliares ---------- */

function FunnelCard(props: {
  title: string;
  contacts: number;
  bookings: number;
  sales: number;
  conversion: number;
}) {
  const { title, contacts, bookings, sales, conversion } = props;

  return (
    <div className="rounded-2xl bg-white shadow-sm border border-slate-100 p-5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500">
            Contactos trabalhados → bookings → vendas
          </p>
        </div>
        <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
          Funil
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 text-sm">
        <div>
          <p className="text-[11px] text-slate-500 uppercase">
            Contactos
          </p>
          <p className="text-lg font-semibold text-slate-900">
            {contacts}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-slate-500 uppercase">
            Bookings
          </p>
          <p className="text-lg font-semibold text-slate-900">
            {bookings}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-slate-500 uppercase">
            Vendas
          </p>
          <p className="text-lg font-semibold text-slate-900">{sales}</p>
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Conversão contactos → bookings:{" "}
        <span className="font-medium">
          {conversion.toFixed(1)}
          %
        </span>
      </p>
    </div>
  );
}
