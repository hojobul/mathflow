"use client";

import { useState } from "react";
import { useSession } from "@/lib/auth/client";

interface LikeButtonProps {
  contentId: string;
  initialLiked: boolean;
  initialCount: number;
}

export function LikeButton({ contentId, initialLiked, initialCount }: LikeButtonProps) {
  const { data: session } = useSession();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [pending, setPending] = useState(false);

  async function toggle() {
    if (!session?.user) {
      alert("좋아요는 로그인 후 이용할 수 있어요.");
      return;
    }
    setPending(true);
    // optimistic
    setLiked(!liked);
    setCount((c) => c + (liked ? -1 : 1));
    try {
      const res = await fetch(`/api/content/${contentId}/like`, { method: "POST" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setLiked(data.liked);
      setCount(data.likeCount);
    } catch {
      // revert on failure
      setLiked(liked);
      setCount((c) => c + (liked ? 1 : -1));
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
        liked
          ? "border-pink-400 bg-pink-500/10 text-pink-500"
          : "border-black/15 text-black/60 hover:border-black/30 dark:border-white/20 dark:text-white/60 dark:hover:border-white/40"
      }`}
    >
      <span>{liked ? "♥" : "♡"}</span>
      <span>{count}</span>
    </button>
  );
}
