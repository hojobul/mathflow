"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "@/lib/auth/client";
import { requestLogin } from "@/lib/auth/requestLogin";

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
      .catch(() => setError("댓글을 불러오지 못했습니다."));
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
      if (!res.ok) throw new Error(typeof data?.error === "string" ? data.error : "등록에 실패했습니다.");
      setComments((c) => [...(c ?? []), data.comment]);
      setDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "등록에 실패했습니다.");
    } finally {
      setPosting(false);
    }
  }

  return (
    <section id="comments" className="flex flex-col gap-3">
      <h2 className="section-label">댓글 {comments ? comments.length : ""}</h2>

      {comments === null ? (
        <p className="meta">불러오는 중</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted">댓글 없음</p>
      ) : (
        <ul>
          {comments.map((c) => (
            <li key={c.id} className="border-b border-line py-3 text-sm">
              <div className="mb-1 flex items-baseline gap-3">
                <Link href={`/creator/${c.author.id}`} className="font-bold hover:underline">
                  {c.author.displayName}
                </Link>
                <span className="meta">{new Date(c.createdAt).toLocaleString("ko-KR")}</span>
              </div>
              <p className="whitespace-pre-wrap">{c.body}</p>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="text-xs text-danger">{error}</p>}

      {session?.user ? (
        <form onSubmit={submit} className="flex flex-col gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="댓글"
            rows={2}
            maxLength={2000}
            className="field resize-y"
          />
          <button type="submit" disabled={!draft.trim() || posting} className="btn-primary self-end">
            {posting ? "등록 중" : "등록"}
          </button>
        </form>
      ) : (
        <p className="text-sm text-muted">
          댓글은 <button type="button" onClick={requestLogin} className="font-bold underline underline-offset-2">로그인</button> 후 작성할 수 있습니다.
        </p>
      )}
    </section>
  );
}
