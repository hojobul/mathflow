"use client";

import { useState } from "react";
import Link from "next/link";
import { ContentBodyView } from "./ContentBodyView";
import { LikeButton } from "./LikeButton";
import { SubscribeButton } from "./SubscribeButton";
import { HintLadder } from "./HintLadder";
import { ProblemSolver } from "./ProblemSolver";
import { InteractiveGraphWidget } from "./InteractiveGraphWidget";
import { Difficulty, TYPE_LABEL } from "./ContentCard";
import { useContentTracking } from "@/components/tracking/useContentTracking";
import type { FeedContentItem } from "@/lib/feed/types";
import { isGraphWidgetConfig } from "@/lib/content/widget";

interface FeedCardProps {
  item: FeedContentItem;
  userId: string;
}

export function FeedCard({ item, userId }: FeedCardProps) {
  const { containerRef, trackHintView, trackAnswerReveal, trackWidgetInteract } = useContentTracking(item.id);
  const [solutionShown, setSolutionShown] = useState(false);

  return (
    <article ref={containerRef} className="card flex max-h-[88vh] flex-col gap-4 overflow-y-auto p-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="tag">{TYPE_LABEL[item.type] ?? item.type}</span>
        <Difficulty level={item.difficulty} />
        <span className="meta">{item.estimatedSeconds}초</span>
        {item.categories.map((c) => (
          <span key={c.slug} className="text-xs text-muted">
            #{c.name}
          </span>
        ))}
      </div>

      <div>
        <Link href={`/library/${item.id}`} className="font-serif text-xl font-bold leading-snug hover:underline">
          {item.title}
        </Link>
        {item.summary && <p className="mt-1 text-sm text-muted">{item.summary}</p>}
      </div>

      <ContentBodyView body={item.body} />

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

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
        <div className="flex items-center gap-3">
          {item.author && (
            <>
              <Link href={`/creator/${item.author.id}`} className="text-sm font-bold hover:underline">
                {item.author.displayName}
              </Link>
              <SubscribeButton
                creatorId={item.author.id}
                initialSubscribed={item.subscribedByViewer}
                initialCount={item.subscriberCount}
                compact
              />
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/library/${item.id}#comments`} className="chip">
            댓글 <span className="font-mono tabular-nums">{item._count.comments}</span>
          </Link>
          <LikeButton contentId={item.id} initialLiked={item.likedByViewer} initialCount={item._count.likes} />
        </div>
      </div>
    </article>
  );
}
