// app/admin/comerciais/[userId]/page.tsx
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import SaleButton from "../SaleButton";
import { getLisbonNow } from "@/lib/categories";
import NoteViewer from "../../../associate/pendentes/NoteViewer"; 
import AddNoteButton from "../AddNoteButton"; 
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

function formatMinutesFromSeconds(sec: number | null | undefined) {
  if (!sec) return "00:00";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  if (hh > 0) return `${hh}h ${mm.toString().padStart(2, "0")}m`;
  return `${mm}m ${s.toString().padStart(2, "0")}s`;
}

type PageProps = {
  params: Promise<{ userId: string }>;
};

export default async function ComercialDetail({ params }: PageProps) {
  // ✅ unwrap params first
  const { userId } = await params;

  const session: any = await getServerSession(authOptions);
  const userSession = session?.user as any;

  if (!session || !["ADMIN", "MANAGER"].includes(userSession.role)) redirect("/login");
  const viewerRole = userSession.role as string;
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) notFound();

  const now = getLisbonNow();
  const dayStart = startOfDay(now);
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);

  const [
    contactsMonth,
    bookingsMonth,
    salesMonthAgg,
    salesAllAgg,
    [newCount, callLaterCount, noAnsCount, bookedCount, refusedCount, skipCount],
    timersWeekAgg,
    sessionsWeekAgg,
    recentBookings,
  ] = await Promise.all([
    prisma.contact.count({
      where: {
        assignedToId: user.id,
        lastCalledAt: { gte: monthStart },
        state: { notIn: ["NEW", "NO_ANSWER"] },
      },
    }),
    prisma.contact.count({
      where: {
        assignedToId: user.id,
        lastCalledAt: { gte: monthStart },
        state: "BOOKED",
      },
    }),
    prisma.sale.aggregate({
      where: { userId: user.id, createdAt: { gte: monthStart } },
      _count: { _all: true },
      _sum: { amount: true },
    }),
    prisma.sale.aggregate({
      where: { userId: user.id },
      _count: { _all: true },
      _sum: { amount: true },
    }),
    prisma.$transaction([
      prisma.contact.count({
        where: { assignedToId: user.id, state: "NEW" },
      }),
      prisma.contact.count({
        where: { assignedToId: user.id, state: "CALL_LATER" },
      }),
      prisma.contact.count({
        where: { assignedToId: user.id, state: "NO_ANSWER" },
      }),
      prisma.contact.count({
        where: { assignedToId: user.id, state: "BOOKED" },
      }),
      prisma.contact.count({
        where: { assignedToId: user.id, state: "REFUSED" },
      }),
      prisma.contact.count({
        where: { assignedToId: user.id, state: "SKIP" },
      }),
    ]),
    prisma.contactTimer.aggregate({
      where: { userId: user.id, endedAt: { gte: weekStart } },
      _count: { _all: true },
      _sum: { durationSec: true },
    }),
    prisma.callSession.aggregate({
      where: { userId: user.id, startedAt: { gte: weekStart } },
      _count: { _all: true },
      _sum: { durationSec: true },
    }),
    prisma.contact.findMany({
      where: { assignedToId: user.id, state: "BOOKED" },
      orderBy: { lastCalledAt: "desc" },
      take: 25,
      select: {
      id: true,
      companyName: true,
      companyCity: true,
      segmentKey: true,
      lastCalledAt: true,
      bookingNotes: {
        take: 1,
        orderBy: { createdAt: "desc" },
        select: { content: true, createdAt: true, authorId: true },
      },
    },
    }),
  ]);

  const bookingsIds = recentBookings.map((b) => b.id);
  const salesForBookings = bookingsIds.length
    ? await prisma.sale.findMany({
        where: { contactId: { in: bookingsIds }, userId: user.id },
      })
    : [];

  const salesMap = new Map<string, { id: string; amount: number | null }>();
  for (const s of salesForBookings) {
    salesMap.set(s.contactId, { id: s.id, amount: s.amount ?? null });
  }

  const monthSalesCount = salesMonthAgg._count?._all ?? 0;
  const monthRevenue = salesMonthAgg._sum.amount ?? 0;
  const totalSalesCount = salesAllAgg._count?._all ?? 0;
  const totalRevenue = salesAllAgg._sum.amount ?? 0;

  const convMonthContacts =
    contactsMonth > 0 ? (bookingsMonth / contactsMonth) * 100 : 0;
  const convMonthSales =
    bookingsMonth > 0 ? (monthSalesCount / bookingsMonth) * 100 : 0;

  const talkSecWeek = timersWeekAgg._sum.durationSec ?? 0;
  const callsWeek = timersWeekAgg._count?._all ?? 0;
  const sessionsWeek = sessionsWeekAgg._count?._all ?? 0;
  const sessSecWeek = sessionsWeekAgg._sum.durationSec ?? 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-slate-500 mb-1">
              <Link
                href="/admin/comerciais"
                className="text-slate-500 hover:text-slate-700 underline underline-offset-2"
              >
                &larr; Voltar à lista de comerciais
              </Link>
            </p>
            <h1 className="text-2xl font-semibold text-slate-900">
              {user.name}
            </h1>
            <p className="text-sm text-slate-600">
              Visão detalhada de contactos, bookings e vendas associados a este
              comercial.
            </p>
          </div>
          <div className="text-right text-xs text-slate-500">
            <div>{user.email}</div>
            <div className="mt-1">
              Atualizado em{" "}
              {now.toLocaleString("pt-PT", {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </div>
          </div>
        </header>

        {/* Cards principais */}
        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-white shadow-sm border border-slate-100 p-5 space-y-2">
            <h2 className="text-sm font-semibold text-slate-900">
              Mês atual – funil
            </h2>
            <p className="text-xs text-slate-500">
              Contactos trabalhados &rarr; bookings &rarr; vendas.
            </p>
            <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-[11px] text-slate-500 uppercase">
                  Contactos
                </p>
                <p className="text-lg font-semibold text-slate-900">
                  {contactsMonth}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500 uppercase">
                  Bookings
                </p>
                <p className="text-lg font-semibold text-slate-900">
                  {bookingsMonth}
                </p>
                <p className="text-[11px] text-slate-500">
                  Conv.: {convMonthContacts.toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500 uppercase">
                  Vendas
                </p>
                <p className="text-lg font-semibold text-slate-900">
                  {monthSalesCount}
                </p>
                <p className="text-[11px] text-slate-500">
                  De bookings: {convMonthSales.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white shadow-sm border border-slate-100 p-5 space-y-2">
            <h2 className="text-sm font-semibold text-slate-900">
              Vendas & receita
            </h2>
            <div className="mt-2 space-y-2 text-sm">
              <div>
                <p className="text-[11px] text-slate-500 uppercase">
                  Vendas total
                </p>
                <p className="text-lg font-semibold text-slate-900">
                  {totalSalesCount} vendas
                </p>
                <p className="text-[11px] text-slate-500">
                  {totalRevenue.toFixed(2)} € acumulados
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500 uppercase">
                  Vendas este mês
                </p>
                <p className="text-lg font-semibold text-slate-900">
                  {monthSalesCount} vendas
                </p>
                <p className="text-[11px] text-slate-500">
                  {monthRevenue.toFixed(2)} € este mês
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white shadow-sm border border-slate-100 p-5 space-y-2">
            <h2 className="text-sm font-semibold text-slate-900">
              Atividade recente (semana)
            </h2>
            <div className="mt-2 space-y-2 text-sm">
              <div>
                <p className="text-[11px] text-slate-500 uppercase">
                  Sessões
                </p>
                <p className="text-lg font-semibold text-slate-900">
                  {sessionsWeek}
                </p>
                <p className="text-[11px] text-slate-500">
                  {formatMinutesFromSeconds(sessSecWeek)} em sessão
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500 uppercase">
                  Chamadas (timers)
                </p>
                <p className="text-lg font-semibold text-slate-900">
                  {callsWeek}
                </p>
                <p className="text-[11px] text-slate-500">
                  {formatMinutesFromSeconds(talkSecWeek)} em chamada
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pipeline do comercial */}
        <section className="rounded-2xl bg-white shadow-sm border border-slate-100 p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">
            Pipeline atual deste comercial
          </h2>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6 text-sm">
            {[
              ["NEW", newCount],
              ["CALL_LATER", callLaterCount],
              ["NO_ANSWER", noAnsCount],
              ["BOOKED", bookedCount],
              ["REFUSED", refusedCount],
              ["SKIP", skipCount],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-xl bg-slate-50/70 border border-slate-100 px-3 py-2"
              >
                <p className="text-[11px] text-slate-500 uppercase">
                  {label}
                </p>
                <p className="text-lg font-semibold text-slate-900">
                  {value as number}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Bookings recentes + registo de venda */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">
            Bookings deste comercial
          </h2>
          <p className="text-xs text-slate-500">
            Últimos 25 contactos em BOOKED atribuídos a {user.name}. A coluna
            de venda permite ligar cada reunião a um valor de negócio.
          </p>

          <div className="rounded-2xl overflow-hidden bg-white shadow-sm border border-slate-100">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3">Empresa</th>
                  <th className="px-4 py-3">Cidade</th>
                  <th className="px-4 py-3">Segmento</th>
                  <th className="px-4 py-3">Última chamada</th>
                  <th className="px-4 py-3">Nota</th>
                  {viewerRole === "ADMIN" && (
                    <th className="px-4 py-3">Venda (€)</th>
                  )}

                  {viewerRole === "ADMIN" && (
                    <th className="px-4 py-3 text-right">Ação</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {recentBookings.map((c) => {
                  const sale = salesMap.get(c.id) || null;
                  return (
                    <tr key={c.id} className="border-t border-slate-100">
                      <td className="px-4 py-3">{c.companyName}</td>
                      <td className="px-4 py-3">
                        {c.companyCity ?? "-"}
                      </td>
                      <td className="px-4 py-3">
                        {c.segmentKey ?? "-"}
                      </td>
                      <td className="px-4 py-3">
                        {c.lastCalledAt
                          ? new Date(c.lastCalledAt).toLocaleString(
                              "pt-PT",
                              {
                                dateStyle: "short",
                                timeStyle: "short",
                              }
                            )
                          : "-"}
                      </td>
                      {viewerRole === "ADMIN" && (
                        <td className="px-4 py-3">
                          {sale?.amount != null ? sale.amount.toFixed(2) : "–"}
                        </td>
                      )}

                    <td className="px-4 py-3">
                      <NoteViewer note={c.bookingNotes?.[0]?.content ?? null} />
                    </td>

                    {viewerRole === "ADMIN" && (
                      <td className="px-4 py-3 text-right flex items-center justify-end gap-2">
                        <AddNoteButton contactId={c.id} />
                        <SaleButton contactId={c.id} userId={user.id} initialAmount={sale?.amount ?? null} />
                      </td>
                    )}
                    </tr>
                  );
                })}
                {recentBookings.length === 0 && (
                  <tr>
                    <td
                      className="px-4 py-6 text-center text-slate-500"
                      colSpan={6}
                    >
                      Este comercial ainda não tem bookings registados.
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
