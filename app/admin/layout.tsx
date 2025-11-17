// app/admin/layout.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminShell from "./shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!session) redirect("/login");
  if (user?.role !== "ADMIN") redirect("/associate");

  return <AdminShell>{children}</AdminShell>;
}
