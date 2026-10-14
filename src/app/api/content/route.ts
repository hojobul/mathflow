import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionAppUser } from "@/lib/auth/currentUser";
import { PUBLICLY_LISTED } from "@/lib/content/access";
import { SaveContentInput, saveContent, validateForPublish } from "@/lib/content/save";

/** GET /api/content — 공개된 콘텐츠 목록(최신순). */
export async function GET(req: NextRequest) {
  const limitParam = req.nextUrl.searchParams.get("limit");
  const limit = limitParam ? Math.min(50, Math.max(1, Number(limitParam))) : 20;

  const items = await prisma.content.findMany({
    where: PUBLICLY_LISTED,
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
      inShorts: true,
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
 * POST /api/content — 새 콘텐츠를 발행하거나(status=PUBLISHED) 임시저장한다(status=DRAFT).
 * 로그인이 필요하다.
 */
export async function POST(req: NextRequest) {
  // 인증 확인(DB + 외부 호출)과 본문 파싱은 서로 독립이라 같이 기다린다.
  const [author, parsed] = await Promise.all([
    getSessionAppUser(),
    req
      .json()
      .catch(() => null)
      .then((json) => SaveContentInput.safeParse(json)),
  ]);
  if (!author) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  if (parsed.data.status === "PUBLISHED") {
    const problem = validateForPublish(parsed.data);
    if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  }

  const content = await saveContent(author.id, parsed.data);
  return NextResponse.json({ content }, { status: 201 });
}
