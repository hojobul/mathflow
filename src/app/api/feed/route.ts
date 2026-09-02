import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPersonalizedFeed } from "@/lib/recommendation/feedService";

// TODO(auth): replace `userId` query param with the authenticated session's
// user id once an auth provider is wired in (see vercel:auth skill).
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
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  return NextResponse.json({ items: orderedItems, nextCursor });
}
