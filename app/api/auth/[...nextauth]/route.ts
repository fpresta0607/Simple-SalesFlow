import NextAuth from "next-auth";
import { authOptions } from "@/auth.config";


const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
export const runtime = "nodejs"; // Prisma requires Node runtime (not Edge)

