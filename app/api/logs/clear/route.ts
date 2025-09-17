import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await getSession();
  // @ts-ignore user id augmented via next-auth.d.ts
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as {
      to?: string;
      olderThanDays?: number;
    };

    const where: any = { userId: session.user.id };
    if (body.to) {
      where.toEmail = body.to;
    }
    if (typeof body.olderThanDays === "number" && body.olderThanDays > 0) {
      const ms = body.olderThanDays * 24 * 60 * 60 * 1000;
      where.createdAt = { lt: new Date(Date.now() - ms) };
    }

    const result = await prisma.emailLog.deleteMany({ where });
    return NextResponse.json({ deleted: result.count });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to clear logs" }, { status: 500 });
  }
}
