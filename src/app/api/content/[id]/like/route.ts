import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { applyPreferenceUpdate } from "@/lib/recommendation/preferenceUpdater";
import { getSessionAppUser } from "@/lib/auth/currentUser";

// A like outside the normal dwell/scroll session still needs a score to
// hand the engine — worth more than a passive read, less than a full
// deliberate "관심도 점수 max" session (see scoreEngine.ts's weightedInteractions).
const LIKE_INTEREST_SCORE = 1.5;

/**
 * POST /api/content/:id/like — toggles a like and folds it into the
 * recommendation engine. Requires a real session — guests can browse but
 * not like (mirrors most feed products' actual behavior).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: contentId } = await params;

  const user = await getSessionAppUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }
  const userId = user.id;

  const content = await prisma.content.findUnique({
    where: { id: contentId },
    select: { type: true, difficulty: true, categories: { select: { categoryId: true } } },
  });
  if (!content) {
    return NextResponse.json({ error: "content not found" }, { status: 404 });
  }

  const existing = await prisma.like.findUnique({ where: { userId_contentId: { userId, contentId } } });

  let liked: boolean;
  if (existing) {
    await prisma.like.delete({ where: { userId_contentId: { userId, contentId } } });
    liked = false;
  } else {
    await prisma.like.create({ data: { userId, contentId } });
    liked = true;
    // Unlike doesn't claw the score back — an EMA already folds in later
    // (dis)engagement, so we only push a positive signal on the way in.
    await applyPreferenceUpdate({
      userId,
      contentId,
      categoryIds: content.categories.map((c) => c.categoryId),
      contentType: content.type,
      difficulty: content.difficulty,
      interestScore: LIKE_INTEREST_SCORE,
      hintViewCount: 0,
      answerRevealed: false,
      isCorrect: null,
      widgetInteractions: 0,
    });
  }

  const likeCount = await prisma.like.count({ where: { contentId } });
  return NextResponse.json({ liked, likeCount });
}
