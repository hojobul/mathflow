import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SubscribeButton } from "@/components/content/SubscribeButton";
import { getSessionAppUser } from "@/lib/auth/currentUser";
import { ContentCard } from "@/components/content/ContentCard";

export const dynamic = "force-dynamic";

/** 채널 페이지: 프로필, 구독, 올린 콘텐츠 목록. */
export default async function CreatorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [creator, viewer] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        displayName: true,
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
            isShort: true,
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

  const shortCount = creator.authoredContent.filter((c) => c.isShort).length;

  return (
    <main className="page">
      <header className="flex flex-wrap items-end gap-5 border-b-2 border-foreground pb-5">
        <div
          className="flex h-20 w-20 shrink-0 items-center justify-center bg-foreground font-serif text-4xl font-bold"
          style={{ color: "var(--accent-ink)" }}
        >
          {creator.displayName.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="page-title truncate">{creator.displayName}</h1>
          <p className="meta mt-1">
            구독자 {subscriberCount} / 콘텐츠 {creator.authoredContent.length} / 쇼츠 {shortCount} / 가입{" "}
            {creator.createdAt.toLocaleDateString("ko-KR")}
          </p>
        </div>
        <SubscribeButton creatorId={creator.id} initialSubscribed={!!subscribedByViewer} initialCount={subscriberCount} />
      </header>

      <section>
        <h2 className="mb-1 text-xs font-bold tracking-wide">업로드</h2>
        {creator.authoredContent.length === 0 ? (
          <p className="py-4 text-sm text-muted">발행한 콘텐츠 없음</p>
        ) : (
          creator.authoredContent.map((item) => <ContentCard key={item.id} item={item} />)
        )}
      </section>
    </main>
  );
}
