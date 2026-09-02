"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from "react";
import type { ContentSession, TelemetryEvent } from "@/lib/telemetry/schema";
import { BATCH_FLUSH_INTERVAL_MS, BATCH_MAX_EVENTS } from "@/lib/telemetry/schema";

interface BehaviorTrackerContextValue {
  /** Records one raw event for a content session. Never blocks the caller —
   *  events go into an in-memory buffer and are flushed off the render path. */
  recordEvent: (contentId: string, sessionId: string, event: TelemetryEvent) => void;
}

const BehaviorTrackerContext = createContext<BehaviorTrackerContextValue | null>(null);

export function useBehaviorTrackerContext(): BehaviorTrackerContextValue {
  const ctx = useContext(BehaviorTrackerContext);
  if (!ctx) throw new Error("useBehaviorTrackerContext must be used within BehaviorTrackerProvider");
  return ctx;
}

interface BehaviorTrackerProviderProps {
  userId: string;
  endpoint?: string;
  children: React.ReactNode;
}

/**
 * Owns the client-side event buffer for the whole feed and flushes it in
 * batches (3단계 §1) — component tree never awaits a network call, so
 * tracking cannot janks scrolling or interaction.
 */
export function BehaviorTrackerProvider({
  userId,
  endpoint = "/api/behavior",
  children,
}: BehaviorTrackerProviderProps) {
  const feedSessionId = useMemo(() => crypto.randomUUID(), []);
  // contentId+sessionId -> events, flattened to ContentSession[] at flush time.
  const bufferRef = useRef<Map<string, ContentSession>>(new Map());
  const eventCountRef = useRef(0);

  const flush = useCallback(
    (useBeacon = false) => {
      const buffer = bufferRef.current;
      if (buffer.size === 0) return;
      const sessions = [...buffer.values()];
      buffer.clear();
      eventCountRef.current = 0;

      const payload = JSON.stringify({
        userId,
        feedSessionId,
        clientSentAt: new Date().toISOString(),
        sessions,
      });

      if (useBeacon && "sendBeacon" in navigator) {
        navigator.sendBeacon(endpoint, payload);
        return;
      }
      fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true, // survives navigation, like sendBeacon, when available
      }).catch(() => {
        // Best-effort telemetry: a dropped batch degrades ranking freshness,
        // never blocks or surfaces an error to the user.
      });
    },
    [endpoint, feedSessionId, userId],
  );

  const recordEvent = useCallback(
    (contentId: string, sessionId: string, event: TelemetryEvent) => {
      const buffer = bufferRef.current;
      const existing = buffer.get(sessionId);
      if (existing) {
        existing.events.push(event);
      } else {
        buffer.set(sessionId, { contentId, sessionId, events: [event] });
      }
      eventCountRef.current += 1;
      if (eventCountRef.current >= BATCH_MAX_EVENTS) flush();
    },
    [flush],
  );

  useEffect(() => {
    const interval = setInterval(() => flush(), BATCH_FLUSH_INTERVAL_MS);
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") flush(true);
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", onVisibilityChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onVisibilityChange);
      flush(true);
    };
  }, [flush]);

  const value = useMemo(() => ({ recordEvent }), [recordEvent]);

  return <BehaviorTrackerContext.Provider value={value}>{children}</BehaviorTrackerContext.Provider>;
}
