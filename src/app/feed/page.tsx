"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
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
        if (!res.ok) throw new Error(`피드를 불러오지 못했습니다 (${res.status})`);
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
    // effect 본문 안에서 동기적으로 setState가 일어나지 않도록 한 틱 미룬다.
    void Promise.resolve().then(() => loadMore(null));
    // 사용자 식별이 끝난 시점에 한 번만 불러온다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLoading]);

  return (
    <main className="page max-w-2xl">
      <h1 className="page-title">피드</h1>

      {!initialLoaded && !userLoading && loading && <p className="meta">불러오는 중</p>}
      {error && <p className="text-sm text-danger">{error}</p>}
      {initialLoaded && items.length === 0 && !error && (
        <p className="text-sm text-muted">
          표시할 콘텐츠가 없습니다. <Link href="/editor" className="font-bold underline underline-offset-2">에디터</Link>에서 작성할 수 있습니다.
        </p>
      )}

      <div className="flex flex-col gap-6">
        {items.map((item) => (
          <FeedCard key={item.id} item={item} userId={userId} />
        ))}
      </div>

      {cursor && (
        <button type="button" onClick={() => loadMore(cursor)} disabled={loading} className="btn-ghost self-center">
          {loading ? "불러오는 중" : "더 보기"}
        </button>
      )}
    </main>
  );
}
