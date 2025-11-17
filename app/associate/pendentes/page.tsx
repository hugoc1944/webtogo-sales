import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import NoteViewer from "./NoteViewer";

export default async function Pendentes() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const userId = (session.user as any).id as string;

  const rows = await prisma.contact.findMany({
    where: { state: "CALL_LATER", assignedToId: userId },
    orderBy: { callLaterAt: "desc" },
    select: {
      id: true,
      companyName: true,  
      firstName: true,
      lastName: true,
      title: true,        
      email: true,
      callNote: true,
      callLaterAt: true,
    },
  });

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-[#0e2a4a] mb-4">Pendentes</h1>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="px-4 py-2">Nome</th>
              <th className="px-4 py-2">Empresa</th> {/* 👈 NOVA coluna */}
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Notas</th>
              <th className="px-4 py-2">Último contacto</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-4 py-2">
                  {[r.firstName, r.lastName].filter(Boolean).join(" ") || "-"}
                  {r.title ? ` - ${r.title}` : ""}
                </td>
                <td className="px-4 py-2">{r.companyName || "-"}</td> {/* 👈 valor */}
                <td className="px-4 py-2">{r.email || "-"}</td>
                <td className="px-4 py-2 align-top">
                  <NoteViewer note={r.callNote} />
                </td>
                <td className="px-4 py-2">
                  {r.callLaterAt
                    ? new Date(r.callLaterAt).toLocaleDateString("pt-PT")
                    : "-"}
                </td>
                <td className="px-4 py-2">
                  <Link
                    href={`/associate/contato/${r.id}`}
                    className="rounded-md bg-[#0e2a4a] text-white px-3 py-1.5"
                  >
                    Contactar
                  </Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-slate-500" colSpan={6}>
                  Sem pendentes.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
