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
  const senderEmail: string | undefined = (session.user as any)?.email || undefined;
  const senderDomain: string | undefined = senderEmail?.includes("@") ? senderEmail.split("@")[1].toLowerCase() : undefined;
  const GLOBAL_SUPPRESS_KEY = "all"; // key used for global scope entries
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
    // Normalize recipient email to lowercase for suppression matching
    const recipient = d.contactEmail.toLowerCase();
    // Suppression check: block if active at user, domain, or global scope
    const now = new Date();
    const scopeFilters: any[] = [
      { scope: "user", key: (session.user as any).id },
    ];
    if (senderDomain) scopeFilters.push({ scope: "domain", key: senderDomain });
    scopeFilters.push({ scope: "global", key: GLOBAL_SUPPRESS_KEY });
    // Find any suppression at user/domain/global for this email; filter expiration in JS
    const suppression = await (prisma as any).suppression.findFirst({
      where: { email: recipient, OR: scopeFilters },
    });
    const isSuppressed = !!suppression && (!suppression.expiresAt || new Date(suppression.expiresAt) > now);
    if (isSuppressed) {
      // For display, also fetch last sent time if any
      const lastSent = await prisma.emailLog.findFirst({
        where: {
          // @ts-ignore id augmented
          userId: session.user.id,
          toEmail: recipient,
          status: "sent",
        },
        orderBy: { createdAt: "desc" },
      });
      results.push({
        id: d.id,
        status: "skipped",
        error: "Suppressed by rule",
        name: contactName || undefined,
        email: recipient,
        lastEmailedAt: lastSent?.createdAt?.toISOString(),
        suppressionUntil: suppression.expiresAt ? suppression.expiresAt.toISOString() : undefined,
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
            { emailAddress: { address: recipient } }
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
      // After a successful send, perform logging, one suppression (domain-preferred), and delete the draft in a transaction
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const suppressionOp = senderDomain
        ? (prisma as any).suppression.upsert({
            where: { scope_key_email: { scope: "domain", key: senderDomain, email: recipient } },
            update: { reason: "cooldown", expiresAt },
            create: { scope: "domain", key: senderDomain, email: recipient, reason: "cooldown", expiresAt },
          })
        : (prisma as any).suppression.upsert({
            where: { scope_key_email: { scope: "user", key: (session.user as any).id, email: recipient } },
            update: { reason: "cooldown", expiresAt },
            create: { scope: "user", key: (session.user as any).id, email: recipient, reason: "cooldown", expiresAt },
          });

      await prisma.$transaction([
        prisma.emailLog.create({
          data: {
            // @ts-ignore id augmented
            userId: session.user.id,
            draftId: d.id,
            toEmail: recipient,
            subject: d.subject,
            status: "sent",
          },
        }),
        suppressionOp,
        prisma.draft.delete({ where: { id: d.id } }),
      ]);
      results.push({ id: d.id, status: "sent", name: contactName || undefined, email: recipient, lastEmailedAt: new Date().toISOString(), suppressionUntil: expiresAt.toISOString() });
    } catch (e: any) {
      // Find last sent time if any (for display)
      const lastSent = await prisma.emailLog.findFirst({
        where: {
          // @ts-ignore id augmented
          userId: session.user.id,
          toEmail: d.contactEmail.toLowerCase(),
          status: "sent",
        },
        orderBy: { createdAt: "desc" },
      });
      await prisma.emailLog.create({
        data: {
          // @ts-ignore id augmented
          userId: session.user.id,
          draftId: d.id,
          toEmail: d.contactEmail.toLowerCase(),
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
