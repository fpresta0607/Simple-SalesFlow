import { getServerSession } from "next-auth";
import type { NextAuthOptions } from "next-auth";
import { authOptions } from "@/auth.config";

export const getSession = () => getServerSession(authOptions as NextAuthOptions);
