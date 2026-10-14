import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ContentStatus, ContentType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  extractLatexExpressions,
  extractSearchText,
  MAX_LATEX_SOURCE_LENGTH,
  SHORT_MAX_BLOCKS,
  SHORT_MAX_SECONDS,
  SHORT_MAX_TEXT_CHARS,
  bodyTextLength,
  type ContentBody,
} from "@/lib/content/blocks";
import { getSessionAppUser } from "@/lib/auth/currentUser";
import { normalizeExpression } from "@/lib/grading";

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

// PROBLEM-only, both optional: an ungraded problem is legal (answer
// omitted), and hints don't require an answer to exist.
const AnswerSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("numeric"), value: z.number(), tolerance: z.number().min(0).default(0) }),
  z.object({
    kind: z.literal("choice"),
    options: z.array(z.object({ id: z.string().min(1), text: z.string().min(1).max(200) })).min(2).max(6),
    correctOptionId: z.string().min(1),
  }),
  z.object({ kind: z.literal("expression"), raw: z.string().min(1).max(200) }),
]);
const HintDraftSchema = z.object({
  label: z.string().min(1).max(100),
  text: z.string().min(1).max(2000),
  isFullSolution: z.boolean().default(false),
});

const CreateContentBody = z.object({
  type: z.nativeEnum(ContentType),
  title: z.string().min(1).max(200),
  summary: z.string().max(500).optional(),
  difficulty: z.number().int().min(1).max(5),
  estimatedSeconds: z.number().int().min(10).max(3600),
  categories: z.array(z.string().min(1)).max(5).default([]),
  body: z.object({ blocks: z.array(ContentBlockSchema).min(1) }),
  isShort: z.boolean().default(false),
  answer: AnswerSchema.optional(),
  hints: z.array(HintDraftSchema).max(10).optional(),
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

  if (input.isShort) {
    const shortError = validateShort(body, input.estimatedSeconds);
    if (shortError) return NextResponse.json({ error: shortError }, { status: 400 });
  }

  const categoryIds = await resolveCategoryIds(input.categories);

  const content = await prisma.content.create({
    data: {
      type: input.type,
      status: ContentStatus.PUBLISHED,
      isShort: input.isShort,
      title: input.title,
      summary: input.summary,
      body: body as unknown as Prisma.InputJsonValue,
      searchText: extractSearchText(body),
      latexExpressions: extractLatexExpressions(body),
      difficulty: input.difficulty,
      estimatedSeconds: input.estimatedSeconds,
      authorId: author.id,
      categories: { create: categoryIds.map((categoryId) => ({ categoryId })) },
      answerKey: buildAnswerKey(input.answer),
      hints: input.hints?.length
        ? {
            create: input.hints.map((h, i) => ({
              order: i + 1,
              label: h.label,
              isFullSolution: h.isFullSolution,
              body: {
                blocks: [{ id: crypto.randomUUID(), kind: "text", text: h.text }],
              } as unknown as Prisma.InputJsonValue,
            })),
          }
        : undefined,
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

function buildAnswerKey(answer: z.infer<typeof AnswerSchema> | undefined): Prisma.InputJsonValue | undefined {
  if (!answer) return undefined;
  if (answer.kind === "expression") return { kind: "expression", normalized: normalizeExpression(answer.raw) };
  if (answer.kind === "choice" && !answer.options.some((o) => o.id === answer.correctOptionId)) return undefined;
  return answer as unknown as Prisma.InputJsonValue;
}

function validateShort(body: ContentBody, estimatedSeconds: number): string | null {
  const textChars = bodyTextLength(body);
  if (textChars > SHORT_MAX_TEXT_CHARS) return `쇼츠 본문은 ${SHORT_MAX_TEXT_CHARS}자까지 가능합니다 (현재 ${textChars}자)`;
  if (estimatedSeconds > SHORT_MAX_SECONDS) return `쇼츠는 예상 소요 시간이 ${SHORT_MAX_SECONDS}초 이하여야 합니다`;
  if (body.blocks.length > SHORT_MAX_BLOCKS) return `쇼츠는 블록 ${SHORT_MAX_BLOCKS}개까지 가능합니다`;
  return null;
}
