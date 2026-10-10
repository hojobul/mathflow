"use client";

import { useCallback, useEffect, useState } from "react";
import { FeedCard } from "@/components/content/FeedCard";
import { useEffectiveUser } from "@/lib/auth/useEffectiveUser";
import type { FeedContentItem } from "@/lib/feed/types";

export default function FeedPage() {
  const { id: userId, loading: userLoading } = useEffectiveUser();
  const [items, setItems] = useState<FeedContentItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMore = useCallback(
    async (afterCursor: string | null) => {
      if (loading) return;
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ userId, limit: "10" });
        if (afterCursor) params.set("cursor", afterCursor);
        const res = await fetch(`/api/feed?${params}`);
        if (!res.ok) throw new Error(`피드를 불러오지 못했어요 (${res.status})`);
        const data = await res.json();
        setItems((prev) => [...prev, ...data.items]);
        setCursor(data.nextCursor);
      } catch (err) {
        setError(err instanceof Error ? err.message : "알 수 없는 오류");
      } finally {
        setLoading(false);
        setInitialLoaded(true);
      }
    },
    [loading, userId],
  );

  useEffect(() => {
    if (userLoading || initialLoaded) return;
    // Deferred a tick so the fetch's setState calls land after this effect
    // body finishes, not synchronously inside it.
    void Promise.resolve().then(() => loadMore(null));
    // Load exactly once, as soon as we know who's asking.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLoading]);

  return (
    <main className="page max-w-2xl">
      <h1 className="page-title">피드</h1>

      {!initialLoaded && userLoading === false && loading && (
        <p className="text-sm text-muted">불러오는 중…</p>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
      {initialLoaded && items.length === 0 && !error && (
        <p className="text-sm text-muted">
          아직 볼 콘텐츠가 없어요. <a href="/editor" className="underline">먼저 하나 만들어볼까요?</a>
        </p>
      )}

      <div className="flex flex-col gap-6">
        {items.map((item) => (
          <FeedCard key={item.id} item={item} userId={userId} />
        ))}
      </div>

      {cursor && (
        <button
          type="button"
          onClick={() => loadMore(cursor)}
          disabled={loading}
          className="btn-ghost self-center"
        >
          {loading ? "불러오는 중…" : "더 보기"}
        </button>
      )}
    </main>
  );
}
