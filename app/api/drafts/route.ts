import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  // @ts-ignore augment user id via callback
  const userId = session?.user?.id as string | undefined;
  if (!userId) return NextResponse.json({ drafts: [] });
  const drafts = await prisma.draft.findMany({
    where: {
      userId,
      NOT: { status: "sent" },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ drafts });
}
