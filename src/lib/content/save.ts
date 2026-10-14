import { z } from "zod";
import { ContentStatus, ContentType, ContentVisibility, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  MAX_LATEX_SOURCE_LENGTH,
  SHORT_MAX_BLOCKS,
  SHORT_MAX_SECONDS,
  SHORT_MAX_TEXT_CHARS,
  bodyTextLength,
  extractLatexExpressions,
  extractSearchText,
  type ContentBody,
} from "@/lib/content/blocks";
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

/** 임시저장과 발행이 같은 형태를 쓴다. 임시저장은 비어 있는 항목을 허용하고, 발행할 때만 아래에서 엄격히 검사한다. */
export const SaveContentInput = z.object({
  status: z.enum(["DRAFT", "PUBLISHED"]).default("PUBLISHED"),
  visibility: z.nativeEnum(ContentVisibility).default(ContentVisibility.PUBLIC),
  inFeed: z.boolean().default(true),
  inShorts: z.boolean().default(false),
  type: z.nativeEnum(ContentType),
  title: z.string().max(200).default(""),
  summary: z.string().max(500).optional(),
  difficulty: z.number().int().min(1).max(5).default(2),
  estimatedSeconds: z.number().int().min(10).max(3600).default(90),
  categories: z.array(z.string().min(1)).max(5).default([]),
  body: z.object({ blocks: z.array(ContentBlockSchema) }),
  answer: AnswerSchema.optional(),
  hints: z.array(HintDraftSchema).max(10).optional(),
});
export type SaveContentInput = z.infer<typeof SaveContentInput>;

/** 발행 전 검사. 문제가 있으면 사용자에게 보여줄 문장을 돌려준다. */
export function validateForPublish(input: SaveContentInput): string | null {
  const body = input.body as ContentBody;
  if (!input.title.trim()) return "제목이 필요합니다.";
  const hasContent = body.blocks.some(
    (b) => (b.kind === "text" && b.text.trim()) || (b.kind === "latex" && b.source.trim()) || b.kind === "widget",
  );
  if (!hasContent) return "본문이 필요합니다. 작성 중인 내용은 임시저장으로 보관할 수 있습니다.";
  if (!input.inFeed && !input.inShorts) return "노출 위치를 하나 이상 선택해야 합니다.";
  if (input.inShorts) {
    const chars = bodyTextLength(body);
    if (chars > SHORT_MAX_TEXT_CHARS) return `쇼츠 본문은 ${SHORT_MAX_TEXT_CHARS}자까지 가능합니다 (현재 ${chars}자).`;
    if (input.estimatedSeconds > SHORT_MAX_SECONDS) return `쇼츠는 예상 소요 시간이 ${SHORT_MAX_SECONDS}초 이하여야 합니다.`;
    if (body.blocks.length > SHORT_MAX_BLOCKS) return `쇼츠는 블록 ${SHORT_MAX_BLOCKS}개까지 가능합니다.`;
  }
  return null;
}

function buildAnswerKey(answer: SaveContentInput["answer"]): Prisma.InputJsonValue | typeof Prisma.DbNull {
  if (!answer) return Prisma.DbNull;
  if (answer.kind === "expression") {
    // raw는 작성자가 다시 편집할 때 원문을 보여주기 위한 값이고 클라이언트에는 나가지 않는다.
    return { kind: "expression", normalized: normalizeExpression(answer.raw), raw: answer.raw };
  }
  if (answer.kind === "choice" && !answer.options.some((o) => o.id === answer.correctOptionId)) return Prisma.DbNull;
  return answer as unknown as Prisma.InputJsonValue;
}

function slugify(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return slug || `category-${Date.now()}`;
}

/** 카테고리 이름 → id. 개수와 무관하게 쿼리 2번이고 동시 요청에도 안전하다(createMany + skipDuplicates). */
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

export class NotOwnerError extends Error {}

/**
 * 새 콘텐츠를 만들거나(existingId 없음) 기존 콘텐츠를 덮어쓴다(작성자만).
 * 덮어쓸 때 카테고리와 힌트는 통째로 교체한다.
 */
export async function saveContent(authorId: string, input: SaveContentInput, existingId?: string) {
  if (existingId) {
    const existing = await prisma.content.findUnique({ where: { id: existingId }, select: { authorId: true } });
    if (!existing || existing.authorId !== authorId) throw new NotOwnerError();
  }

  const body = input.body as ContentBody;
  const categoryIds = await resolveCategoryIds(input.categories);
  const hints = (input.hints ?? []).map((h, i) => ({
    order: i + 1,
    label: h.label,
    isFullSolution: h.isFullSolution,
    body: { blocks: [{ id: crypto.randomUUID(), kind: "text", text: h.text }] } as unknown as Prisma.InputJsonValue,
  }));

  const fields = {
    type: input.type,
    status: input.status === "PUBLISHED" ? ContentStatus.PUBLISHED : ContentStatus.DRAFT,
    visibility: input.visibility,
    inFeed: input.inFeed,
    inShorts: input.inShorts,
    title: input.title.trim(),
    summary: input.summary,
    body: body as unknown as Prisma.InputJsonValue,
    searchText: extractSearchText(body),
    latexExpressions: extractLatexExpressions(body),
    difficulty: input.difficulty,
    estimatedSeconds: input.estimatedSeconds,
    answerKey: buildAnswerKey(input.type === "PROBLEM" ? input.answer : undefined),
  };

  if (!existingId) {
    return prisma.content.create({
      data: {
        ...fields,
        authorId,
        categories: { create: categoryIds.map((categoryId) => ({ categoryId })) },
        hints: hints.length ? { create: hints } : undefined,
      },
      select: { id: true, title: true, status: true },
    });
  }

  const [, , updated] = await prisma.$transaction([
    prisma.contentCategory.deleteMany({ where: { contentId: existingId } }),
    prisma.hint.deleteMany({ where: { contentId: existingId } }),
    prisma.content.update({
      where: { id: existingId },
      data: {
        ...fields,
        categories: { create: categoryIds.map((categoryId) => ({ categoryId })) },
        hints: hints.length ? { create: hints } : undefined,
      },
      select: { id: true, title: true, status: true },
    }),
  ]);
  return updated;
}
