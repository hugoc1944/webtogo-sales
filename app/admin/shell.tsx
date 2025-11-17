// app/admin/shell.tsx
"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import clsx from "clsx";

const items = [
  { href: "/admin", label: "Dashboard", icon: HomeIcon },
    { href: "/admin/comerciais", label: "Comerciais", icon: UsersIcon },
  { href: "/admin/contacts", label: "Contactos", icon: UsersIcon },
  { href: "/admin/importar", label: "Importar CSV", icon: UploadIcon },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen grid grid-cols-[240px_1fr]">
      <aside className="relative text-white">
        <Image src="/blueBG.png" alt="" fill className="object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a2a6b]/90 to-[#04265a]/95" />
        <div className="relative p-6 h-full flex flex-col">
          <div className="mb-8">
            <Image src="/logoLight2.png" alt="WebtoGO" width={160} height={40} />
          </div>
          <nav className="space-y-3">
            {items.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={clsx(
                  "flex items-center gap-3 text-[15px] opacity-90 transition-all duration-200 hover:opacity-100 hover:translate-x-[2px]",
                  pathname === href && "font-semibold opacity-100"
                )}
              >
                <Icon /> {label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto pt-6 border-t border-white/10">
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="rounded-md bg-white/10 px-3 py-2 w-full text-left hover:bg-white/15 transition"
            >
              Terminar sessão
            </button>
          </div>
        </div>
      </aside>
      <main>{children}</main>
    </div>
  );
}

// Ícones mínimos (ou usa os que já tens)
function HomeIcon() { return <span className="inline-block w-4 h-4">🏠</span>; }
function UsersIcon() { return <span className="inline-block w-4 h-4">👥</span>; }
function UploadIcon() { return <span className="inline-block w-4 h-4">⭳</span>; }
