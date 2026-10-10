import Link from "next/link";
import { LibraryEntryType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionAppUser } from "@/lib/auth/currentUser";
import { ContentCard } from "@/components/content/ContentCard";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "scrap", type: LibraryEntryType.SCRAP, label: "스크랩북", empty: "스크랩한 콘텐츠가 없어요. 콘텐츠 상세에서 🔖를 눌러 보세요." },
  { key: "wrong", type: LibraryEntryType.WRONG_ANSWER, label: "오답노트", empty: "틀린 문제가 없어요. 문제를 풀다 틀리면 여기에 자동으로 모여요." },
  { key: "album", type: LibraryEntryType.CONCEPT_ALBUM, label: "개념 앨범", empty: "저장한 개념이 없어요. 개념 콘텐츠에서 🗂를 눌러 보세요." },
] as const;

/** 나의 수학 서재 — 스크랩북 / 오답노트 / 개념 앨범. */
export default async function MyLibraryPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const active = TABS.find((t) => t.key === tab) ?? TABS[0];
  const user = await getSessionAppUser();

  if (!user) {
    return (
      <main className="page">
        <h1 className="page-title">나의 서재</h1>
        <p className="text-sm text-muted">로그인하면 스크랩북, 오답노트, 개념 앨범을 쓸 수 있어요.</p>
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
      <h1 className="page-title">나의 서재</h1>
      <div className="flex gap-2">
        {TABS.map((t) => (
          <Link key={t.key} href={`/me/library?tab=${t.key}`} className={t.key === active.key ? "chip chip-active" : "chip"}>
            {t.label} {countOf(t.type)}
          </Link>
        ))}
      </div>
      <div className="flex flex-col gap-3">
        {entries.map((e) => (
          <ContentCard key={e.content.id} item={e.content} />
        ))}
        {entries.length === 0 && <p className="text-sm text-muted">{active.empty}</p>}
      </div>
    </main>
  );
}
