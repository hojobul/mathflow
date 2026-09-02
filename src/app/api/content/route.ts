import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ContentStatus, ContentType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  extractLatexExpressions,
  extractSearchText,
  MAX_LATEX_SOURCE_LENGTH,
  type ContentBody,
} from "@/lib/content/blocks";
import { getSessionAppUser } from "@/lib/auth/currentUser";

const ContentBlockSchema = z.discriminatedUnion("kind", [
  z.object({ id: z.string(), kind: z.literal("text"), text: z.string() }),
  z.object({
    id: z.string(),
    kind: z.literal("latex"),
    source: z.string().max(MAX_LATEX_SOURCE_LENGTH),
    display: z.enum(["inline", "block"]),
  }),
  z.object({ id: z.string(), kind: z.literal("image"), url: z.string(), alt: z.string() }),
  z.object({
    id: z.string(),
    kind: z.literal("widget"),
    widgetType: z.literal("graph"),
    expression: z.string(),
    variables: z.record(z.string(), z.number()),
  }),
]);

const CreateContentBody = z.object({
  type: z.nativeEnum(ContentType),
  title: z.string().min(1).max(200),
  summary: z.string().max(500).optional(),
  difficulty: z.number().int().min(1).max(5),
  estimatedSeconds: z.number().int().min(10).max(3600),
  categories: z.array(z.string().min(1)).max(5).default([]),
  body: z.object({ blocks: z.array(ContentBlockSchema).min(1) }),
});

/** GET /api/content — published content list (newest first), for the library page. */
export async function GET(req: NextRequest) {
  const limitParam = req.nextUrl.searchParams.get("limit");
  const limit = limitParam ? Math.min(50, Math.max(1, Number(limitParam))) : 20;

  const items = await prisma.content.findMany({
    where: { status: ContentStatus.PUBLISHED },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      type: true,
      title: true,
      summary: true,
      body: true,
      difficulty: true,
      estimatedSeconds: true,
      createdAt: true,
      categories: { select: { category: { select: { name: true, slug: true } } } },
      author: { select: { displayName: true } },
    },
  });

  return NextResponse.json({
    items: items.map(({ categories, ...rest }) => ({ ...rest, categories: categories.map((c) => c.category) })),
  });
}

/**
 * POST /api/content — create + publish one content item (크리에이터 업로드).
 * Requires a real session — guests can browse but not publish.
 */
export async function POST(req: NextRequest) {
  // Auth resolution (a DB round trip plus a call out to Neon Auth) and body
  // parsing (no I/O) are independent — overlap them instead of paying for
  // both back to back.
  const [author, parsed] = await Promise.all([
    getSessionAppUser(),
    req
      .json()
      .catch(() => null)
      .then((json) => CreateContentBody.safeParse(json)),
  ]);
  if (!author) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const input = parsed.data;
  const body = input.body as ContentBody;

  const categoryIds = await resolveCategoryIds(input.categories);

  const content = await prisma.content.create({
    data: {
      type: input.type,
      status: ContentStatus.PUBLISHED,
      title: input.title,
      summary: input.summary,
      body: body as unknown as Prisma.InputJsonValue,
      searchText: extractSearchText(body),
      latexExpressions: extractLatexExpressions(body),
      difficulty: input.difficulty,
      estimatedSeconds: input.estimatedSeconds,
      authorId: author.id,
      categories: { create: categoryIds.map((categoryId) => ({ categoryId })) },
    },
    select: { id: true, title: true },
  });

  return NextResponse.json({ content }, { status: 201 });
}

/**
 * Resolves category names to ids in exactly 2 round trips regardless of
 * how many categories were given (was N upserts — the dominant cost in a
 * slow publish). `createMany` + `skipDuplicates` is also race-safe: unlike
 * an upsert loop, two concurrent requests creating the same new category
 * can't violate the unique index (one create wins, the other is silently
 * skipped, and both then read the same row) — this was the root cause of
 * the 500 an upload with a duplicate category used to hit.
 */
async function resolveCategoryIds(names: string[]): Promise<string[]> {
  const bySlug = new Map(names.map((name) => [slugify(name), name]));
  if (bySlug.size === 0) return [];

  await prisma.categoryTag.createMany({
    data: [...bySlug].map(([slug, name]) => ({ slug, name })),
    skipDuplicates: true,
  });
  const categories = await prisma.categoryTag.findMany({
    where: { slug: { in: [...bySlug.keys()] } },
    select: { id: true },
  });
  return categories.map((c) => c.id);
}

function slugify(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return slug || `category-${Date.now()}`;
}
