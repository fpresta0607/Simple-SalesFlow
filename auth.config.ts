import type { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    AzureADProvider({
      tenantId: "common", // multi-tenant
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      authorization: {
        params: {
          // Request Mail.Send by default so app can send immediately
          scope: "openid profile email offline_access User.Read Mail.Send",
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
    async redirect({ baseUrl }) {
      // Always send users to the main flow after auth
      return `${baseUrl}/upload`;
    },
  },
};
