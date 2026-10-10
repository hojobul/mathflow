"use client";

import { useState } from "react";
import { AnswerInput } from "./AnswerInput";
import type { PublicAnswerSpec, SubmittedAnswer } from "@/lib/grading";

interface Result {
  isCorrect: boolean;
  percentCorrect: number;
  savedToWrongNote: boolean;
}

export function ProblemSolver({ contentId, spec }: { contentId: string; spec: PublicAnswerSpec }) {
  const [result, setResult] = useState<Result | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(answer: SubmittedAnswer) {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/content/${contentId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data?.error === "string" ? data.error : "채점 실패");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "채점 실패");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-line bg-surface-2 p-4">
      <h3 className="text-sm font-semibold">내 답 확인하기</h3>
      <AnswerInput spec={spec} pending={pending} onSubmit={submit} />
      {error && <p className="text-xs text-danger">{error}</p>}
      {result && (
        <p className={`text-sm font-medium ${result.isCorrect ? "text-success" : "text-danger"}`}>
          {result.isCorrect ? "정답이에요! 🎉" : "아쉬워요, 다시 도전해 보세요."}{" "}
          <span className="font-normal text-muted">이 문제 정답률 {result.percentCorrect}%</span>
          {result.savedToWrongNote && <span className="font-normal text-muted"> · 오답노트에 저장됨</span>}
        </p>
      )}
    </div>
  );
}
