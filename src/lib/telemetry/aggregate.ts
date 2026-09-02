import type { ContentSession, TelemetryEvent } from "./schema";

export interface AggregatedSession {
  contentId: string;
  sessionId: string;
  dwellTimeMs: number;
  scrollDepthPct: number;
  latexFocusTimeMs: number;
  hintViewCount: number;
  hintFirstViewedAtMs: number | null;
  hintOrdersViewed: number[];
  answerRevealed: boolean;
  liked: boolean;
  scrapped: boolean;
  interactionCount: number;
  rawEvents: TelemetryEvent[];
}

/**
 * Reduces one content session's raw event stream into the aggregate fields
 * `UserBehaviorLog` stores. Kept pure/sync so it can run both server-side
 * (API route) and in a unit test without a DB.
 */
export function aggregateSession(session: ContentSession): AggregatedSession {
  let viewStartMs = 0;
  let viewEndMs = 0;
  let maxScrollDepthPct = 0;
  let latexFocusTimeMs = 0;
  const openLatexBlocks = new Map<string, number>();
  let hintViewCount = 0;
  let hintFirstViewedAtMs: number | null = null;
  const hintOrdersViewed: number[] = [];
  let answerRevealed = false;
  let liked = false;
  let scrapped = false;
  let interactionCount = 0;

  for (const event of session.events) {
    switch (event.type) {
      case "view_start":
        viewStartMs = event.atMs;
        break;
      case "view_end":
        viewEndMs = event.atMs;
        break;
      case "scroll_progress":
        maxScrollDepthPct = Math.max(maxScrollDepthPct, event.depthPct);
        interactionCount++;
        break;
      case "latex_focus_start":
        openLatexBlocks.set(event.blockId, event.atMs);
        break;
      case "latex_focus_end": {
        const start = openLatexBlocks.get(event.blockId);
        if (start !== undefined) {
          latexFocusTimeMs += Math.max(0, event.atMs - start);
          openLatexBlocks.delete(event.blockId);
        }
        break;
      }
      case "hint_view":
        hintViewCount++;
        hintOrdersViewed.push(event.order);
        hintFirstViewedAtMs ??= event.atMs;
        interactionCount++;
        break;
      case "answer_reveal":
        answerRevealed = true;
        interactionCount++;
        break;
      case "like":
        liked = true;
        interactionCount++;
        break;
      case "unlike":
        liked = false;
        break;
      case "scrap":
        scrapped = true;
        interactionCount++;
        break;
      case "unscrap":
        scrapped = false;
        break;
      case "widget_interact":
        interactionCount++;
        break;
    }
  }

  // A latex block still open at view_end (no matching focus_end) counts up
  // to the end of the session instead of being dropped.
  for (const start of openLatexBlocks.values()) {
    latexFocusTimeMs += Math.max(0, viewEndMs - start);
  }

  return {
    contentId: session.contentId,
    sessionId: session.sessionId,
    dwellTimeMs: Math.max(0, viewEndMs - viewStartMs),
    scrollDepthPct: maxScrollDepthPct,
    latexFocusTimeMs,
    hintViewCount,
    hintFirstViewedAtMs,
    hintOrdersViewed,
    answerRevealed,
    liked,
    scrapped,
    interactionCount,
    rawEvents: session.events,
  };
}
