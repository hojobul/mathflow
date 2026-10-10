import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { LibraryEntryType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionAppUser } from "@/lib/auth/currentUser";

const Body = z.object({
  type: z.enum([LibraryEntryType.SCRAP, LibraryEntryType.CONCEPT_ALBUM]).default(LibraryEntryType.SCRAP),
});

/** POST /api/content/:id/scrap — toggle 스크랩북 / 개념 앨범 (로그인 필요). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: contentId } = await params;
  const user = await getSessionAppUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { type } = parsed.data;

  const exists = await prisma.content.findUnique({ where: { id: contentId }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "content not found" }, { status: 404 });

  const where = { userId_contentId_type: { userId: user.id, contentId, type } };
  const existing = await prisma.libraryEntry.findUnique({ where });
  if (existing) {
    await prisma.libraryEntry.delete({ where });
    return NextResponse.json({ saved: false });
  }
  await prisma.libraryEntry.create({ data: { userId: user.id, contentId, type } });
  return NextResponse.json({ saved: true });
}
