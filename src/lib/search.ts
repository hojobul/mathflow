import { PUBLICLY_LISTED } from "@/lib/content/access";
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
      ...PUBLICLY_LISTED,
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
      inShorts: true,
      categories: { select: { category: { select: { name: true } } } },
      author: { select: { id: true, displayName: true } },
      _count: { select: { likes: true } },
    },
  });
}

/** 채널(크리에이터) 검색: 이름 부분 일치, 발행한 콘텐츠가 1개 이상인 사용자만. */
export async function searchCreators(rawQuery: string, limit = 10) {
  const q = rawQuery.trim().replace(/^@/, "").slice(0, 60);
  if (!q) return [];

  return prisma.user.findMany({
    where: {
      displayName: { contains: q, mode: "insensitive" },
      authoredContent: { some: PUBLICLY_LISTED },
    },
    orderBy: { subscribers: { _count: "desc" } },
    take: limit,
    select: {
      id: true,
      displayName: true,
      _count: {
        select: {
          subscribers: true,
          authoredContent: { where: PUBLICLY_LISTED },
        },
      },
    },
  });
}
