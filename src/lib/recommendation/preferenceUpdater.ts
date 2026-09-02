import { ContentType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// EMA smoothing: higher = preferences react faster to recent behavior.
const AFFINITY_ALPHA = 0.25;
const DIFFICULTY_ALPHA = 0.15;
const STYLE_ALPHA = 0.1;

export interface PreferenceUpdateInput {
  userId: string;
  contentId: string;
  categoryIds: string[];
  contentType: ContentType;
  difficulty: number;
  interestScore: number;
  hintViewCount: number;
  answerRevealed: boolean;
  isCorrect: boolean | null; // null when not a graded problem / no submission yet
  widgetInteractions: number;
}

export async function applyPreferenceUpdate(input: PreferenceUpdateInput): Promise<void> {
  await Promise.all([
    ...input.categoryIds.map((categoryId) => upsertCategoryAffinity(input, categoryId)),
    upsertStyleProfile(input),
  ]);
}

async function upsertCategoryAffinity(input: PreferenceUpdateInput, categoryId: string) {
  const existing = await prisma.userPreferenceVector.findUnique({
    where: { userId_categoryId: { userId: input.userId, categoryId } },
  });

  const prevAffinity = existing?.affinityScore ?? 0;
  const prevDifficulty = existing?.difficultyPreference ?? 2.5;

  const nextAffinity = ema(prevAffinity, input.interestScore, AFFINITY_ALPHA);
  // Only nudge the difficulty target toward content the user engaged with
  // well (positive score) — a quick-skip shouldn't push difficulty down.
  const nextDifficulty =
    input.interestScore > 0
      ? ema(prevDifficulty, input.difficulty, DIFFICULTY_ALPHA)
      : prevDifficulty;

  await prisma.userPreferenceVector.upsert({
    where: { userId_categoryId: { userId: input.userId, categoryId } },
    create: {
      userId: input.userId,
      categoryId,
      affinityScore: nextAffinity,
      difficultyPreference: nextDifficulty,
      sampleCount: 1,
    },
    update: {
      affinityScore: nextAffinity,
      difficultyPreference: nextDifficulty,
      sampleCount: { increment: 1 },
    },
  });
}

/**
 * 수학 스타일 레이더 차트: [논리력, 역사적 호기심, 계산력, 직관력]
 *
 * Heuristic mapping from one session's signals to the four axes — illustrative
 * scoring meant to be replaced with a trained model once enough submission
 * data exists, kept isolated here so that swap doesn't touch callers.
 */
async function upsertStyleProfile(input: PreferenceUpdateInput) {
  const positive = Math.max(0, input.interestScore);

  const logicDelta =
    input.contentType === ContentType.PROBLEM && input.isCorrect
      ? positive * (1 - input.hintViewCount * 0.2) // fewer hints needed → more logic
      : 0;

  const curiosityDelta =
    input.contentType === ContentType.HISTORY || input.contentType === ContentType.ANECDOTE
      ? positive
      : 0;

  const calculationDelta =
    input.contentType === ContentType.PROBLEM ? positive * (input.answerRevealed ? 0.5 : 1) : 0;

  const intuitionDelta =
    input.contentType === ContentType.CONCEPT
      ? positive * (1 + Math.min(input.widgetInteractions, 5) * 0.1)
      : 0;

  const existing = await prisma.userStyleProfile.findUnique({ where: { userId: input.userId } });

  await prisma.userStyleProfile.upsert({
    where: { userId: input.userId },
    create: {
      userId: input.userId,
      logicScore: logicDelta,
      curiosityScore: curiosityDelta,
      calculationScore: calculationDelta,
      intuitionScore: intuitionDelta,
    },
    update: {
      logicScore: ema(existing?.logicScore ?? 0, logicDelta, STYLE_ALPHA),
      curiosityScore: ema(existing?.curiosityScore ?? 0, curiosityDelta, STYLE_ALPHA),
      calculationScore: ema(existing?.calculationScore ?? 0, calculationDelta, STYLE_ALPHA),
      intuitionScore: ema(existing?.intuitionScore ?? 0, intuitionDelta, STYLE_ALPHA),
    },
  });
}

function ema(prev: number, sample: number, alpha: number): number {
  return prev + alpha * (sample - prev);
}
