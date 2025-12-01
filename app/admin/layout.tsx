// app/admin/layout.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminShell from "./shell";            // admin shell
import AssociateShell from "@/app/components/Shell"; // associate shell

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!session) redirect("/login");

  // Only ADMIN or MANAGER can access /admin/*
  if (!["ADMIN", "MANAGER"].includes(user?.role)) {
    redirect("/associate");
  }

  // ADMIN → use AdminShell
  if (user.role === "ADMIN") {
    return <AdminShell>{children}</AdminShell>;
  }

  // MANAGER → use AssociateShell (keep original UI)
  return <AssociateShell>{children}</AssociateShell>;
}
