import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isValidEmail, DAILY_CAP } from "@/lib/email";
import { Resend } from "resend";

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

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.EMAIL_FROM || "no-reply@example.com";

  const results: Array<{ id: string; status: string; error?: string }> = [];
  let used = sentCountToday;
  for (const d of drafts) {
    if (used >= DAILY_CAP) {
      results.push({ id: d.id, status: "skipped", error: "Daily cap reached" });
      continue;
    }
    if (!isValidEmail(d.contactEmail)) {
      results.push({ id: d.id, status: "failed", error: "Invalid email" });
      continue;
    }
    try {
      await resend.emails.send({
        from,
        to: d.contactEmail,
        subject: d.subject,
        html: d.body.replace(/\n/g, "<br/>")
      });
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
      results.push({ id: d.id, status: "sent" });
    } catch (e: any) {
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
      results.push({ id: d.id, status: "failed", error: e?.message || "unknown" });
    }
  }

  return NextResponse.json({ results });
}
