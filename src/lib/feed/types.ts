import type { ContentBody } from "@/lib/content/blocks";

/** Shape returned by GET /api/feed — mirrors the `select` in src/app/api/feed/route.ts. */
export interface FeedContentItem {
  id: string;
  type: "PROBLEM" | "HISTORY" | "ANECDOTE" | "CONCEPT";
  title: string;
  summary: string | null;
  body: ContentBody;
  difficulty: number;
  estimatedSeconds: number;
  widgetConfig: unknown;
  latexExpressions: string[];
  categories: { slug: string; name: string }[];
  hints: { id: string; order: number; label: string; isFullSolution: boolean }[];
  author: { id: string; displayName: string; avatarUrl: string | null } | null;
  _count: { likes: number };
  rankScore: number;
  likedByViewer: boolean;
  subscribedByViewer: boolean;
  subscriberCount: number;
}
