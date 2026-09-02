import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { gradeAnswer } from "@/lib/grading";

const SubmitBody = z.object({
  userId: z.string(),
  dailyQuizId: z.string(),
  contentId: z.string(),
  answer: z.unknown(),
  timeTakenMs: z.number().int().nonnegative(),
});

/**
 * POST /api/daily-quiz/submit
 * Grades one Daily Math Rush problem and returns the "상위 N%만 맞힌 문제"
 * feedback: the fraction of this quiz's participants who answered this
 * specific problem correctly.
 */
export async function POST(req: NextRequest) {
  const parsed = SubmitBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { userId, dailyQuizId, contentId, answer, timeTakenMs } = parsed.data;

  // DailyQuizProblem has no (dailyQuizId, contentId) compound-unique index
  // (only (dailyQuizId, order)), so look the pair up with findFirst.
  const linked = await prisma.dailyQuizProblem.findFirst({ where: { dailyQuizId, contentId } });
  if (!linked) {
    return NextResponse.json({ error: "problem is not part of this quiz" }, { status: 404 });
  }

  const existing = await prisma.userSubmission.findFirst({ where: { userId, dailyQuizId, contentId } });
  if (existing) {
    const stats = await problemCorrectRate(dailyQuizId, contentId);
    return NextResponse.json({ isCorrect: existing.isCorrect, alreadySubmitted: true, ...stats });
  }

  const content = await prisma.content.findUnique({ where: { id: contentId }, select: { answerKey: true } });
  const isCorrect = gradeAnswer(content?.answerKey, answer);

  await prisma.userSubmission.create({
    data: { userId, dailyQuizId, contentId, answer: answer as object, isCorrect, timeTakenMs },
  });

  const stats = await problemCorrectRate(dailyQuizId, contentId);
  return NextResponse.json({ isCorrect, alreadySubmitted: false, ...stats });
}

async function problemCorrectRate(dailyQuizId: string, contentId: string) {
  const [total, correct] = await Promise.all([
    prisma.userSubmission.count({ where: { dailyQuizId, contentId } }),
    prisma.userSubmission.count({ where: { dailyQuizId, contentId, isCorrect: true } }),
  ]);
  const percentCorrect = total > 0 ? Math.round((correct / total) * 100) : 100;
  return {
    percentCorrect,
    message: `상위 ${Math.max(1, percentCorrect)}%만 맞힌 문제`,
  };
}
