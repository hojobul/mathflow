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

/** 힌트를 순서대로만 열 수 있다: 핵심 개념, 접근법, 전체 풀이. */
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
    <div className="flex flex-col gap-3 border-l-2 border-foreground pl-4">
      {revealed.map((h) => (
        <div key={h.id}>
          <p className="meta mb-1 font-bold text-foreground">
            힌트 {h.order} / {h.label}
          </p>
          <ContentBodyView body={h.body} />
        </div>
      ))}
      {next ? (
        <button type="button" onClick={revealNext} disabled={loading} className="btn-ghost self-start">
          {loading ? "여는 중" : `힌트 ${next.order} 열기 (${next.label})`}
        </button>
      ) : (
        <p className="meta">힌트 끝</p>
      )}
    </div>
  );
}
