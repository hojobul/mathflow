import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PUBLICLY_LISTED } from "@/lib/content/access";
import { ContentCard, TYPE_LABEL } from "@/components/content/ContentCard";

export const dynamic = "force-dynamic"; // 항상 최신 발행 상태를 보여준다

const FILTERS = ["ALL", "PROBLEM", "HISTORY", "ANECDOTE", "CONCEPT"] as const;

export default async function LibraryPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams;
  const active = FILTERS.find((f) => f === type) ?? "ALL";

  const items = await prisma.content.findMany({
    where: { ...PUBLICLY_LISTED, ...(active !== "ALL" ? { type: active } : {}) },
    orderBy: { createdAt: "desc" },
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

  return (
    <main className="page">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="page-title">탐색</h1>
          <p className="meta mt-1">콘텐츠 {items.length}건</p>
        </div>
        <Link href="/editor" className="btn-primary">
          새 콘텐츠
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link key={f} href={f === "ALL" ? "/library" : `/library?type=${f}`} className={f === active ? "chip chip-active" : "chip"}>
            {f === "ALL" ? "전체" : TYPE_LABEL[f]}
          </Link>
        ))}
      </div>

      <div className="border-t-2 border-foreground">
        {items.map((item) => (
          <ContentCard key={item.id} item={item} />
        ))}
        {items.length === 0 && <p className="py-6 text-sm text-muted">콘텐츠 없음</p>}
      </div>
    </main>
  );
}
