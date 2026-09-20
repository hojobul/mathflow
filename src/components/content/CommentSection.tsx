"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "@/lib/auth/client";

interface CommentItem {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; displayName: string; avatarUrl: string | null };
}

export function CommentSection({ contentId }: { contentId: string }) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<CommentItem[] | null>(null);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/content/${contentId}/comments`)
      .then((res) => res.json())
      .then((data) => setComments(data.comments))
      .catch(() => setError("댓글을 불러오지 못했어요"));
  }, [contentId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim() || posting) return;
    setPosting(true);
    setError(null);
    try {
      const res = await fetch(`/api/content/${contentId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: draft.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data?.error === "string" ? data.error : "댓글 작성 실패");
      setComments((c) => [...(c ?? []), data.comment]);
      setDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "댓글 작성 실패");
    } finally {
      setPosting(false);
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-medium">댓글 {comments ? `${comments.length}개` : ""}</h2>

      {comments === null ? (
        <p className="text-xs text-black/40 dark:text-white/40">불러오는 중…</p>
      ) : comments.length === 0 ? (
        <p className="text-xs text-black/40 dark:text-white/40">아직 댓글이 없어요.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {comments.map((c) => (
            <li key={c.id} className="rounded-md border border-black/10 p-3 text-sm dark:border-white/10">
              <div className="mb-1 flex items-center gap-2 text-xs text-black/50 dark:text-white/50">
                <Link href={`/creator/${c.author.id}`} className="font-medium hover:underline">
                  {c.author.displayName}
                </Link>
                <span>{new Date(c.createdAt).toLocaleString("ko-KR")}</span>
              </div>
              <p className="whitespace-pre-wrap">{c.body}</p>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      {session?.user ? (
        <form onSubmit={submit} className="flex flex-col gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="댓글을 입력하세요…"
            rows={2}
            maxLength={2000}
            className="rounded border border-black/15 bg-transparent p-2 text-sm outline-none dark:border-white/20"
          />
          <button
            type="submit"
            disabled={!draft.trim() || posting}
            className="self-end rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40 dark:bg-white dark:text-black"
          >
            {posting ? "작성 중…" : "댓글 달기"}
          </button>
        </form>
      ) : (
        <p className="text-xs text-black/40 dark:text-white/40">댓글을 달려면 로그인이 필요해요.</p>
      )}
    </section>
  );
}
