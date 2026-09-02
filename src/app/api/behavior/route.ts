import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { BehaviorBatchPayload } from "@/lib/telemetry/schema";
import { aggregateSession } from "@/lib/telemetry/aggregate";
import { aggregatedSessionToScoreInput, computeInterestScore } from "@/lib/recommendation/scoreEngine";
import { applyPreferenceUpdate } from "@/lib/recommendation/preferenceUpdater";

/**
 * Batched behavior telemetry ingestion (2단계 §2).
 *
 * Accepts one `BehaviorBatchPayload` (possibly several content sessions),
 * upserts one `UserBehaviorLog` row per session, scores it, and folds the
 * score into the user's category/style preference vectors. Runs off the
 * main UI thread on the client (see `useBehaviorTracker`), and is itself
 * cheap enough server-side to run per-batch rather than needing a queue —
 * revisit with Vercel Queues if ingestion volume grows past what a single
 * Function invocation should own per request.
 */
export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = BehaviorBatchPayload.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const payload = parsed.data;

  const contentIds = [...new Set(parsed.data.sessions.map((s) => s.contentId))];
  const contents = await prisma.content.findMany({
    where: { id: { in: contentIds } },
    select: {
      id: true,
      type: true,
      difficulty: true,
      estimatedSeconds: true,
      categories: { select: { categoryId: true } },
    },
  });
  const contentById = new Map(contents.map((c) => [c.id, c]));

  const results = await Promise.all(
    payload.sessions.map(async (session) => {
      const content = contentById.get(session.contentId);
      if (!content) return { contentId: session.contentId, skipped: true as const };

      const aggregated = aggregateSession(session);
      const scoreInput = aggregatedSessionToScoreInput(aggregated, content.estimatedSeconds);
      const { score, quickSkip } = computeInterestScore(scoreInput);

      const widgetInteractions = aggregated.rawEvents.filter((e) => e.type === "widget_interact").length;

      await prisma.userBehaviorLog.upsert({
        where: { sessionId: aggregated.sessionId },
        create: {
          userId: payload.userId,
          contentId: aggregated.contentId,
          sessionId: aggregated.sessionId,
          dwellTimeMs: aggregated.dwellTimeMs,
          scrollDepthPct: aggregated.scrollDepthPct,
          latexFocusTimeMs: aggregated.latexFocusTimeMs,
          hintViewCount: aggregated.hintViewCount,
          hintFirstViewedAtMs: aggregated.hintFirstViewedAtMs,
          answerRevealed: aggregated.answerRevealed,
          liked: aggregated.liked,
          scrapped: aggregated.scrapped,
          quickSkip,
          interactionCount: aggregated.interactionCount,
          rawEvents: aggregated.rawEvents,
          interestScore: score,
        },
        update: {
          dwellTimeMs: aggregated.dwellTimeMs,
          scrollDepthPct: aggregated.scrollDepthPct,
          latexFocusTimeMs: aggregated.latexFocusTimeMs,
          hintViewCount: aggregated.hintViewCount,
          answerRevealed: aggregated.answerRevealed,
          liked: aggregated.liked,
          scrapped: aggregated.scrapped,
          quickSkip,
          interactionCount: aggregated.interactionCount,
          rawEvents: aggregated.rawEvents,
          interestScore: score,
        },
      });

      await applyPreferenceUpdate({
        userId: payload.userId,
        contentId: aggregated.contentId,
        categoryIds: content.categories.map((c) => c.categoryId),
        contentType: content.type,
        difficulty: content.difficulty,
        interestScore: score,
        hintViewCount: aggregated.hintViewCount,
        answerRevealed: aggregated.answerRevealed,
        isCorrect: null, // grading (if any) arrives separately via /api/daily-quiz/submit
        widgetInteractions,
      });

      return { contentId: session.contentId, skipped: false as const, interestScore: score, quickSkip };
    }),
  );

  return NextResponse.json({ processed: results.length, results });
}

// `navigator.sendBeacon` on `pagehide` posts as `Content-Type: text/plain`
// with no ability to set custom headers — Next's default body parsing still
// handles it since the payload is valid JSON text either way.
export const runtime = "nodejs";
