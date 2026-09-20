import { NextRequest, NextResponse } from "next/server";
import { ContentType, ContentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/cron/daily-quiz — creates today's Daily Math Rush if it doesn't
 * exist yet. Triggered by Vercel Cron (see vercel.json) at 00:00 UTC daily.
 * The 404 users hit on /quiz on a day nothing was seeded is exactly what
 * this replaces — seed.ts only ever creates a quiz for "today" at seed
 * time, so without this the feature silently dies the next day.
 *
 * Vercel signs cron requests with `Authorization: Bearer ${CRON_SECRET}`
 * when that env var is set — this route rejects anything else.
 */
export async function GET(req: NextRequest) {
  if (process.env.CRON_SECRET) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const existing = await prisma.dailyQuiz.findUnique({ where: { date: today } });
  if (existing) {
    return NextResponse.json({ created: false, quizId: existing.id });
  }

  const candidates = await prisma.content.findMany({
    where: { type: ContentType.PROBLEM, status: ContentStatus.PUBLISHED, answerKey: { not: Prisma.DbNull } },
    select: { id: true },
  });
  if (candidates.length === 0) {
    return NextResponse.json({ created: false, reason: "no graded problems available" }, { status: 200 });
  }

  const picked = shuffle(candidates)
    .slice(0, Math.min(3, candidates.length))
    .map((c) => c.id);

  const quiz = await prisma.dailyQuiz.create({
    data: {
      date: today,
      title: "오늘의 Math Rush",
      durationSeconds: 180,
      problems: { create: picked.map((contentId, i) => ({ order: i + 1, contentId })) },
    },
  });

  return NextResponse.json({ created: true, quizId: quiz.id, problemCount: picked.length });
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
