import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ContentBodyView } from "@/components/content/ContentBodyView";
import { LikeButton } from "@/components/content/LikeButton";
import { ScrapButton } from "@/components/content/ScrapButton";
import { SubscribeButton } from "@/components/content/SubscribeButton";
import { InteractiveGraphWidget } from "@/components/content/InteractiveGraphWidget";
import { HintLadder } from "@/components/content/HintLadder";
import { ProblemSolver } from "@/components/content/ProblemSolver";
import { CommentSection } from "@/components/content/CommentSection";
import { TYPE_LABEL, TYPE_STYLE } from "@/components/content/ContentCard";
import { toPublicAnswerSpec } from "@/lib/grading";
import { getSessionAppUser } from "@/lib/auth/currentUser";
import { GUEST_USER_ID_CLIENT } from "@/lib/auth/constants";
import type { ContentBody } from "@/lib/content/blocks";
import { isGraphWidgetConfig } from "@/lib/content/widget";

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
  const answerSpec = toPublicAnswerSpec(content.answerKey);

  const [likedByViewer, subscriberCount, subscribedByViewer, savedEntries] = await Promise.all([
    viewer
      ? prisma.like.findUnique({ where: { userId_contentId: { userId: viewer.id, contentId: content.id } } })
      : null,
    content.author ? prisma.subscription.count({ where: { creatorId: content.author.id } }) : 0,
    viewer && content.author
      ? prisma.subscription.findUnique({
          where: { subscriberId_creatorId: { subscriberId: viewer.id, creatorId: content.author.id } },
        })
      : null,
    viewer
      ? prisma.libraryEntry.findMany({
          where: { userId: viewer.id, contentId: content.id, type: { in: ["SCRAP", "CONCEPT_ALBUM"] } },
          select: { type: true },
        })
      : [],
  ]);

  return (
    <main className="page max-w-2xl">
      <Link href="/library" className="text-sm text-muted hover:underline">
        ← 탐색
      </Link>

      <div>
        <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px]">
          <span className={`rounded-full px-2 py-0.5 font-semibold ${TYPE_STYLE[content.type] ?? "bg-surface-2"}`}>
            {TYPE_LABEL[content.type] ?? content.type}
          </span>
          <span className="text-muted">
            난이도 {content.difficulty}/5 · 약 {content.estimatedSeconds}초
          </span>
          {content.categories.map((c) => (
            <span key={c.category.name} className="rounded-full border border-line px-2 py-0.5 text-muted">
              {c.category.name}
            </span>
          ))}
        </div>
        <h1 className="text-2xl font-bold leading-snug tracking-tight">{content.title}</h1>
        {content.summary && <p className="mt-2 text-muted">{content.summary}</p>}
        {content.author && (
          <Link href={`/creator/${content.author.id}`} className="mt-3 inline-block text-sm text-muted hover:underline">
            by <span className="font-semibold text-foreground">{content.author.displayName}</span>
          </Link>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <LikeButton contentId={content.id} initialLiked={!!likedByViewer} initialCount={content._count.likes} />
        <ScrapButton contentId={content.id} initialSaved={savedEntries.some((e) => e.type === "SCRAP")} />
        {content.type === "CONCEPT" && (
          <ScrapButton
            contentId={content.id}
            type="CONCEPT_ALBUM"
            initialSaved={savedEntries.some((e) => e.type === "CONCEPT_ALBUM")}
          />
        )}
        {content.author && (
          <SubscribeButton
            creatorId={content.author.id}
            initialSubscribed={!!subscribedByViewer}
            initialCount={subscriberCount}
          />
        )}
      </div>

      <div className="card p-5 leading-relaxed">
        <ContentBodyView body={content.body as unknown as ContentBody} />
      </div>

      {isGraphWidgetConfig(content.widgetConfig) && <InteractiveGraphWidget config={content.widgetConfig} />}

      {answerSpec && <ProblemSolver contentId={content.id} spec={answerSpec} />}

      {content.hints.length > 0 && <HintLadder contentId={content.id} userId={effectiveUserId} hints={content.hints} />}

      <CommentSection contentId={content.id} />
    </main>
  );
}
