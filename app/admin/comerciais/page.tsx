import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Comerciais() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") redirect("/login");

  // últimos 7 dias
  const since = new Date(Date.now() - 7*24*60*60*1000);

  const users = await prisma.user.findMany({
    where: { role: "ASSOCIATE" },
    select: {
      id: true,
      name: true,
      email: true,
      contactTimers: {
        where: { startedAt: { gte: since } },
        select: { durationSec: true },
      },
      sessions: {
        where: { startedAt: { gte: since } },
        select: { durationSec: true, id: true },
      },
    },
  });

  // contagens por estado (CALL_LATER = atribuídos)
  const pendentes = await prisma.contact.groupBy({
    by: ["assignedToId"],
    where: { state: "CALL_LATER", assignedToId: { not: null } },
    _count: { _all: true }
  });

  const pendentesMap = new Map(pendentes.map(p => [p.assignedToId!, p._count._all]));

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-[#0e2a4a] mb-6">Comerciais (últimos 7 dias)</h1>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="px-4 py-2">Comercial</th>
              <th className="px-4 py-2">Sessões</th>
              <th className="px-4 py-2">Tempo em sessão</th>
              <th className="px-4 py-2">Tempo c/ contactos</th>
              <th className="px-4 py-2">Pendentes atribuídos</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => {
              const totalSess = u.sessions.length;
              const tempoSess = u.sessions.reduce((s, x) => s + (x.durationSec ?? 0), 0);
              const tempoCalls = u.contactTimers.reduce((s, x) => s + (x.durationSec ?? 0), 0);
              const pend = pendentesMap.get(u.id) ?? 0;

              const fmt = (sec: number) => {
                const m = Math.floor(sec/60).toString().padStart(2,"0");
                const s = Math.floor(sec%60).toString().padStart(2,"0");
                return `${m}:${s}`;
              };

              return (
                <tr key={u.id} className="border-t">
                  <td className="px-4 py-2">{u.name} <span className="text-slate-500">({u.email})</span></td>
                  <td className="px-4 py-2">{totalSess}</td>
                  <td className="px-4 py-2">{fmt(tempoSess)}</td>
                  <td className="px-4 py-2">{fmt(tempoCalls)}</td>
                  <td className="px-4 py-2">{pend}</td>
                </tr>
              );
            })}
            {users.length === 0 && (
              <tr><td className="px-4 py-6 text-slate-500" colSpan={5}>Sem comerciais.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
