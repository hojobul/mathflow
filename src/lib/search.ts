import { ContentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * 제목·요약·본문(수식 LaTeX 원문 포함)·카테고리를 대소문자 구분 없이 부분 일치로 검색.
 * `Content.searchText`에 본문 텍스트와 수식 소스가 함께 들어 있어 "x^2" 같은 수식 조각도 찾는다.
 */
export async function searchContent(rawQuery: string, limit = 30) {
  const q = rawQuery.trim().slice(0, 100);
  if (!q) return [];
  const compact = q.replace(/\s+/g, "");

  return prisma.content.findMany({
    where: {
      status: ContentStatus.PUBLISHED,
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { summary: { contains: q, mode: "insensitive" } },
        { searchText: { contains: q, mode: "insensitive" } },
        // formula-style queries ("x^2+1") ignore the spacing used when authoring
        { latexExpressions: { hasSome: [q, compact] } },
        { categories: { some: { category: { name: { contains: q, mode: "insensitive" } } } } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      type: true,
      title: true,
      summary: true,
      difficulty: true,
      estimatedSeconds: true,
      categories: { select: { category: { select: { name: true } } } },
      author: { select: { id: true, displayName: true } },
      _count: { select: { likes: true } },
    },
  });
}
