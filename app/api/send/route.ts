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

  const results: Array<{ id: string; status: string; error?: string; name?: string; email?: string; lastEmailedAt?: string; suppressionUntil?: string }> = [];
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
    // Suppression check: skip if there is a non-expired suppression for this recipient
    const suppression = await prisma.suppression.findUnique({
      where: {
        userId_toEmail: {
          // @ts-ignore id augmented
          userId: session.user.id,
          toEmail: d.contactEmail,
        },
      },
    });
    const now = new Date();
    if (suppression && suppression.expiresAt > now) {
      // For display, also fetch last sent time if any
      const lastSent = await prisma.emailLog.findFirst({
        where: {
          // @ts-ignore id augmented
          userId: session.user.id,
          toEmail: d.contactEmail,
          status: "sent",
        },
        orderBy: { createdAt: "desc" },
      });
      results.push({
        id: d.id,
        status: "skipped",
        error: "Suppressed by rule",
        name: contactName || undefined,
        email: d.contactEmail,
        lastEmailedAt: lastSent?.createdAt?.toISOString(),
        suppressionUntil: suppression.expiresAt.toISOString(),
      });
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
      // Delete the draft immediately after successful send
      try {
        await prisma.draft.delete({ where: { id: d.id } });
      } catch {}
      // Upsert suppression for 30 days from now
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await prisma.suppression.upsert({
        where: {
          userId_toEmail: {
            // @ts-ignore id augmented
            userId: session.user.id,
            toEmail: d.contactEmail,
          },
        },
        create: {
          // @ts-ignore id augmented
          userId: session.user.id,
          toEmail: d.contactEmail,
          expiresAt,
        },
        update: { expiresAt },
      });
      results.push({ id: d.id, status: "sent", name: contactName || undefined, email: d.contactEmail, lastEmailedAt: new Date().toISOString(), suppressionUntil: expiresAt.toISOString() });
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
