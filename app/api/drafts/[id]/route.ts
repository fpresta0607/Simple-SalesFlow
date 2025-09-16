import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  // @ts-ignore augment user id via callback
  const userId = session?.user?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { subject, body: content } = body as { subject?: string; body?: string };
  await prisma.draft.update({ where: { id: params.id }, data: { subject: subject ?? undefined, body: content ?? undefined } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  // @ts-ignore augment user id via callback
  const userId = session?.user?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Ensure draft belongs to user
  const draft = await prisma.draft.findUnique({ where: { id: params.id } });
  if (!draft || draft.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await prisma.draft.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
