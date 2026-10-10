import { ContentCard } from "@/components/content/ContentCard";
import { searchContent } from "@/lib/search";

export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const items = await searchContent(q);

  return (
    <main className="page">
      <h1 className="page-title">검색</h1>
      <form action="/search" className="flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="제목, 내용, 수식(예: x^2), 카테고리"
          className="flex-1 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm outline-none focus:border-accent"
        />
        <button type="submit" className="btn-primary">
          검색
        </button>
      </form>

      {q && (
        <p className="text-sm text-muted">
          “{q}” 검색 결과 {items.length}개
        </p>
      )}
      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <ContentCard key={item.id} item={item} />
        ))}
        {q && items.length === 0 && <p className="text-sm text-muted">결과가 없어요. 다른 단어로 찾아보세요.</p>}
      </div>
    </main>
  );
}
