"use client";

import { useState } from "react";
import Link from "next/link";
import { ContentBodyView } from "./ContentBodyView";
import { LikeButton } from "./LikeButton";
import { ScrapButton } from "./ScrapButton";
import { SubscribeButton } from "./SubscribeButton";
import { HintLadder } from "./HintLadder";
import { ProblemSolver } from "./ProblemSolver";
import { InteractiveGraphWidget } from "./InteractiveGraphWidget";
import { Difficulty, TYPE_LABEL } from "./ContentCard";
import { Icon } from "@/components/ui/Icon";
import { useContentTracking } from "@/components/tracking/useContentTracking";
import type { FeedContentItem } from "@/lib/feed/types";
import { isGraphWidgetConfig } from "@/lib/content/widget";

interface ShortItemProps {
  item: FeedContentItem;
  userId: string;
  index: number;
  total: number;
}

/** 쇼츠 한 장: 스크롤 영역 한 화면을 가득 채운다. */
export function ShortItem({ item, userId, index, total }: ShortItemProps) {
  const { containerRef, trackHintView, trackAnswerReveal, trackWidgetInteract } = useContentTracking(item.id);
  const [solutionShown, setSolutionShown] = useState(false);

  return (
    <section ref={containerRef} className="h-full snap-start snap-always">
      <div className="mx-auto flex h-full max-w-lg gap-3 px-3 py-4">
        <article className="card flex min-w-0 flex-1 flex-col border-foreground">
          <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
            <div className="flex items-center gap-3">
              <span className="tag">{TYPE_LABEL[item.type] ?? item.type}</span>
              <Difficulty level={item.difficulty} />
            </div>
            <span className="meta">
              {index + 1} / {total}
            </span>
          </header>

          <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-6">
            <h2 className="font-serif text-2xl font-bold leading-snug">{item.title}</h2>
            <div className="short-body">
              <ContentBodyView body={item.body} />
            </div>
            {isGraphWidgetConfig(item.widgetConfig) && (
              <InteractiveGraphWidget config={item.widgetConfig} onInteract={trackWidgetInteract} />
            )}
            {item.answerSpec && <ProblemSolver contentId={item.id} spec={item.answerSpec} />}
            {item.hints.length > 0 && (
              <HintLadder
                contentId={item.id}
                userId={userId}
                hints={item.hints}
                onHintRevealed={(hintId, order) => {
                  trackHintView(hintId, order);
                  const last = item.hints[item.hints.length - 1];
                  if (last.order === order && last.isFullSolution && !solutionShown) {
                    setSolutionShown(true);
                    trackAnswerReveal();
                  }
                }}
              />
            )}
          </div>

          <footer className="flex items-center justify-between gap-3 border-t border-line px-4 py-3">
            {item.author ? (
              <>
                <Link href={`/creator/${item.author.id}`} className="min-w-0 truncate text-sm font-bold hover:underline">
                  {item.author.displayName}
                </Link>
                <SubscribeButton
                  creatorId={item.author.id}
                  initialSubscribed={item.subscribedByViewer}
                  initialCount={item.subscriberCount}
                  compact
                />
              </>
            ) : (
              <span />
            )}
          </footer>
        </article>

        <aside className="flex w-12 shrink-0 flex-col items-center justify-end gap-5 pb-2">
          <LikeButton contentId={item.id} initialLiked={item.likedByViewer} initialCount={item._count.likes} vertical />
          <Link
            href={`/library/${item.id}#comments`}
            aria-label={`댓글 ${item._count.comments}`}
            className="flex flex-col items-center gap-1 text-xs"
          >
            <span className="flex h-11 w-11 items-center justify-center border border-foreground bg-surface">
              <Icon name="comment" size={20} />
            </span>
            <span className="font-mono tabular-nums">{item._count.comments}</span>
          </Link>
          <ScrapButton contentId={item.id} initialSaved={item.savedByViewer} vertical />
        </aside>
      </div>
    </section>
  );
}
