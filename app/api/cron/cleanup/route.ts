import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get("x-cron-secret");
  if (!secret || header !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const now = new Date();
  const res = await prisma.suppression.deleteMany({ where: { expiresAt: { lt: now } } });
  return NextResponse.json({ deleted: res.count, at: now.toISOString() });
}
