import { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import bcrypt from "bcrypt";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },

  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(creds) {
        if (!creds?.email || !creds.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: creds.email },
        });

        if (!user) return null;

        const ok = await bcrypt.compare(creds.password, user.passwordHash);
        if (!ok) return null;

        // VERY IMPORTANT: return role from DB!
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role, // "ADMIN" | "MANAGER" | "ASSOCIATE"
        };
      },
    }),
  ],

  callbacks: {
    /**
     * Runs every time a JWT is created or updated
     */
    async jwt({ token, user }) {
      // When user logs in
      if (user) {
        token.role = (user as any).role;
        token.sub = (user as any).id.toString();
      }

      // On each request refresh the role from DB (prevents stale tokens)
      if (token.sub) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub as string },
          select: { role: true },
        });

        if (dbUser) {
          token.role = dbUser.role;
        }
      }

      return token;
    },

    /**
     * Runs every time client fetches /api/auth/session
     */
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub;
        (session.user as any).role = token.role; // accessible on frontend!
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
  },
};
