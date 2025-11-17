import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ClientContact from "./view"; // ajusta se o ficheiro do cliente tiver outro nome

export default async function Contacto({
  params,
}: {
  params: Promise<{ id: string }>; // 👈 params é Promise no Next 15
}) {
  const { id } = await params;     // 👈 await params

  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const c = await prisma.contact.findUnique({ where: { id } });
  if (!c) return redirect("/associate/pendentes");

  return <ClientContact contact={c} userId={(session.user as any).id} />;
}
