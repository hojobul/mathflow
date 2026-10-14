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
      if (!res.ok) throw new Error(typeof data?.error === "string" ? data.error : "채점에 실패했습니다.");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "채점에 실패했습니다.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 border border-foreground bg-surface p-4">
      <h3 className="text-xs font-bold tracking-wide">답안</h3>
      <AnswerInput spec={spec} pending={pending} onSubmit={submit} />
      {error && <p className="text-xs text-danger">{error}</p>}
      {result && (
        <p className="text-sm">
          <strong className={result.isCorrect ? "text-success" : "text-danger"}>
            {result.isCorrect ? "정답입니다." : "오답입니다."}
          </strong>{" "}
          <span className="text-muted">
            정답률 {result.percentCorrect}%{result.savedToWrongNote && " · 오답노트에 저장함"}
          </span>
        </p>
      )}
    </div>
  );
}
