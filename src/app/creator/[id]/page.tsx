import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SubscribeButton } from "@/components/content/SubscribeButton";
import { getSessionAppUser } from "@/lib/auth/currentUser";
import { ContentCard } from "@/components/content/ContentCard";

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
            categories: { select: { category: { select: { name: true } } } },
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
    <main className="page">
      <div className="card overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] opacity-90" />
        <div className="flex flex-wrap items-center gap-4 px-5 pb-5">
          <div
            className="-mt-8 flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-4 border-surface bg-accent text-3xl font-bold"
            style={{ color: "var(--accent-ink)" }}
          >
            {creator.displayName.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1 pt-2">
            <h1 className="truncate text-xl font-bold">{creator.displayName}</h1>
            <p className="text-sm text-muted">
              구독자 {subscriberCount}명 · 콘텐츠 {creator.authoredContent.length}개
            </p>
          </div>
          <SubscribeButton creatorId={creator.id} initialSubscribed={!!subscribedByViewer} initialCount={subscriberCount} />
        </div>
      </div>

      <h2 className="font-semibold">업로드한 콘텐츠</h2>
      <div className="flex flex-col gap-3">
        {creator.authoredContent.length === 0 ? (
          <p className="text-sm text-muted">아직 발행한 콘텐츠가 없어요.</p>
        ) : (
          creator.authoredContent.map((item) => <ContentCard key={item.id} item={item} />)
        )}
      </div>
    </main>
  );
}
