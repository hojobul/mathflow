import Link from "next/link";

export const TYPE_LABEL: Record<string, string> = {
  PROBLEM: "문제",
  HISTORY: "수학사",
  ANECDOTE: "비하인드",
  CONCEPT: "개념",
};

export const TYPE_STYLE: Record<string, string> = {
  PROBLEM: "bg-accent-soft text-accent",
  HISTORY: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  ANECDOTE: "bg-pink-500/15 text-pink-700 dark:text-pink-300",
  CONCEPT: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
};

export interface ContentCardData {
  id: string;
  type: string;
  title: string;
  summary: string | null;
  difficulty: number;
  estimatedSeconds: number;
  categories: { category: { name: string } }[];
  author?: { id: string; displayName: string } | null;
  _count?: { likes: number };
}

/** 목록(라이브러리·검색·크리에이터·내 서재)에서 공통으로 쓰는 콘텐츠 카드. */
export function ContentCard({ item }: { item: ContentCardData }) {
  return (
    <Link href={`/library/${item.id}`} className="card card-hover block p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px]">
        <span className={`rounded-full px-2 py-0.5 font-semibold ${TYPE_STYLE[item.type] ?? "bg-surface-2"}`}>
          {TYPE_LABEL[item.type] ?? item.type}
        </span>
        <span className="text-muted">
          {"●".repeat(item.difficulty)}
          <span className="opacity-30">{"●".repeat(5 - item.difficulty)}</span>
        </span>
        <span className="text-muted">약 {item.estimatedSeconds}초</span>
        {item.categories.map((c) => (
          <span key={c.category.name} className="rounded-full border border-line px-2 py-0.5 text-muted">
            {c.category.name}
          </span>
        ))}
      </div>
      <h2 className="font-semibold leading-snug">{item.title}</h2>
      {item.summary && <p className="mt-1 line-clamp-2 text-sm text-muted">{item.summary}</p>}
      {(item.author || item._count) && (
        <p className="mt-2 text-xs text-muted">
          {item.author && <>by {item.author.displayName}</>}
          {item._count && <> · ♥ {item._count.likes}</>}
        </p>
      )}
    </Link>
  );
}
