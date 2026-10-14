"use client";

import { useState } from "react";
import { useSession } from "@/lib/auth/client";
import { requestLogin } from "@/lib/auth/requestLogin";
import { Icon } from "@/components/ui/Icon";

interface LikeButtonProps {
  contentId: string;
  initialLiked: boolean;
  initialCount: number;
  /** 쇼츠 우측 세로 버튼 모양 */
  vertical?: boolean;
}

export function LikeButton({ contentId, initialLiked, initialCount, vertical }: LikeButtonProps) {
  const { data: session } = useSession();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [pending, setPending] = useState(false);

  async function toggle() {
    if (!session?.user) return requestLogin();
    setPending(true);
    const prev = { liked, count };
    setLiked(!liked);
    setCount((c) => c + (liked ? -1 : 1));
    try {
      const res = await fetch(`/api/content/${contentId}/like`, { method: "POST" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setLiked(data.liked);
      setCount(data.likeCount);
    } catch {
      setLiked(prev.liked);
      setCount(prev.count);
    } finally {
      setPending(false);
    }
  }

  const label = `좋아요 ${count}`;
  if (vertical) {
    return (
      <button type="button" onClick={toggle} disabled={pending} aria-label={label} className="flex flex-col items-center gap-1 text-xs">
        <span
          className={`flex h-11 w-11 items-center justify-center border ${
            liked ? "border-danger bg-danger text-surface" : "border-foreground bg-surface"
          }`}
        >
          <Icon name="heart" size={20} filled={liked} />
        </span>
        <span className="font-mono tabular-nums">{count}</span>
      </button>
    );
  }
  return (
    <button type="button" onClick={toggle} disabled={pending} aria-label={label} className={liked ? "chip border-danger text-danger" : "chip"}>
      <Icon name="heart" size={15} filled={liked} />
      <span className="font-mono tabular-nums">{count}</span>
    </button>
  );
}
