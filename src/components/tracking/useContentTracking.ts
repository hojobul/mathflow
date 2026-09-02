"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useBehaviorTrackerContext } from "./BehaviorTrackerProvider";

const VIEW_VISIBLE_THRESHOLD = 0.6; // card counts as "viewed" once 60% on screen
const SCROLL_SAMPLE_MIN_INTERVAL_MS = 300; // throttle scroll_progress events

/**
 * Attach to one feed card: `ref` goes on the scrollable content container,
 * the returned callbacks report discrete interactions. Everything here is
 * fire-and-forget into the batched provider buffer — no network call, no
 * re-render, so it never competes with scroll/animation frames.
 */
export function useContentTracking(contentId: string) {
  const { recordEvent } = useBehaviorTrackerContext();
  const sessionId = useMemo(() => crypto.randomUUID(), []);
  const viewStartAtRef = useRef<number | null>(null);
  const lastScrollSampleRef = useRef(0);
  const containerRef = useRef<HTMLElement | null>(null);

  const clockMs = useCallback(() => {
    const start = viewStartAtRef.current ?? performance.now();
    return Math.round(performance.now() - start);
  }, []);

  const emit = useCallback(
    (event: Parameters<typeof recordEvent>[2]) => recordEvent(contentId, sessionId, event),
    [contentId, sessionId, recordEvent],
  );

  const setContainerRef = useCallback(
    (node: HTMLElement | null) => {
      containerRef.current = node;
      if (!node) return;

      const io = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && entry.intersectionRatio >= VIEW_VISIBLE_THRESHOLD) {
            if (viewStartAtRef.current === null) {
              viewStartAtRef.current = performance.now();
              emit({ type: "view_start", atMs: 0 });
            }
          } else if (viewStartAtRef.current !== null) {
            emit({ type: "view_end", atMs: clockMs() });
            viewStartAtRef.current = null;
          }
        },
        { threshold: [0, VIEW_VISIBLE_THRESHOLD, 1] },
      );
      io.observe(node);

      const onScroll = () => {
        if (viewStartAtRef.current === null) return;
        const now = performance.now();
        if (now - lastScrollSampleRef.current < SCROLL_SAMPLE_MIN_INTERVAL_MS) return;
        lastScrollSampleRef.current = now;
        const el = node;
        const depthPct =
          el.scrollHeight <= el.clientHeight
            ? 100
            : Math.min(100, (el.scrollTop / (el.scrollHeight - el.clientHeight)) * 100);
        emit({ type: "scroll_progress", atMs: clockMs(), depthPct });
      };
      node.addEventListener("scroll", onScroll, { passive: true });

      return () => {
        io.disconnect();
        node.removeEventListener("scroll", onScroll);
      };
    },
    [clockMs, emit],
  );

  // Flush a trailing view_end if the card unmounts while still "in view"
  // (e.g. the user closes the tab mid-card — the provider's own
  // pagehide/visibilitychange listener handles the actual network flush).
  useEffect(() => {
    return () => {
      if (viewStartAtRef.current !== null) {
        emit({ type: "view_end", atMs: clockMs() });
        viewStartAtRef.current = null;
      }
    };
  }, [clockMs, emit]);

  const trackLatexFocus = useCallback(
    (blockId: string, focused: boolean) => {
      emit({ type: focused ? "latex_focus_start" : "latex_focus_end", atMs: clockMs(), blockId });
    },
    [clockMs, emit],
  );

  const trackHintView = useCallback(
    (hintId: string, order: number) => emit({ type: "hint_view", atMs: clockMs(), hintId, order }),
    [clockMs, emit],
  );

  const trackAnswerReveal = useCallback(
    () => emit({ type: "answer_reveal", atMs: clockMs() }),
    [clockMs, emit],
  );

  const trackLike = useCallback(
    (liked: boolean) => emit({ type: liked ? "like" : "unlike", atMs: clockMs() }),
    [clockMs, emit],
  );

  const trackScrap = useCallback(
    (scrapped: boolean) => emit({ type: scrapped ? "scrap" : "unscrap", atMs: clockMs() }),
    [clockMs, emit],
  );

  const trackWidgetInteract = useCallback(
    () => emit({ type: "widget_interact", atMs: clockMs() }),
    [clockMs, emit],
  );

  return {
    sessionId,
    containerRef: setContainerRef,
    trackLatexFocus,
    trackHintView,
    trackAnswerReveal,
    trackLike,
    trackScrap,
    trackWidgetInteract,
  };
}
