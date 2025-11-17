"use client";

import Image from "next/image";
import { signIn } from "next-auth/react";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-white">
      {/* Coluna esquerda: logo + form */}
      <div className="flex items-center justify-center px-6 md:px-10">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="mb-8">
            <Image
              src="/logoDark2.png"
              alt="WebtoGO"
              width={150}
              height={40}
              priority
            />
          </div>

          {/* Título + subtítulo */}
          <h1 className="text-[28px] leading-snug font-semibold text-[#0e2a4a]">
            Bem-vindo de volta!
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Se não te lembras da tua conta, entra em contacto com um administrador.
          </p>

          {/* Formulário */}
          <form
            className="mt-8 space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              void signIn("credentials", {
                email,
                password,
                redirect: true,
                callbackUrl: "/redirect",
              });
            }}
          >
            {/* Email */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Email</label>
              <div className="relative">
                {/* ícone */}
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 opacity-70">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M4 6h16v12H4z" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                  </svg>
                </span>
                <input
                  type="email"
                  placeholder="Endereço de email"
                  className="w-full rounded-md border border-slate-300 bg-white px-10 py-2.5 text-[15px] outline-none focus:ring-2 focus:ring-[#00b8b8]"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Password</label>
              <div className="relative">
                {/* ícone */}
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 opacity-70">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="10" width="18" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M8 10V8a4 4 0 1 1 8 0v2" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                </span>
                <input
                  type="password"
                  placeholder="Password"
                  className="w-full rounded-md border border-slate-300 bg-white px-10 py-2.5 text-[15px] outline-none focus:ring-2 focus:ring-[#00b8b8]"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Botão */}
            <button
              type="submit"
              className="mt-2 w-full rounded-md bg-[#0e2a4a] px-4 py-2.5 text-white text-[15px] font-medium hover:opacity-95 transition"
            >
              Iniciar Sessão
            </button>
          </form>
        </div>
      </div>

      {/* Coluna direita: imagem + gradiente + copy */}
      <div className="relative hidden md:block">
        <Image
          src="/blueBG.png"
          alt=""
          fill
          className="object-cover"
          priority
        />
        {/* Overlay gradiente para chegar ao visual do mock */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a2a6b]/80 via-[#0a2a6b]/70 to-[#04265a]/90" />
        <div className="absolute inset-0 flex items-center">
          <div className="px-8 lg:px-16 text-white">
            <h2 className="text-3xl lg:text-4xl font-semibold tracking-tight">
              GOSALES – Smart Sales
            </h2>
            <p className="mt-2 text-lg opacity-90">
              Workbench de cold calling B2B.
            </p>
            <p className="mt-6 text-sm opacity-80">– App exclusiva WebtoGO</p>
          </div>
        </div>
      </div>
    </div>
  );
}
