import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { refreshAzureToken } from "@/lib/refreshAzureToken";
import { isValidEmail, DAILY_CAP } from "@/lib/email";

export async function POST(req: NextRequest) {
  const session = await getSession();
  // @ts-ignore user id augmented via next-auth.d.ts
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { draftIds } = (await req.json()) as { draftIds: string[] };
  if (!draftIds?.length) {
    return NextResponse.json({ error: "No drafts provided" }, { status: 400 });
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const sentCountToday = await prisma.emailLog.count({
    // @ts-ignore user id augmented
    where: { userId: session.user.id, createdAt: { gte: todayStart } },
  });
  if (sentCountToday >= DAILY_CAP) {
    return NextResponse.json({ error: "Daily cap reached" }, { status: 429 });
  }

  const drafts = await prisma.draft.findMany({
    // @ts-ignore user id augmented
    where: { id: { in: draftIds }, userId: session.user.id },
  });

  // Use the signed-in user's mailbox via Microsoft Graph
  let accessToken = (session as any).accessToken as string | undefined;
  if (!accessToken) {
    return NextResponse.json({ error: "Missing access token. Enable 'Send from my mailbox' to grant Mail.Send." }, { status: 403 });
  }

  const results: Array<{ id: string; status: string; error?: string; name?: string; email?: string; lastEmailedAt?: string }> = [];
  let used = sentCountToday;
  for (const d of drafts) {
    const contactName = [d.contactFirstName, d.contactLastName].filter(Boolean).join(" ").trim();
    if (used >= DAILY_CAP) {
      results.push({ id: d.id, status: "skipped", error: "Daily cap reached", name: contactName || undefined, email: d.contactEmail });
      continue;
    }
    if (!isValidEmail(d.contactEmail)) {
      results.push({ id: d.id, status: "failed", error: "Invalid email", name: contactName || undefined, email: d.contactEmail });
      continue;
    }
    // 30-day suppression: skip if emailed in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentlyEmailed = await prisma.emailLog.findFirst({
      where: {
        // @ts-ignore id augmented
        userId: session.user.id,
        toEmail: d.contactEmail,
        status: "sent",
        createdAt: { gte: thirtyDaysAgo },
      },
      orderBy: { createdAt: "desc" },
    });
    if (recentlyEmailed) {
      results.push({ id: d.id, status: "skipped", error: "Suppressed: emailed within 30 days", name: contactName || undefined, email: d.contactEmail, lastEmailedAt: recentlyEmailed.createdAt.toISOString() });
      continue;
    }
    try {
      const message = {
        message: {
          subject: d.subject,
          body: {
            contentType: "HTML",
            content: d.body.replace(/\n/g, "<br/>")
          },
          toRecipients: [
            { emailAddress: { address: d.contactEmail } }
          ],
        },
        saveToSentItems: true,
      };

      let graphRes = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
      });
      // If unauthorized (token expired), try to refresh once and retry
      if (graphRes.status === 401) {
        try {
          // Attempt to read refreshToken from the NextAuth JWT cookie
          // Note: If not available, user must re-consent/login to refresh
          const { getToken } = await import("next-auth/jwt");
          const token = await getToken({
            // @ts-ignore - NextRequest has headers/cookies compatible
            req,
            secret: process.env.NEXTAUTH_SECRET,
          });
          const refreshed = token?.refreshToken
            ? await refreshAzureToken({
                refreshToken: String(token.refreshToken),
                clientId: process.env.AZURE_AD_CLIENT_ID!,
                clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
              })
            : null;
          if (refreshed?.accessToken) {
            accessToken = refreshed.accessToken;
            graphRes = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(message),
            });
          }
        } catch (e) {
          // ignore and fallthrough to error handling
        }
      }
      if (!graphRes.ok) {
        const errText = await graphRes.text();
        throw new Error(`Graph error ${graphRes.status}: ${errText}`);
      }
      used++;
      await prisma.emailLog.create({
        data: {
          // @ts-ignore id augmented
          userId: session.user.id,
          draftId: d.id,
          toEmail: d.contactEmail,
          subject: d.subject,
          status: "sent",
        },
      });
      await prisma.draft.update({ where: { id: d.id }, data: { status: "sent", sentAt: new Date() } });
      results.push({ id: d.id, status: "sent", name: contactName || undefined, email: d.contactEmail, lastEmailedAt: new Date().toISOString() });
    } catch (e: any) {
      // Find last sent time if any (for display)
      const lastSent = await prisma.emailLog.findFirst({
        where: {
          // @ts-ignore id augmented
          userId: session.user.id,
          toEmail: d.contactEmail,
          status: "sent",
        },
        orderBy: { createdAt: "desc" },
      });
      await prisma.emailLog.create({
        data: {
          // @ts-ignore id augmented
          userId: session.user.id,
          draftId: d.id,
          toEmail: d.contactEmail,
          subject: d.subject,
          status: "failed",
          error: e?.message || String(e),
        },
      });
      await prisma.draft.update({ where: { id: d.id }, data: { status: "failed" } });
      results.push({ id: d.id, status: "failed", error: e?.message || "unknown", name: contactName || undefined, email: d.contactEmail, lastEmailedAt: lastSent?.createdAt?.toISOString() });
    }
  }

  return NextResponse.json({ results });
}
