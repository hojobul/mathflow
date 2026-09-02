import type { AggregatedSession } from "../telemetry/aggregate";

/**
 * 관심도 점수 = (실제 체류 시간 / 예상 소요 시간) × w1 + (상호작용 수) × w2 − (빠른 스킵) × w3
 *
 * Weights are tunable per deployment; env override is optional so the score
 * can be A/B tested without a redeploy (read via `getScoreWeights()`).
 */
export interface ScoreWeights {
  w1: number; // dwell-ratio weight
  w2: number; // interaction-count weight
  w3: number; // quick-skip penalty weight
}

export const DEFAULT_SCORE_WEIGHTS: ScoreWeights = {
  w1: 1.0,
  w2: 0.15,
  w3: 2.0,
};

export function getScoreWeights(): ScoreWeights {
  return {
    w1: numEnv("RANK_W1", DEFAULT_SCORE_WEIGHTS.w1),
    w2: numEnv("RANK_W2", DEFAULT_SCORE_WEIGHTS.w2),
    w3: numEnv("RANK_W3", DEFAULT_SCORE_WEIGHTS.w3),
  };
}

function numEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

// Below this fraction of expected time, with no meaningful engagement, a
// dwell counts as a "quick skip" rather than a low-interest-but-genuine read.
const QUICK_SKIP_DWELL_RATIO = 0.15;
const QUICK_SKIP_MAX_INTERACTIONS = 1;

/** Dwell-ratio is capped so a content left open in a background tab for
 *  an hour can't dominate the score. */
const MAX_DWELL_RATIO = 3.0;

export interface InterestScoreInput {
  dwellTimeMs: number;
  estimatedSeconds: number;
  interactionCount: number;
  hintViewCount: number;
  answerRevealed: boolean;
  liked: boolean;
  scrapped: boolean;
}

export function isQuickSkip(input: InterestScoreInput): boolean {
  const expectedMs = input.estimatedSeconds * 1000;
  if (expectedMs <= 0) return false;
  const ratio = input.dwellTimeMs / expectedMs;
  return ratio < QUICK_SKIP_DWELL_RATIO && input.interactionCount <= QUICK_SKIP_MAX_INTERACTIONS;
}

export function computeInterestScore(
  input: InterestScoreInput,
  weights: ScoreWeights = getScoreWeights(),
): { score: number; quickSkip: boolean; dwellRatio: number } {
  const expectedMs = Math.max(1, input.estimatedSeconds * 1000);
  const dwellRatio = Math.min(input.dwellTimeMs / expectedMs, MAX_DWELL_RATIO);

  // Explicit signals (like/scrap/hint views) fold into the interaction count
  // so a short-but-decisive "saw it, scrapped it" session isn't scored as a skip.
  const weightedInteractions =
    input.interactionCount +
    input.hintViewCount +
    (input.liked ? 2 : 0) +
    (input.scrapped ? 2 : 0) +
    (input.answerRevealed ? 1 : 0);

  const quickSkip = isQuickSkip(input);

  const score =
    dwellRatio * weights.w1 + weightedInteractions * weights.w2 - (quickSkip ? 1 : 0) * weights.w3;

  return { score, quickSkip, dwellRatio };
}

export function aggregatedSessionToScoreInput(
  session: AggregatedSession,
  estimatedSeconds: number,
): InterestScoreInput {
  return {
    dwellTimeMs: session.dwellTimeMs,
    estimatedSeconds,
    interactionCount: session.interactionCount,
    hintViewCount: session.hintViewCount,
    answerRevealed: session.answerRevealed,
    liked: session.liked,
    scrapped: session.scrapped,
  };
}
