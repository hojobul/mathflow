import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { LibraryEntryType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { canViewContent } from "@/lib/content/access";
import { getOrCreateGuestUser, getSessionAppUser } from "@/lib/auth/currentUser";
import { gradeAnswer, SubmittedAnswer } from "@/lib/grading";

const Body = z.object({ answer: SubmittedAnswer });

/**
 * POST /api/content/:id/answer — grade a standalone problem attempt.
 * Guests can answer (recorded under the shared guest id); logged-in users
 * additionally get wrong answers filed into their 오답노트 automatically.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: contentId } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (!(await canViewContent(contentId))) {
    return NextResponse.json({ error: "채점 대상이 아닌 콘텐츠입니다" }, { status: 404 });
  }

  const [sessionUser, content] = await Promise.all([
    getSessionAppUser(),
    prisma.content.findUnique({ where: { id: contentId }, select: { answerKey: true } }),
  ]);
  if (!content || content.answerKey === null) {
    return NextResponse.json({ error: "채점 대상이 아닌 콘텐츠입니다" }, { status: 404 });
  }
  const user = sessionUser ?? (await getOrCreateGuestUser());

  const isCorrect = gradeAnswer(content.answerKey, parsed.data.answer);

  await prisma.userSubmission.create({
    data: {
      userId: user.id,
      contentId,
      answer: parsed.data.answer as unknown as Prisma.InputJsonValue,
      isCorrect,
      timeTakenMs: 0,
    },
  });

  if (sessionUser) {
    const key = { userId_contentId_type: { userId: sessionUser.id, contentId, type: LibraryEntryType.WRONG_ANSWER } };
    if (isCorrect) {
      await prisma.libraryEntry.deleteMany({
        where: { userId: sessionUser.id, contentId, type: LibraryEntryType.WRONG_ANSWER },
      });
    } else {
      await prisma.libraryEntry.upsert({
        where: key,
        create: { userId: sessionUser.id, contentId, type: LibraryEntryType.WRONG_ANSWER },
        update: {},
      });
    }
  }

  const [total, correct] = await Promise.all([
    prisma.userSubmission.count({ where: { contentId } }),
    prisma.userSubmission.count({ where: { contentId, isCorrect: true } }),
  ]);

  return NextResponse.json({
    isCorrect,
    percentCorrect: total ? Math.round((correct / total) * 100) : 0,
    savedToWrongNote: !!sessionUser && !isCorrect,
  });
}
