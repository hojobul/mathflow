import { z } from "zod";

/**
 * Event tracking protocol (1단계 §2).
 *
 * The client never sends one request per interaction — everything is
 * accumulated in a per-content ring buffer on the device and flushed in a
 * single batch (see `useBehaviorTracker` on the frontend) when:
 *   - the content leaves the viewport (view_end),
 *   - the buffer hits BATCH_MAX_EVENTS,
 *   - or a periodic flush timer fires (BATCH_FLUSH_INTERVAL_MS),
 *   - or the page is hidden (`visibilitychange` / `pagehide`), via
 *     `navigator.sendBeacon` so it survives tab close.
 *
 * One HTTP request = one `BehaviorBatchPayload`, which can carry events for
 * several content sessions (e.g. a fast-scrolling user who blew past three
 * cards before the flush timer fired).
 */

export const TelemetryEventType = z.enum([
  "view_start", // content entered the viewport
  "view_end", // content left the viewport
  "scroll_progress", // periodic sample of how far the user scrolled into the content body
  "latex_focus_start", // a LaTeX block entered the viewport (IntersectionObserver)
  "latex_focus_end",
  "hint_view", // a hint was revealed
  "answer_reveal", // full solution / answer was revealed
  "like",
  "unlike",
  "scrap",
  "unscrap",
  "widget_interact", // slider/graph widget dragged
]);
export type TelemetryEventType = z.infer<typeof TelemetryEventType>;

const baseEvent = {
  type: TelemetryEventType,
  // Client-side monotonic offset in ms, relative to this session's view_start.
  // Using an offset instead of wall-clock time keeps payloads small and
  // avoids clock-skew issues; the server assigns createdAt on receipt.
  atMs: z.number().int().nonnegative(),
};

export const TelemetryEvent = z.discriminatedUnion("type", [
  z.object({ ...baseEvent, type: z.literal("view_start") }),
  z.object({ ...baseEvent, type: z.literal("view_end") }),
  z.object({
    ...baseEvent,
    type: z.literal("scroll_progress"),
    depthPct: z.number().min(0).max(100),
  }),
  z.object({ ...baseEvent, type: z.literal("latex_focus_start"), blockId: z.string() }),
  z.object({ ...baseEvent, type: z.literal("latex_focus_end"), blockId: z.string() }),
  z.object({ ...baseEvent, type: z.literal("hint_view"), hintId: z.string(), order: z.number().int() }),
  z.object({ ...baseEvent, type: z.literal("answer_reveal") }),
  z.object({ ...baseEvent, type: z.literal("like") }),
  z.object({ ...baseEvent, type: z.literal("unlike") }),
  z.object({ ...baseEvent, type: z.literal("scrap") }),
  z.object({ ...baseEvent, type: z.literal("unscrap") }),
  z.object({ ...baseEvent, type: z.literal("widget_interact") }),
]);
export type TelemetryEvent = z.infer<typeof TelemetryEvent>;

export const ContentSession = z.object({
  contentId: z.string(),
  sessionId: z.string(), // uuid, minted client-side per content impression
  events: z.array(TelemetryEvent).min(1),
});
export type ContentSession = z.infer<typeof ContentSession>;

export const BehaviorBatchPayload = z.object({
  userId: z.string(),
  feedSessionId: z.string(), // groups every content session in one feed scroll
  clientSentAt: z.string().datetime(),
  sessions: z.array(ContentSession).min(1).max(50),
});
export type BehaviorBatchPayload = z.infer<typeof BehaviorBatchPayload>;

export const BATCH_FLUSH_INTERVAL_MS = 5_000;
export const BATCH_MAX_EVENTS = 200;
