import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Inicio() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-[#0e2a4a]">Início</h1>
      <p className="text-slate-600 mt-2">Bem-vindo(a), {session.user?.name}.</p>
    </div>
  );
}
