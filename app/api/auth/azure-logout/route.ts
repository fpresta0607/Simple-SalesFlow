import { NextResponse } from "next/server";

export async function GET() {
  const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const tenant = process.env.AZURE_AD_TENANT_ID || "common";
  const url = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/logout?post_logout_redirect_uri=${encodeURIComponent(base + "/")}`;
  return NextResponse.redirect(url);
}
