import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/", "/login", "/api/auth", "/api/auth/signin", "/api/auth/callback/google", "/api/upload"]; // allow upload pre-auth for MVP? remove if needed

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // Allow next-auth and static
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p)) || pathname.startsWith("/_next") || pathname.startsWith("/static")) {
    return NextResponse.next();
  }
  const hasSession = req.cookies.get("next-auth.session-token") || req.cookies.get("__Secure-next-auth.session-token");
  if (!hasSession) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname + (req.nextUrl.search || ""));
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|static|favicon.ico|api/auth).*)"],
};
