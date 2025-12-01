// lib/roles.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

/**
 * Retorna a role atual do session.user (string) ou null
 */
export async function getViewerRole() {
  const session = await getServerSession(authOptions);
  return (session?.user as any)?.role ?? null;
}

/**
 * Requer admin — redireciona para /login se não houver sessão
 * ou 403 (redirect) se não for admin.
 */
export async function requireAdminOrRedirect() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const role = (session.user as any).role as string;
  if (role !== "ADMIN") redirect("/login"); // ou podes redirect para /unauthorized
  return session;
}

/**
 * Requer pelo menos Manager (Admin ou Manager)
 */
export async function requireAtLeastManagerOrRedirect() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const role = (session.user as any).role as string;
  if (role !== "ADMIN" && role !== "MANAGER") redirect("/login");
  return session;
}

/**
 * Utility para ocultar campos sensíveis (earnings) quando viewerRole !== "ADMIN"
 */
export function hideFinancialsIfNeeded<T extends Record<string, any>>(
  payload: T,
  viewerRole: string | null
): T {
  if (viewerRole === "ADMIN") return payload;
  const copy = { ...payload };
  // campos típicos a remover — ajusta conforme o teu schema
  delete (copy as any).earnings;
  delete (copy as any).revenue;
  delete (copy as any).amount;
  delete (copy as any).sum;
  delete (copy as any).salary;
  return copy;
}
