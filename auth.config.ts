import type { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  
  adapter: PrismaAdapter(prisma),
  debug: false,
  logger: {
    error: (...args) => console.error("[next-auth][error]", ...args),
    warn: (...args) => console.warn("[next-auth][warn]", ...args),
    debug: (...args) => console.log("[next-auth][debug]", ...args),
  },
  providers: [
    AzureADProvider({
      tenantId: "common", // multi-tenant
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      authorization: {
        params: {
          // Minimal scopes to avoid admin consent issues; add Mail.Send later after consent
          scope: "openid profile email offline_access User.Read",
          // prompt: "consent", // uncomment to always force consent during tests
        },
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, account, profile, user }) {
      // Persist user id for convenience
      if (user?.id) (token as any).userId = user.id;
      if (account?.access_token) {
        (token as any).accessToken = account.access_token;
        (token as any).refreshToken = account.refresh_token;
        const expiresInSec = Number(account.expires_in ?? 3600);
        (token as any).expiresAt = Date.now() + expiresInSec * 1000;
      }
      if (profile && (profile as any).tid) (token as any).tenantId = (profile as any).tid;
      return token;
    },
    async session({ session, token }) {
      // Attach user id and Azure tokens to session
      if (session.user) {
        // @ts-ignore augment id
        session.user.id = (token as any).userId ?? session.user.id;
      }
      (session as any).accessToken = (token as any).accessToken;
      (session as any).tenantId = (token as any).tenantId;
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Preserve provided callbackUrl when safe (relative or same-origin); fallback to root
      try {
        if (url.startsWith("/")) return url;
        const u = new URL(url);
        if (u.origin === baseUrl) return u.pathname + u.search + u.hash;
      } catch {}
      return "/";
    },
  },
};
