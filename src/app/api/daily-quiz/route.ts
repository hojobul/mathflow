import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function todayUtcDateOnly(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** GET /api/daily-quiz?userId=... — today's 3-minute Daily Math Rush. */
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");

  const quiz = await prisma.dailyQuiz.findUnique({
    where: { date: todayUtcDateOnly() },
    include: {
      problems: {
        orderBy: { order: "asc" },
        include: {
          content: {
            select: { id: true, title: true, body: true, difficulty: true, estimatedSeconds: true },
          },
        },
      },
    },
  });
  if (!quiz) {
    return NextResponse.json({ error: "no daily quiz scheduled for today" }, { status: 404 });
  }

  const submittedContentIds = userId
    ? new Set(
        (
          await prisma.userSubmission.findMany({
            where: { userId, dailyQuizId: quiz.id },
            select: { contentId: true },
          })
        ).map((s) => s.contentId),
      )
    : new Set<string>();

  return NextResponse.json({
    id: quiz.id,
    title: quiz.title,
    durationSeconds: quiz.durationSeconds,
    problems: quiz.problems.map((p) => ({
      order: p.order,
      ...p.content, // answerKey is never selected — safe to spread
      alreadySubmitted: submittedContentIds.has(p.contentId),
    })),
  });
}
