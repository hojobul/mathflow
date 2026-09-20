import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionAppUser } from "@/lib/auth/currentUser";

/** GET /api/content/:id/comments — oldest first (thread reading order). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: contentId } = await params;
  const comments = await prisma.comment.findMany({
    where: { contentId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      body: true,
      createdAt: true,
      author: { select: { id: true, displayName: true, avatarUrl: true } },
    },
  });
  return NextResponse.json({ comments });
}

const CommentBody = z.object({ body: z.string().trim().min(1).max(2000) });

/** POST /api/content/:id/comments — requires a real session (no guest comments). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: contentId } = await params;

  const user = await getSessionAppUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const parsed = CommentBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const content = await prisma.content.findUnique({ where: { id: contentId }, select: { id: true } });
  if (!content) {
    return NextResponse.json({ error: "content not found" }, { status: 404 });
  }

  const comment = await prisma.comment.create({
    data: { contentId, authorId: user.id, body: parsed.data.body },
    select: {
      id: true,
      body: true,
      createdAt: true,
      author: { select: { id: true, displayName: true, avatarUrl: true } },
    },
  });

  return NextResponse.json({ comment }, { status: 201 });
}
