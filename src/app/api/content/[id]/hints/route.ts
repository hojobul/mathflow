import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * 단계별 힌트 차등 열람: [힌트 1] -> [힌트 2] -> [전체 풀이].
 *
 * GET /api/content/:id/hints?userId=...&upTo=2
 * Reveals hints 1..upTo in order — a client can't skip ahead to hint 3
 * without having asked for (and been logged viewing) hints 1 and 2 first,
 * so hint usage stays an honest signal for the interest-score formula.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: contentId } = await params;
  const userId = req.nextUrl.searchParams.get("userId");
  const upToParam = req.nextUrl.searchParams.get("upTo");
  if (!userId || !upToParam) {
    return NextResponse.json({ error: "userId and upTo are required" }, { status: 400 });
  }
  const upTo = Number(upToParam);
  if (!Number.isInteger(upTo) || upTo < 1) {
    return NextResponse.json({ error: "upTo must be a positive integer" }, { status: 400 });
  }

  const hints = await prisma.hint.findMany({
    where: { contentId, order: { lte: upTo } },
    orderBy: { order: "asc" },
  });
  if (hints.length === 0) {
    return NextResponse.json({ error: "content or hints not found" }, { status: 404 });
  }

  const newlyRevealed = hints.filter((h) => h.order === upTo);
  if (newlyRevealed.length > 0) {
    await prisma.hintView.createMany({
      data: newlyRevealed.map((h) => ({ hintId: h.id, userId })),
    });
  }

  return NextResponse.json({
    hints: hints.map((h) => ({
      id: h.id,
      order: h.order,
      label: h.label,
      body: h.body,
      isFullSolution: h.isFullSolution,
    })),
  });
}
