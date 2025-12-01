// app/admin/comerciais/page.tsx
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getViewerRole } from "@/lib/roles";

function formatMinutesFromSeconds(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  if (hh > 0) return `${hh}h ${mm.toString().padStart(2, "0")}m`;
  return `${mm}m ${s.toString().padStart(2, "0")}s`;
}

export default async function Comerciais() {
  const session: any = await getServerSession(authOptions);
  const userSession = session?.user as any;

  if (!session || !["ADMIN", "MANAGER"].includes(userSession.role)) {
    redirect("/login");
  }
  const viewerRole = userSession.role;
  
  const now = new Date();
  const since7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const associates = await prisma.user.findMany({
    where: { role: "ASSOCIATE" },
    select: { id: true, name: true, email: true },
  });

  // For ADMIN: include revenue sums
  // For MANAGER: return "safe" structure with { count: X, sum: null }
  const salesMonthPromise =
    viewerRole === "ADMIN"
      ? prisma.sale.groupBy({
          by: ["userId"],
          where: { createdAt: { gte: monthStart } },
          _count: { _all: true },
          _sum: { amount: true },
        })
      : Promise.resolve([] as any[]); // empty result for managers

  const [
    sessions7,
    timers7,
    contactsWorked,
    bookings7,
    salesMonth,
    pendentes
  ] = await Promise.all([
    prisma.callSession.findMany({
      where: { startedAt: { gte: since7 } },
      select: { userId: true, durationSec: true },
    }),
    prisma.contactTimer.findMany({
      where: { startedAt: { gte: since7 } },
      select: { userId: true, durationSec: true },
    }),
    prisma.contact.groupBy({
      by: ["assignedToId"],
      where: {
        assignedToId: { not: null },
        lastCalledAt: { gte: since7 },
        state: { notIn: ["NEW", "NO_ANSWER"] },
      },
      _count: { _all: true },
    }),
    prisma.contact.groupBy({
      by: ["assignedToId"],
      where: {
        assignedToId: { not: null },
        lastCalledAt: { gte: since7 },
        state: "BOOKED",
      },
      _count: { _all: true },
    }),
    salesMonthPromise,
    prisma.contact.groupBy({
      by: ["assignedToId"],
      where: { state: "CALL_LATER", assignedToId: { not: null } },
      _count: { _all: true },
    }),
  ]);

  const sessionsMap = new Map<
    string,
    { sessions: number; secs: number }
  >();
  for (const s of sessions7) {
    const m = sessionsMap.get(s.userId) ?? { sessions: 0, secs: 0 };
    m.sessions += 1;
    m.secs += s.durationSec ?? 0;
    sessionsMap.set(s.userId, m);
  }

  const timersMap = new Map<string, { calls: number; secs: number }>();
  for (const t of timers7) {
    const m = timersMap.get(t.userId) ?? { calls: 0, secs: 0 };
    m.calls += 1;
    m.secs += t.durationSec ?? 0;
    timersMap.set(t.userId, m);
  }

  const contactsMap = new Map<string, number>(
    contactsWorked.map((c) => [c.assignedToId!, c._count._all])
  );
  const bookingsMap = new Map<string, number>(
    bookings7.map((b) => [b.assignedToId!, b._count._all])
  );
  const salesMap = new Map<
    string,
    { count: number; sum: number | null }
  >(
    salesMonth.map((s) => [
      s.userId,
      { count: s._count._all, sum: s._sum.amount ?? null },
    ])
  );
  const pendentesMap = new Map<string, number>(
    pendentes.map((p) => [p.assignedToId!, p._count._all])
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        <header className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Comerciais & performance
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Visão dos últimos 7 dias de atividade, bookings e vendas do mês
              por comercial.
            </p>
          </div>
        </header>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50/80 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3">Comercial</th>
                <th className="px-4 py-3">Sessões (7d)</th>
                <th className="px-4 py-3">Tempo em sessão (7d)</th>
                <th className="px-4 py-3">Tempo em chamadas (7d)</th>
                <th className="px-4 py-3">Contactos trabalhados (7d)</th>
                <th className="px-4 py-3">Bookings (7d)</th>
                <th className="px-4 py-3">Vendas mês</th>
                {viewerRole === "ADMIN" && (
                  <th className="px-4 py-3">Receita mês (€)</th>
                )}                
                <th className="px-4 py-3">Pendentes</th>
                <th className="px-4 py-3 text-right">Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {associates.map((u) => {
                const sess = sessionsMap.get(u.id) ?? {
                  sessions: 0,
                  secs: 0,
                };
                const timers = timersMap.get(u.id) ?? { calls: 0, secs: 0 };
                const worked = contactsMap.get(u.id) ?? 0;
                const booked = bookingsMap.get(u.id) ?? 0;
                const sales = salesMap.get(u.id) ?? {
                  count: 0,
                  sum: null,
                };
                const pend = pendentesMap.get(u.id) ?? 0;
                const conv =
                  worked > 0 ? ((booked / worked) * 100).toFixed(1) : "–";

                return (
                  <tr key={u.id} className="border-t border-slate-100">
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
                    <td className="px-4 py-3">{sess.sessions}</td>
                    <td className="px-4 py-3">
                      {sess.secs ? formatMinutesFromSeconds(sess.secs) : "–"}
                    </td>
                    <td className="px-4 py-3">
                      {timers.secs
                        ? formatMinutesFromSeconds(timers.secs)
                        : "–"}
                    </td>
                    <td className="px-4 py-3">{worked}</td>
                    <td className="px-4 py-3">
                      {booked}
                      {worked > 0 && (
                        <span className="ml-1 text-xs text-slate-500">
                          ({conv}%)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">{sales.count}</td>
                    {viewerRole === "ADMIN" ? (
                      <td className="px-4 py-3">
                        {sales.sum != null ? sales.sum.toFixed(2) : "–"}
                      </td>
                    ) : null}
                    <td className="px-4 py-3">{pend}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/comerciais/${u.id}`}
                        className="inline-flex items-center rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Ver detalhes
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {associates.length === 0 && (
                <tr>
                  <td
                    className="px-4 py-6 text-center text-slate-500"
                    colSpan={10}
                  >
                    Sem comerciais associados ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
