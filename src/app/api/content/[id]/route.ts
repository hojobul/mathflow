import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionAppUser } from "@/lib/auth/currentUser";
import { NotOwnerError, SaveContentInput, saveContent, validateForPublish } from "@/lib/content/save";

/** GET /api/content/:id — 작성자 전용. 에디터에 다시 불러올 때 쓰는 원본(정답·힌트 포함). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionAppUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });

  const content = await prisma.content.findUnique({
    where: { id },
    include: {
      categories: { select: { category: { select: { name: true } } } },
      hints: { orderBy: { order: "asc" } },
    },
  });
  if (!content || content.authorId !== user.id) {
    return NextResponse.json({ error: "수정할 수 없는 콘텐츠입니다" }, { status: 404 });
  }

  return NextResponse.json({
    id: content.id,
    status: content.status,
    visibility: content.visibility,
    inFeed: content.inFeed,
    inShorts: content.inShorts,
    type: content.type,
    title: content.title,
    summary: content.summary ?? "",
    difficulty: content.difficulty,
    estimatedSeconds: content.estimatedSeconds,
    categories: content.categories.map((c) => c.category.name),
    body: content.body,
    answerKey: content.answerKey,
    hints: content.hints.map((h) => {
      const blocks = (h.body as { blocks?: { kind: string; text?: string }[] } | null)?.blocks ?? [];
      return {
        label: h.label,
        text: blocks.map((b) => (b.kind === "text" ? b.text : "")).join("\n").trim(),
        isFullSolution: h.isFullSolution,
      };
    }),
  });
}

/** PUT /api/content/:id — 작성자 전용. 저장 내용을 통째로 덮어쓴다(임시저장·수정·발행 공통). */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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

  try {
    const content = await saveContent(author.id, parsed.data, id);
    return NextResponse.json({ content });
  } catch (err) {
    if (err instanceof NotOwnerError) {
      return NextResponse.json({ error: "수정할 수 없는 콘텐츠입니다" }, { status: 404 });
    }
    throw err;
  }
}

/** DELETE /api/content/:id — 작성자 전용. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionAppUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });

  const { count } = await prisma.content.deleteMany({ where: { id, authorId: user.id } });
  if (count === 0) return NextResponse.json({ error: "삭제할 수 없는 콘텐츠입니다" }, { status: 404 });
  return NextResponse.json({ deleted: true });
}
