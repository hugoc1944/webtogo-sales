// app/admin/page.tsx
import { prisma } from "@/lib/prisma";

export default async function AdminDashboard() {
  const [total, novo, callLater, noAns, booked, refused] = await prisma.$transaction([
    prisma.contact.count(),
    prisma.contact.count({ where: { state: "NEW" } }),
    prisma.contact.count({ where: { state: "CALL_LATER" } }),
    prisma.contact.count({ where: { state: "NO_ANSWER" } }),
    prisma.contact.count({ where: { state: "BOOKED" } }),
    prisma.contact.count({ where: { state: "REFUSED" } }),
  ]);

  const users = await prisma.user.findMany({ orderBy: { name: "asc" } });

  // Timers de hoje por utilizador (volume + duração total)
  const today = new Date(); today.setHours(0,0,0,0);
  const timers = await prisma.contactTimer.findMany({ where: { startedAt: { gte: today } } });
  const byUser: Record<string, {calls:number, secs:number}> = {};
  for (const t of timers) {
    byUser[t.userId] ??= { calls: 0, secs: 0 };
    byUser[t.userId].calls++;
    byUser[t.userId].secs += t.durationSec ?? 0;
  }

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0">
        <div className="relative min-h-screen">
          <div className="absolute inset-0 -z-10">
            {/* fundo */}
          </div>
        </div>
      </div>

      <div className="p-8">
        <h1 className="text-2xl font-bold mb-6">Dashboard (Admin)</h1>

        {/* Cards */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
          {[
            ["Total", total],
            ["Novos", novo],
            ["Call later", callLater],
            ["No answer", noAns],
            ["Agendados", booked],
            ["Recusados", refused],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-white shadow px-4 py-5">
              <div className="text-sm text-slate-500">{label}</div>
              <div className="text-2xl font-semibold">{value as number}</div>
            </div>
          ))}
        </div>

        {/* Tabela por comercial (hoje) */}
        <h2 className="text-xl font-semibold mt-10 mb-4">Atividade de hoje por comercial</h2>
        <div className="rounded-xl overflow-hidden bg-white shadow">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-3">Nome</th>
                <th className="text-left px-4 py-3">Chamadas (timers)</th>
                <th className="text-left px-4 py-3">Duração total</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const m = byUser[u.id] ?? { calls: 0, secs: 0 };
                const mm = Math.floor(m.secs/60).toString().padStart(2,"0");
                const ss = (m.secs%60).toString().padStart(2,"0");
                return (
                  <tr key={u.id} className="border-t">
                    <td className="px-4 py-3">{u.name}</td>
                    <td className="px-4 py-3">{m.calls}</td>
                    <td className="px-4 py-3">{mm}:{ss}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
