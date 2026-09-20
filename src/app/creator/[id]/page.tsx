import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SubscribeButton } from "@/components/content/SubscribeButton";
import { getSessionAppUser } from "@/lib/auth/currentUser";

const TYPE_LABEL: Record<string, string> = {
  PROBLEM: "문제",
  HISTORY: "수학사",
  ANECDOTE: "비하인드",
  CONCEPT: "개념",
};

export const dynamic = "force-dynamic";

/** 크리에이터 채널 페이지 — 유튜브 채널처럼: 프로필 + 구독 + 업로드 목록. */
export default async function CreatorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [creator, viewer] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        displayName: true,
        avatarUrl: true,
        createdAt: true,
        authoredContent: {
          where: { status: "PUBLISHED" },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            type: true,
            title: true,
            summary: true,
            difficulty: true,
            estimatedSeconds: true,
            createdAt: true,
            _count: { select: { likes: true } },
          },
        },
      },
    }),
    getSessionAppUser(),
  ]);
  if (!creator) notFound();

  const [subscriberCount, subscribedByViewer] = await Promise.all([
    prisma.subscription.count({ where: { creatorId: creator.id } }),
    viewer
      ? prisma.subscription.findUnique({
          where: { subscriberId_creatorId: { subscriberId: viewer.id, creatorId: creator.id } },
        })
      : null,
  ]);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-6">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-black/10 text-xl font-semibold dark:bg-white/10">
          {creator.displayName.slice(0, 1).toUpperCase()}
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-semibold">{creator.displayName}</h1>
          <p className="text-xs text-black/50 dark:text-white/50">
            구독자 {subscriberCount}명 · 콘텐츠 {creator.authoredContent.length}개
          </p>
        </div>
        <SubscribeButton creatorId={creator.id} initialSubscribed={!!subscribedByViewer} initialCount={subscriberCount} />
      </div>

      <hr className="border-black/10 dark:border-white/10" />

      <div className="flex flex-col gap-3">
        {creator.authoredContent.length === 0 ? (
          <p className="text-sm text-black/50 dark:text-white/50">아직 발행한 콘텐츠가 없어요.</p>
        ) : (
          creator.authoredContent.map((item) => (
            <Link
              key={item.id}
              href={`/library/${item.id}`}
              className="rounded-md border border-black/10 p-4 hover:border-black/25 dark:border-white/10 dark:hover:border-white/30"
            >
              <div className="mb-1 flex flex-wrap items-center gap-2 text-[11px] text-black/50 dark:text-white/50">
                <span className="rounded bg-black/5 px-1.5 py-0.5 font-medium dark:bg-white/10">
                  {TYPE_LABEL[item.type] ?? item.type}
                </span>
                <span>난이도 {item.difficulty}/5</span>
                <span>♥ {item._count.likes}</span>
              </div>
              <h2 className="font-medium">{item.title}</h2>
              {item.summary && <p className="mt-1 text-sm text-black/60 dark:text-white/60">{item.summary}</p>}
            </Link>
          ))
        )}
      </div>
    </main>
  );
}
