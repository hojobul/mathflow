import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ContentBodyView } from "@/components/content/ContentBodyView";
import { LikeButton } from "@/components/content/LikeButton";
import { SubscribeButton } from "@/components/content/SubscribeButton";
import { InteractiveGraphWidget } from "@/components/content/InteractiveGraphWidget";
import { HintLadder } from "@/components/content/HintLadder";
import { CommentSection } from "@/components/content/CommentSection";
import { getSessionAppUser } from "@/lib/auth/currentUser";
import { GUEST_USER_ID_CLIENT } from "@/lib/auth/constants";
import type { ContentBody } from "@/lib/content/blocks";
import { isGraphWidgetConfig } from "@/lib/content/widget";

const TYPE_LABEL: Record<string, string> = {
  PROBLEM: "문제",
  HISTORY: "수학사",
  ANECDOTE: "비하인드",
  CONCEPT: "개념",
};

export const dynamic = "force-dynamic";

export default async function ContentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [content, viewer] = await Promise.all([
    prisma.content.findUnique({
      where: { id, status: "PUBLISHED" },
      include: {
        categories: { select: { category: { select: { name: true } } } },
        hints: { orderBy: { order: "asc" }, select: { id: true, order: true, label: true, isFullSolution: true } },
        author: { select: { id: true, displayName: true } },
        _count: { select: { likes: true } },
      },
    }),
    getSessionAppUser(),
  ]);
  if (!content) notFound();
  const effectiveUserId = viewer?.id ?? GUEST_USER_ID_CLIENT;

  const [likedByViewer, subscriberCount, subscribedByViewer] = await Promise.all([
    viewer
      ? prisma.like.findUnique({ where: { userId_contentId: { userId: viewer.id, contentId: content.id } } })
      : null,
    content.author ? prisma.subscription.count({ where: { creatorId: content.author.id } }) : 0,
    viewer && content.author
      ? prisma.subscription.findUnique({
          where: { subscriberId_creatorId: { subscriberId: viewer.id, creatorId: content.author.id } },
        })
      : null,
  ]);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-6">
      <Link href="/library" className="text-sm text-black/50 hover:underline dark:text-white/50">
        ← 라이브러리
      </Link>

      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] text-black/50 dark:text-white/50">
          <span className="rounded bg-black/5 px-1.5 py-0.5 font-medium dark:bg-white/10">
            {TYPE_LABEL[content.type] ?? content.type}
          </span>
          <span>난이도 {content.difficulty}/5</span>
          <span>· 약 {content.estimatedSeconds}초</span>
          {content.categories.map((c) => (
            <span key={c.category.name} className="rounded-full border border-black/10 px-2 py-0.5 dark:border-white/15">
              {c.category.name}
            </span>
          ))}
        </div>
        <h1 className="text-xl font-semibold">{content.title}</h1>
        {content.summary && <p className="mt-1 text-sm text-black/60 dark:text-white/60">{content.summary}</p>}
        {content.author && (
          <Link href={`/creator/${content.author.id}`} className="mt-1 inline-block text-xs text-black/40 hover:underline dark:text-white/40">
            by {content.author.displayName}
          </Link>
        )}
      </div>

      <div className="flex items-center gap-2">
        <LikeButton contentId={content.id} initialLiked={!!likedByViewer} initialCount={content._count.likes} />
        {content.author && (
          <SubscribeButton
            creatorId={content.author.id}
            initialSubscribed={!!subscribedByViewer}
            initialCount={subscriberCount}
          />
        )}
      </div>

      <div className="rounded-md border border-black/10 p-4 dark:border-white/10">
        <ContentBodyView body={content.body as unknown as ContentBody} />
      </div>

      {isGraphWidgetConfig(content.widgetConfig) && <InteractiveGraphWidget config={content.widgetConfig} />}

      {content.hints.length > 0 && (
        <HintLadder contentId={content.id} userId={effectiveUserId} hints={content.hints} />
      )}

      <CommentSection contentId={content.id} />
    </main>
  );
}
