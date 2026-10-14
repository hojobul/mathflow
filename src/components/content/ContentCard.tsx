import Link from "next/link";

export const TYPE_LABEL: Record<string, string> = {
  PROBLEM: "문제",
  HISTORY: "수학사",
  ANECDOTE: "비하인드",
  CONCEPT: "개념",
};

/** 난이도 1~5를 눈금 5칸으로 표시한다. */
export function Difficulty({ level }: { level: number }) {
  return (
    <span className="inline-flex items-center gap-1.5" title={`난이도 ${level}`}>
      <span className="flex items-end gap-px" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((n) => (
          <span
            key={n}
            className={`w-1 ${n <= level ? "bg-foreground" : "bg-line-strong/50"}`}
            style={{ height: 4 + n * 2 }}
          />
        ))}
      </span>
      <span className="meta">난이도 {level}</span>
    </span>
  );
}

export interface ContentCardData {
  id: string;
  type: string;
  title: string;
  summary: string | null;
  difficulty: number;
  estimatedSeconds: number;
  inShorts?: boolean;
  status?: string;
  visibility?: string;
  editable?: boolean;
  categories: { category: { name: string } }[];
  author?: { id: string; displayName: string } | null;
  _count?: { likes: number };
}

const VISIBILITY_LABEL: Record<string, string> = { UNLISTED: "일부공개", PRIVATE: "비공개" };

/** 목록(탐색·검색·채널·서재)에서 공통으로 쓰는 한 줄 항목. editable이면 수정 링크를 함께 보여준다. */
export function ContentCard({ item }: { item: ContentCardData }) {
  const isDraft = item.status === "DRAFT";
  const href = isDraft ? `/editor?edit=${item.id}` : `/library/${item.id}`;
  const visibilityLabel = item.visibility ? VISIBILITY_LABEL[item.visibility] : undefined;

  return (
    <div className="row-link relative">
      <Link href={href} className="block">
        <div className="mb-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          {isDraft && <span className="tag border-danger text-danger">임시저장</span>}
          {visibilityLabel && <span className="tag">{visibilityLabel}</span>}
          <span className="tag">{TYPE_LABEL[item.type] ?? item.type}</span>
          {item.inShorts && (
            <span className="tag bg-foreground" style={{ color: "var(--accent-ink)" }}>
              쇼츠
            </span>
          )}
          <Difficulty level={item.difficulty} />
          <span className="meta">{item.estimatedSeconds}초</span>
          {item.categories.map((c) => (
            <span key={c.category.name} className="text-xs text-muted">
              #{c.category.name}
            </span>
          ))}
        </div>
        <h2 className="font-serif text-lg font-bold leading-snug">{item.title || "제목 없음"}</h2>
        {item.summary && <p className="mt-1 line-clamp-2 text-sm text-muted">{item.summary}</p>}
        {(item.author || item._count) && (
          <p className="meta mt-2">
            {item.author?.displayName}
            {item.author && item._count && " / "}
            {item._count && `좋아요 ${item._count.likes}`}
          </p>
        )}
      </Link>
      {item.editable && (
        <Link href={`/editor?edit=${item.id}`} className="chip absolute right-0 top-3 !h-7 text-xs">
          수정
        </Link>
      )}
    </div>
  );
}
