"use client";

import { useState } from "react";
import Link from "next/link";
import { ContentBodyView } from "./ContentBodyView";
import { LikeButton } from "./LikeButton";
import { SubscribeButton } from "./SubscribeButton";
import { HintLadder } from "./HintLadder";
import { useContentTracking } from "@/components/tracking/useContentTracking";
import type { FeedContentItem } from "@/lib/feed/types";

const TYPE_LABEL: Record<string, string> = {
  PROBLEM: "문제",
  HISTORY: "수학사",
  ANECDOTE: "비하인드",
  CONCEPT: "개념",
};

interface FeedCardProps {
  item: FeedContentItem;
  userId: string;
}

export function FeedCard({ item, userId }: FeedCardProps) {
  const { containerRef, trackHintView, trackAnswerReveal } = useContentTracking(item.id);
  const [solutionShown, setSolutionShown] = useState(false);

  return (
    <article
      ref={containerRef}
      className="flex max-h-[80vh] flex-col gap-3 overflow-y-auto rounded-lg border border-black/10 p-5 dark:border-white/10"
    >
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-black/50 dark:text-white/50">
        <span className="rounded bg-black/5 px-1.5 py-0.5 font-medium dark:bg-white/10">
          {TYPE_LABEL[item.type] ?? item.type}
        </span>
        <span>난이도 {item.difficulty}/5</span>
        <span>· 약 {item.estimatedSeconds}초</span>
        {item.categories.map((c) => (
          <span key={c.slug} className="rounded-full border border-black/10 px-2 py-0.5 dark:border-white/15">
            {c.name}
          </span>
        ))}
      </div>

      <Link href={`/library/${item.id}`} className="text-lg font-semibold hover:underline">
        {item.title}
      </Link>
      {item.summary && <p className="text-sm text-black/60 dark:text-white/60">{item.summary}</p>}

      <ContentBodyView body={item.body} />

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

      <div className="mt-1 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {item.author && (
            <>
              <span className="text-xs text-black/40 dark:text-white/40">by {item.author.displayName}</span>
              <SubscribeButton
                creatorId={item.author.id}
                initialSubscribed={item.subscribedByViewer}
                initialCount={item.subscriberCount}
              />
            </>
          )}
        </div>
        <LikeButton contentId={item.id} initialLiked={item.likedByViewer} initialCount={item._count.likes} />
      </div>
    </article>
  );
}
