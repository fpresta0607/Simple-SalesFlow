import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  // Accept either:
  // - Authorization: Bearer <CRON_SECRET> (for manual invocations)
  // - x-vercel-cron header (present on Vercel scheduled executions)
  const auth = req.headers.get("authorization");
  const isBearerOk = !!process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`;
  const isVercelCron = req.headers.has("x-vercel-cron");
  if (!isBearerOk && !isVercelCron) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  try {
    // A) drop expired 30-day cooldowns
    const sup = await prisma.suppression.deleteMany({
      where: { expiresAt: { lt: now } },
    });

    // (optional) B) trim old logs (>35 days)
    const cut = new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000);
    const logs = await prisma.emailLog.deleteMany({
      where: { createdAt: { lt: cut } },
    });

    // (optional) C) purge already-sent drafts if you defer deletion
    // await prisma.draft.deleteMany({ where: { status: "sent", sentAt: { lt: new Date(now.getTime() - 24*60*60*1000) } } });

    return NextResponse.json({
      ok: true,
      deletedSuppression: sup.count,
      deletedLogs: logs.count,
      at: now.toISOString(),
    });
  } catch (e) {
    console.error("Cleanup cron failed", e);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
