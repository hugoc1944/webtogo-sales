// app/page.tsx
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function Home() {
  const session = await getServerSession(authOptions);

  // Not logged in → go to login
  if (!session) {
    redirect("/login");
  }

  const user = session.user as any;
  const role = user?.role;

  // Admin → admin dashboard
  if (role === "ADMIN") {
    redirect("/admin");
  }

  // Default → associate dashboard
  redirect("/associate");
}
