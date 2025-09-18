import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Always allow these paths
  const PUBLIC_PATHS = [
    "/login",
    "/api/auth", // next-auth internal
    "/favicon.ico",
    "/robots.txt",
    "/sitemap.xml",
    "/.well-known", // optional: allow OIDC discovery or related files
  ];

  const startsWithPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const isNext = pathname.startsWith("/_next/") || pathname.startsWith("/static/") || pathname.startsWith("/images/");

  if (startsWithPublic || isNext) {
    // If user is already logged in and hits /login, bounce to /
    if (pathname === "/login") {
      const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
      if (token) {
        const url = req.nextUrl.clone();
        url.pathname = "/";
        url.search = "";
        return NextResponse.redirect(url);
      }
    }
    return NextResponse.next();
  }

  // Protected: require session (JWT)
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    // send to /login with callbackUrl so we can return here after auth
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?callbackUrl=${encodeURIComponent(pathname + (search || ""))}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Protect everything except the allowlist above
export const config = {
  matcher: ["/((?!_next/|static/|images/|favicon.ico|robots.txt|sitemap.xml|\.well-known).*)"],
};
