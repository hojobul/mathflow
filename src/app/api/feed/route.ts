import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPersonalizedFeed } from "@/lib/recommendation/feedService";

// `userId` is client-supplied (see useEffectiveUser) rather than resolved
// from the session here: feed reads are public, and personalizing a guest's
// feed by their shared guest id is intentional. Identity-sensitive actions
// (like/subscribe/publish) resolve the real session server-side instead —
// see src/lib/auth/currentUser.ts.
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const limitParam = req.nextUrl.searchParams.get("limit");
  const limit = limitParam ? Math.min(50, Math.max(1, Number(limitParam))) : undefined;
  const cursor = req.nextUrl.searchParams.get("cursor") ?? undefined;

  const { items, nextCursor } = await getPersonalizedFeed(userId, { limit, cursor });
  if (items.length === 0) {
    return NextResponse.json({ items: [], nextCursor: null });
  }

  const contents = await prisma.content.findMany({
    where: { id: { in: items.map((i) => i.contentId) } },
    select: {
      id: true,
      type: true,
      title: true,
      summary: true,
      body: true,
      difficulty: true,
      estimatedSeconds: true,
      widgetConfig: true,
      latexExpressions: true,
      categories: { select: { category: { select: { slug: true, name: true } } } },
      hints: { select: { id: true, order: true, label: true, isFullSolution: true } },
      author: { select: { id: true, displayName: true, avatarUrl: true } },
      _count: { select: { likes: true } },
    },
  });
  const byId = new Map(contents.map((c) => [c.id, c]));

  // Per-viewer like/subscribe state + subscriber counts, batched (3 queries
  // total) rather than one round trip per card — matters now that
  // publish-path latency work has shown how much N sequential round trips
  // costs on a remote DB.
  const authorIds = [...new Set(contents.map((c) => c.author?.id).filter((id): id is string => !!id))];
  const [likedRows, subscribedRows, subscriberCounts] = await Promise.all([
    prisma.like.findMany({ where: { userId, contentId: { in: [...byId.keys()] } }, select: { contentId: true } }),
    authorIds.length
      ? prisma.subscription.findMany({
          where: { subscriberId: userId, creatorId: { in: authorIds } },
          select: { creatorId: true },
        })
      : Promise.resolve([]),
    authorIds.length
      ? prisma.subscription.groupBy({ by: ["creatorId"], where: { creatorId: { in: authorIds } }, _count: true })
      : Promise.resolve([]),
  ]);
  const likedContentIds = new Set(likedRows.map((r) => r.contentId));
  const subscribedCreatorIds = new Set(subscribedRows.map((r) => r.creatorId));
  const subscriberCountByCreator = new Map(subscriberCounts.map((r) => [r.creatorId, r._count]));

  // Preserve rank order — the `findMany ... in` query doesn't guarantee it.
  const orderedItems = items
    .map((item) => {
      const content = byId.get(item.contentId);
      if (!content) return null;
      const { categories, hints, ...rest } = content;
      return {
        ...rest,
        categories: categories.map((c) => c.category),
        // Answer key never leaves the server; hints are metadata only —
        // bodies are fetched one at a time via /api/content/[id]/hints.
        hints: hints.map(({ id, order, label, isFullSolution }) => ({ id, order, label, isFullSolution })),
        rankScore: item.rankScore,
        likedByViewer: likedContentIds.has(item.contentId),
        subscribedByViewer: content.author ? subscribedCreatorIds.has(content.author.id) : false,
        subscriberCount: content.author ? (subscriberCountByCreator.get(content.author.id) ?? 0) : 0,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  return NextResponse.json({ items: orderedItems, nextCursor });
}
