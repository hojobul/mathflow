import Link from "next/link";
import { prisma } from "@/lib/prisma";

const TYPE_LABEL: Record<string, string> = {
  PROBLEM: "문제",
  HISTORY: "수학사",
  ANECDOTE: "비하인드",
  CONCEPT: "개념",
};

export const dynamic = "force-dynamic"; // always reflect the latest published content

export default async function LibraryPage() {
  const items = await prisma.content.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      type: true,
      title: true,
      summary: true,
      difficulty: true,
      estimatedSeconds: true,
      categories: { select: { category: { select: { name: true } } } },
    },
  });

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">라이브러리</h1>
          <p className="text-sm text-black/60 dark:text-white/60">발행된 콘텐츠 {items.length}개</p>
        </div>
        <Link
          href="/editor"
          className="rounded-md border border-black/15 px-3 py-1.5 text-sm hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
        >
          + 새 콘텐츠
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-black/50 dark:text-white/50">아직 발행된 콘텐츠가 없습니다.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={`/library/${item.id}`}
                className="block rounded-md border border-black/10 p-4 hover:border-black/25 dark:border-white/10 dark:hover:border-white/30"
              >
                <div className="mb-1 flex flex-wrap items-center gap-2 text-[11px] text-black/50 dark:text-white/50">
                  <span className="rounded bg-black/5 px-1.5 py-0.5 font-medium dark:bg-white/10">
                    {TYPE_LABEL[item.type] ?? item.type}
                  </span>
                  <span>난이도 {item.difficulty}/5</span>
                  <span>· 약 {item.estimatedSeconds}초</span>
                  {item.categories.map((c) => (
                    <span key={c.category.name} className="rounded-full border border-black/10 px-2 py-0.5 dark:border-white/15">
                      {c.category.name}
                    </span>
                  ))}
                </div>
                <h2 className="font-medium">{item.title}</h2>
                {item.summary && <p className="mt-1 text-sm text-black/60 dark:text-white/60">{item.summary}</p>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
