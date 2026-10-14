import Link from "next/link";
import { LibraryEntryType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionAppUser } from "@/lib/auth/currentUser";
import { ContentCard } from "@/components/content/ContentCard";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "scrap", type: LibraryEntryType.SCRAP, label: "스크랩북", empty: "스크랩한 콘텐츠 없음" },
  { key: "wrong", type: LibraryEntryType.WRONG_ANSWER, label: "오답노트", empty: "오답 없음. 문제를 틀리면 자동으로 저장됩니다." },
  { key: "album", type: LibraryEntryType.CONCEPT_ALBUM, label: "개념 앨범", empty: "저장한 개념 없음" },
] as const;

/** 서재: 스크랩북, 오답노트, 개념 앨범. */
export default async function MyLibraryPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const active = TABS.find((t) => t.key === tab) ?? TABS[0];
  const user = await getSessionAppUser();

  if (!user) {
    return (
      <main className="page">
        <h1 className="page-title">서재</h1>
        <p className="text-sm text-muted">서재는 로그인 후 사용할 수 있습니다.</p>
      </main>
    );
  }

  const [entries, counts] = await Promise.all([
    prisma.libraryEntry.findMany({
      where: { userId: user.id, type: active.type },
      orderBy: { createdAt: "desc" },
      select: {
        content: {
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
        },
      },
    }),
    prisma.libraryEntry.groupBy({ by: ["type"], where: { userId: user.id }, _count: true }),
  ]);
  const countOf = (t: LibraryEntryType) => counts.find((c) => c.type === t)?._count ?? 0;

  return (
    <main className="page">
      <h1 className="page-title">서재</h1>
      <div className="flex gap-2">
        {TABS.map((t) => (
          <Link key={t.key} href={`/me/library?tab=${t.key}`} className={t.key === active.key ? "chip chip-active" : "chip"}>
            {t.label}
            <span className="font-mono tabular-nums">{countOf(t.type)}</span>
          </Link>
        ))}
      </div>
      <div className="border-t-2 border-foreground">
        {entries.map((e) => (
          <ContentCard key={e.content.id} item={e.content} />
        ))}
        {entries.length === 0 && <p className="py-6 text-sm text-muted">{active.empty}</p>}
      </div>
    </main>
  );
}
