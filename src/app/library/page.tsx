import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ContentCard, TYPE_LABEL } from "@/components/content/ContentCard";

export const dynamic = "force-dynamic"; // always reflect the latest published content

const FILTERS = ["ALL", "PROBLEM", "HISTORY", "ANECDOTE", "CONCEPT"] as const;

export default async function LibraryPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams;
  const active = FILTERS.find((f) => f === type) ?? "ALL";

  const items = await prisma.content.findMany({
    where: { status: "PUBLISHED", ...(active !== "ALL" ? { type: active } : {}) },
    orderBy: { createdAt: "desc" },
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

  return (
    <main className="page">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="page-title">탐색</h1>
          <p className="text-sm text-muted">발행된 콘텐츠 {items.length}개</p>
        </div>
        <Link href="/editor" className="btn-primary">
          + 새 콘텐츠
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={f === "ALL" ? "/library" : `/library?type=${f}`}
            className={f === active ? "chip chip-active" : "chip"}
          >
            {f === "ALL" ? "전체" : TYPE_LABEL[f]}
          </Link>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <ContentCard key={item.id} item={item} />
        ))}
        {items.length === 0 && <p className="text-sm text-muted">아직 콘텐츠가 없습니다.</p>}
      </div>
    </main>
  );
}
