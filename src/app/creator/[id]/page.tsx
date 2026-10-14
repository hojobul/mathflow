import Link from "next/link";
import { notFound } from "next/navigation";
import { ContentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { SubscribeButton } from "@/components/content/SubscribeButton";
import { getSessionAppUser } from "@/lib/auth/currentUser";
import { ContentCard } from "@/components/content/ContentCard";
import { PUBLICLY_LISTED } from "@/lib/content/access";

export const dynamic = "force-dynamic";

/** 채널 페이지: 프로필, 구독, 올린 콘텐츠. 본인 채널이면 임시저장·비공개·일부공개도 함께 보인다. */
export default async function CreatorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getSessionAppUser();
  const isOwner = viewer?.id === id;

  const creator = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      displayName: true,
      createdAt: true,
      authoredContent: {
        where: isOwner ? { status: { not: ContentStatus.ARCHIVED } } : PUBLICLY_LISTED,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          type: true,
          title: true,
          summary: true,
          difficulty: true,
          estimatedSeconds: true,
          inShorts: true,
          status: true,
          visibility: true,
          createdAt: true,
          categories: { select: { category: { select: { name: true } } } },
          _count: { select: { likes: true } },
        },
      },
    },
  });
  if (!creator) notFound();

  const [subscriberCount, subscribedByViewer] = await Promise.all([
    prisma.subscription.count({ where: { creatorId: creator.id } }),
    viewer && !isOwner
      ? prisma.subscription.findUnique({
          where: { subscriberId_creatorId: { subscriberId: viewer.id, creatorId: creator.id } },
        })
      : null,
  ]);

  const drafts = creator.authoredContent.filter((c) => c.status === ContentStatus.DRAFT);
  const published = creator.authoredContent.filter((c) => c.status !== ContentStatus.DRAFT);
  const shortCount = published.filter((c) => c.inShorts).length;
  const card = (c: (typeof creator.authoredContent)[number]) => ({ ...c, editable: isOwner });

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
            구독자 {subscriberCount} / 콘텐츠 {published.length} / 쇼츠 {shortCount} / 가입{" "}
            {creator.createdAt.toLocaleDateString("ko-KR")}
          </p>
        </div>
        {isOwner ? (
          <Link href="/editor" className="btn-primary">
            새 콘텐츠
          </Link>
        ) : (
          <SubscribeButton creatorId={creator.id} initialSubscribed={!!subscribedByViewer} initialCount={subscriberCount} />
        )}
      </header>

      {isOwner && drafts.length > 0 && (
        <section>
          <h2 className="mb-1 text-xs font-bold tracking-wide">임시저장 {drafts.length}</h2>
          {drafts.map((item) => (
            <ContentCard key={item.id} item={card(item)} />
          ))}
        </section>
      )}

      <section>
        <h2 className="mb-1 text-xs font-bold tracking-wide">업로드</h2>
        {published.length === 0 ? (
          <p className="py-4 text-sm text-muted">{isOwner ? "발행한 콘텐츠가 없습니다." : "발행한 콘텐츠 없음"}</p>
        ) : (
          published.map((item) => <ContentCard key={item.id} item={card(item)} />)
        )}
      </section>
    </main>
  );
}
