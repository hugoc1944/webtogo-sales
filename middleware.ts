// middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  // Lê o JWT da sessão (precisa do NEXTAUTH_SECRET no .env)
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // Se não houver sessão, redireciona para /login
  if (!token) {
    // Para API protegida, devolve 401
    if (req.nextUrl.pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    // opcional: volta à página de origem depois de login
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  // Sessão válida → continua
  return NextResponse.next();
}

// Rotas protegidas
export const config = {
  matcher: ["/associate/:path*", "/admin/:path*"],
};
