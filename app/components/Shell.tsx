// app/components/Shell.tsx
"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import clsx from "clsx";

const items = [
  { href: "/associate", label: "Início", icon: HomeIcon },
  { href: "/associate/nova-sessao", label: "Nova sessão", icon: CallIcon },
  { href: "/associate/pendentes", label: "Pendentes", icon: ClockIcon },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user as any;

  return (
    <div className="h-screen grid grid-cols-[220px_1fr]">
      {/* Lateral fixa a 100vh */}
      <aside className="relative h-full text-white">
        <Image src="/blueBG.png" alt="" fill className="object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a2a6b]/90 to-[#04265a]/95" />
        <div className="relative p-6 h-full flex flex-col">
          <div className="mb-8">
            <Image src="/logoLight2.png" alt="WebtoGO" width={140} height={36} />
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
                <Icon />
                {label}
              </Link>
            ))}
          </nav>

          <div className="mt-auto pt-6 border-t border-white/10 text-sm">
            <div className="opacity-90 mb-3">
              <div className="font-semibold">{user?.name ?? "-"}</div>
              <div className="text-white/70">{user?.email ?? ""}</div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="rounded-md bg-white/10 px-3 py-2 w-full text-left hover:bg-white/15 transition"
            >
              Terminar sessão
            </button>
          </div>
        </div>
      </aside>

      {/* Content: ocupa 100vh e é o único que scrolla */}
      <main className="relative h-full overflow-y-auto bg-slate-50">
        {children}
      </main>
    </div>
  );
}

function HomeIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      className="shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5 10.5V20h14v-9.5" />
    </svg>
  );
}
function CallIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      className="shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <path d="M22 16.92v2a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07A19.5 19.5 0 0 1 3.15 9.81 19.8 19.8 0 0 1 .08 1.18 2 2 0 0 1 2.06 0h2a2 2 0 0 1 2 1.72c.12.9.32 1.78.6 2.63a2 2 0 0 1-.45 2.11L5.2 7.67a16 16 0 0 0 6.13 6.13l1.21-1.01a2 2 0 0 1 2.11-.45c.85.28 1.73.48 2.63.6A2 2 0 0 1 22 16.92Z" />
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      className="shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  );
}
