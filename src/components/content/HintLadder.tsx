"use client";

import { useState } from "react";
import { ContentBodyView } from "./ContentBodyView";
import type { ContentBody } from "@/lib/content/blocks";

interface HintMeta {
  id: string;
  order: number;
  label: string;
  isFullSolution: boolean;
}

interface RevealedHint extends HintMeta {
  body: ContentBody;
}

interface HintLadderProps {
  contentId: string;
  userId: string;
  hints: HintMeta[];
  onHintRevealed?: (hintId: string, order: number) => void;
}

/** [힌트 1: 핵심 개념] -> [힌트 2: 접근법] -> [전체 풀이] 순차 공개. */
export function HintLadder({ contentId, userId, hints, onHintRevealed }: HintLadderProps) {
  const [revealed, setRevealed] = useState<RevealedHint[]>([]);
  const [loading, setLoading] = useState(false);

  if (hints.length === 0) return null;
  const nextOrder = revealed.length + 1;
  const next = hints.find((h) => h.order === nextOrder);

  async function revealNext() {
    if (!next || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/content/${contentId}/hints?userId=${userId}&upTo=${next.order}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      const revealedHint = data.hints.find((h: RevealedHint) => h.order === next.order);
      if (revealedHint) {
        setRevealed((r) => [...r, revealedHint]);
        onHintRevealed?.(next.id, next.order);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-dashed border-black/15 p-3 dark:border-white/20">
      {revealed.map((h) => (
        <div key={h.id} className="border-b border-black/5 pb-2 last:border-0 dark:border-white/10">
          <p className="mb-1 text-[11px] font-medium text-black/50 dark:text-white/50">
            힌트 {h.order} · {h.label}
          </p>
          <ContentBodyView body={h.body} />
        </div>
      ))}
      {next ? (
        <button
          type="button"
          onClick={revealNext}
          disabled={loading}
          className="self-start rounded-md border border-black/15 px-3 py-1.5 text-xs hover:bg-black/5 disabled:opacity-50 dark:border-white/20 dark:hover:bg-white/10"
        >
          {loading ? "불러오는 중…" : `힌트 ${next.order} 보기 · ${next.label}`}
        </button>
      ) : (
        <p className="text-xs text-black/40 dark:text-white/40">모든 힌트를 확인했어요.</p>
      )}
    </div>
  );
}
