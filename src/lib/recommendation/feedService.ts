import { ContentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const SEEN_CONTENT_COOLDOWN_HOURS = 12;
const EXPLORATION_JITTER = 0.15; // small randomness so the feed isn't fully deterministic
const DEFAULT_PAGE_SIZE = 10;
const CANDIDATE_POOL_MULTIPLIER = 8; // over-fetch, then rank+trim, to keep ranking off the hot query path
const SUBSCRIBED_CREATOR_BOOST = 0.5; // 구독한 크리에이터의 새 콘텐츠는 랭킹에서 우대

export interface FeedItem {
  contentId: string;
  rankScore: number;
}

export interface GetFeedOptions {
  limit?: number;
  cursor?: string; // last-seen content id, for simple keyset pagination over the ranked page
}

/**
 * Personalized feed ranking:
 *   rank = categoryAffinity − difficultyGap² · gapPenalty + freshnessBoost + jitter
 *
 * `categoryAffinity` and `difficultyPreference` come from `UserPreferenceVector`
 * (updated by `applyPreferenceUpdate` after every scored behavior log — see
 * preferenceUpdater.ts). New users with no vectors fall back to a
 * freshness/difficulty-neutral ranking (cold start). Content from a
 * subscribed creator gets a flat rank boost on top of that (좋아요/구독 반영).
 */
export async function getPersonalizedFeed(
  userId: string,
  options: GetFeedOptions = {},
): Promise<{ items: FeedItem[]; nextCursor: string | null }> {
  const limit = options.limit ?? DEFAULT_PAGE_SIZE;

  const [preferences, recentlySeenIds, subscribedCreatorIds] = await Promise.all([
    prisma.userPreferenceVector.findMany({ where: { userId } }),
    getRecentlySeenContentIds(userId),
    getSubscribedCreatorIds(userId),
  ]);

  const affinityByCategory = new Map(preferences.map((p) => [p.categoryId, p.affinityScore]));
  const preferredDifficulty = weightedAverageDifficulty(preferences);

  const candidates = await prisma.content.findMany({
    where: {
      status: ContentStatus.PUBLISHED,
      id: { notIn: [...recentlySeenIds] },
    },
    include: { categories: { select: { categoryId: true } } },
    orderBy: { createdAt: "desc" },
    take: limit * CANDIDATE_POOL_MULTIPLIER,
  });

  const now = Date.now();
  const ranked = candidates
    .map((content) => {
      const categoryIds = content.categories.map((c) => c.categoryId);
      const affinity = categoryIds.length
        ? Math.max(...categoryIds.map((id) => affinityByCategory.get(id) ?? 0))
        : 0;

      const difficultyGap = content.difficulty - preferredDifficulty;
      const difficultyPenalty = 0.08 * difficultyGap * difficultyGap;

      const ageHours = (now - content.createdAt.getTime()) / 3_600_000;
      const freshnessBoost = Math.max(0, 0.3 - ageHours / 240); // decays to 0 over ~10 days

      const subscriptionBoost =
        content.authorId && subscribedCreatorIds.has(content.authorId) ? SUBSCRIBED_CREATOR_BOOST : 0;

      const jitter = (pseudoRandom(userId + content.id) - 0.5) * EXPLORATION_JITTER;

      const rankScore = affinity - difficultyPenalty + freshnessBoost + subscriptionBoost + jitter;
      return { contentId: content.id, rankScore };
    })
    .sort((a, b) => b.rankScore - a.rankScore);

  const startIndex = options.cursor
    ? Math.max(0, ranked.findIndex((r) => r.contentId === options.cursor) + 1)
    : 0;
  const page = ranked.slice(startIndex, startIndex + limit);

  return {
    items: page,
    nextCursor: page.length === limit ? page[page.length - 1].contentId : null,
  };
}

async function getSubscribedCreatorIds(userId: string): Promise<Set<string>> {
  const rows = await prisma.subscription.findMany({
    where: { subscriberId: userId },
    select: { creatorId: true },
  });
  return new Set(rows.map((r) => r.creatorId));
}

async function getRecentlySeenContentIds(userId: string): Promise<Set<string>> {
  const since = new Date(Date.now() - SEEN_CONTENT_COOLDOWN_HOURS * 3_600_000);
  const rows = await prisma.userBehaviorLog.findMany({
    where: { userId, createdAt: { gte: since } },
    select: { contentId: true },
    distinct: ["contentId"],
  });
  return new Set(rows.map((r) => r.contentId));
}

function weightedAverageDifficulty(
  preferences: { difficultyPreference: number; sampleCount: number }[],
): number {
  if (preferences.length === 0) return 2.5; // neutral mid-difficulty for cold start
  const totalWeight = preferences.reduce((sum, p) => sum + p.sampleCount, 0);
  if (totalWeight === 0) return 2.5;
  return preferences.reduce((sum, p) => sum + p.difficultyPreference * p.sampleCount, 0) / totalWeight;
}

/** Deterministic per-(user,content) jitter — stable across a single ranking
 *  call without needing a stored random seed. Not cryptographic. */
function pseudoRandom(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}
