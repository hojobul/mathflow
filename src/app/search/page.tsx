import Link from "next/link";
import { ContentCard } from "@/components/content/ContentCard";
import { searchContent, searchCreators } from "@/lib/search";

export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const [creators, items] = await Promise.all([searchCreators(q), searchContent(q)]);

  return (
    <main className="page">
      <h1 className="page-title">검색</h1>
      <form action="/search" className="flex gap-2">
        <input name="q" defaultValue={q} placeholder="제목, 본문, 수식(x^2), 카테고리, 채널" className="field flex-1" />
        <button type="submit" className="btn-primary">
          검색
        </button>
      </form>

      {q && (
        <p className="meta">
          &quot;{q}&quot; 채널 {creators.length}건 / 콘텐츠 {items.length}건
        </p>
      )}

      {creators.length > 0 && (
        <section>
          <h2 className="section-label mb-1">채널</h2>
          {creators.map((c) => (
            <Link key={c.id} href={`/creator/${c.id}`} className="row-link flex items-center gap-4">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center bg-foreground font-serif text-lg font-bold"
                style={{ color: "var(--accent-ink)" }}
              >
                {c.displayName.slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-serif text-lg font-bold">{c.displayName}</span>
                <span className="meta">
                  구독자 {c._count.subscribers} / 콘텐츠 {c._count.authoredContent}
                </span>
              </span>
            </Link>
          ))}
        </section>
      )}

      {(items.length > 0 || !q) && (
        <section>
          {q && <h2 className="section-label mb-1">콘텐츠</h2>}
          {items.map((item) => (
            <ContentCard key={item.id} item={item} />
          ))}
        </section>
      )}

      {q && items.length === 0 && creators.length === 0 && <p className="text-sm text-muted">결과 없음</p>}
    </main>
  );
}
