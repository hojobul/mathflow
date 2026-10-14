"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ShortItem } from "@/components/content/ShortItem";
import { Icon } from "@/components/ui/Icon";
import { useEffectiveUser } from "@/lib/auth/useEffectiveUser";
import type { FeedContentItem } from "@/lib/feed/types";

const PAGE_SIZE = 8;
const PREFETCH_REMAINING = 3;

/** 쇼츠: 한 화면에 하나씩 세로로 넘기는 짧은 콘텐츠. */
export default function ShortsPage() {
  const { id: userId, loading: userLoading } = useEffectiveUser();
  const [items, setItems] = useState<FeedContentItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
  const raf = useRef<number | null>(null);

  const loadMore = useCallback(
    async (afterCursor: string | null) => {
      if (loading) return;
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ userId, limit: String(PAGE_SIZE), format: "short" });
        if (afterCursor) params.set("cursor", afterCursor);
        const res = await fetch(`/api/feed?${params}`);
        if (!res.ok) throw new Error(`쇼츠를 불러오지 못했습니다 (${res.status})`);
        const data = await res.json();
        setItems((prev) => [...prev, ...data.items]);
        setCursor(data.nextCursor);
      } catch (err) {
        setError(err instanceof Error ? err.message : "알 수 없는 오류");
      } finally {
        setLoading(false);
        setLoaded(true);
      }
    },
    [loading, userId],
  );

  useEffect(() => {
    if (userLoading || loaded) return;
    void Promise.resolve().then(() => loadMore(null));
    // 사용자 식별이 끝난 시점에 한 번만 불러온다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLoading]);

  const goTo = useCallback((index: number) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTo({ top: Math.max(0, index) * el.clientHeight, behavior: "smooth" });
  }, []);

  function onScroll() {
    if (raf.current !== null) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = null;
      const el = scroller.current;
      if (!el || el.clientHeight === 0) return;
      const index = Math.round(el.scrollTop / el.clientHeight);
      setActive(index);
      if (cursor && !loading && index >= items.length - PREFETCH_REMAINING) void loadMore(cursor);
    });
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key === "ArrowDown" || e.key === "j") {
        e.preventDefault();
        goTo(Math.min(active + 1, items.length - 1));
      } else if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault();
        goTo(active - 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, items.length, goTo]);

  return (
    <main className="relative h-[calc(100dvh-96px)] md:h-[calc(100dvh-57px)]">
      <div
        ref={scroller}
        onScroll={onScroll}
        tabIndex={0}
        aria-label="쇼츠 목록"
        className="h-full snap-y snap-mandatory overflow-y-scroll overscroll-contain outline-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item, i) => (
          <ShortItem key={item.id} item={item} userId={userId} index={i} total={items.length + (cursor ? 1 : 0)} />
        ))}

        {!loaded && <p className="meta p-8 text-center">불러오는 중</p>}
        {error && <p className="p-8 text-center text-sm text-danger">{error}</p>}
        {loaded && items.length === 0 && !error && (
          <div className="mx-auto max-w-sm p-10 text-center">
            <p className="font-serif text-xl font-bold">쇼츠 없음</p>
            <p className="mt-2 text-sm text-muted">에디터에서 형식을 쇼츠로 지정해 발행하면 여기에 표시됩니다.</p>
            <Link href="/editor" className="btn-primary mt-5">
              에디터
            </Link>
          </div>
        )}
        {loaded && items.length > 0 && !cursor && (
          <section className="flex h-full snap-start items-center justify-center">
            <div className="text-center">
              <p className="font-serif text-xl font-bold">마지막입니다</p>
              <p className="mt-2 text-sm text-muted">최근 12시간 안에 본 쇼츠는 다시 나오지 않습니다.</p>
              <button type="button" onClick={() => goTo(0)} className="btn-ghost mt-5">
                처음으로
              </button>
            </div>
          </section>
        )}
      </div>

      {items.length > 1 && (
        <div className="absolute right-6 top-1/2 hidden -translate-y-1/2 flex-col gap-2 lg:flex">
          <button
            type="button"
            onClick={() => goTo(active - 1)}
            disabled={active <= 0}
            aria-label="이전 쇼츠"
            className="flex h-10 w-10 items-center justify-center border border-foreground bg-surface hover:bg-foreground hover:text-surface disabled:opacity-30 disabled:hover:bg-surface disabled:hover:text-foreground"
          >
            <Icon name="arrow-up" />
          </button>
          <button
            type="button"
            onClick={() => goTo(active + 1)}
            aria-label="다음 쇼츠"
            className="flex h-10 w-10 items-center justify-center border border-foreground bg-surface hover:bg-foreground hover:text-surface"
          >
            <Icon name="arrow-down" />
          </button>
        </div>
      )}
    </main>
  );
}
