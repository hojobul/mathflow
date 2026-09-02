"use client";

import { useEffect, useMemo, useState } from "react";
import { ContentBodyView } from "@/components/content/ContentBodyView";
import { StyleRadarChart } from "@/components/gamification/StyleRadarChart";
import { useEffectiveUser } from "@/lib/auth/useEffectiveUser";
import { useSession } from "@/lib/auth/client";
import type { ContentBody } from "@/lib/content/blocks";

interface QuizProblem {
  id: string;
  order: number;
  title: string;
  body: ContentBody;
  difficulty: number;
  estimatedSeconds: number;
  alreadySubmitted: boolean;
}

interface SubmitResult {
  isCorrect: boolean;
  percentCorrect: number;
  message: string;
}

export default function QuizPage() {
  const { id: userId } = useEffectiveUser();
  const { data: session } = useSession();
  const [quiz, setQuiz] = useState<{ id: string; title: string; durationSeconds: number; problems: QuizProblem[] } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, SubmitResult>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/daily-quiz?userId=${userId}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`불러오기 실패 (${res.status})`))))
      .then((data) => {
        setQuiz(data);
        setSecondsLeft(data.durationSeconds);
      })
      .catch((err) => setError(err.message));
  }, [userId]);

  useEffect(() => {
    if (secondsLeft === null || secondsLeft <= 0) return;
    const t = setInterval(() => setSecondsLeft((s) => (s !== null ? Math.max(0, s - 1) : s)), 1000);
    return () => clearInterval(t);
  }, [secondsLeft]);

  const timeUp = secondsLeft === 0;
  const mmss = useMemo(() => {
    if (secondsLeft === null) return "--:--";
    const m = Math.floor(secondsLeft / 60);
    const s = secondsLeft % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }, [secondsLeft]);

  async function submit(problem: QuizProblem) {
    if (!quiz || timeUp || submitting) return;
    const raw = answers[problem.id];
    if (!raw || Number.isNaN(Number(raw))) return;
    setSubmitting(problem.id);
    try {
      const res = await fetch("/api/daily-quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          dailyQuizId: quiz.id,
          contentId: problem.id,
          answer: { kind: "numeric", value: Number(raw) },
          timeTakenMs: (quiz.durationSeconds - (secondsLeft ?? 0)) * 1000,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "제출 실패");
      setResults((r) => ({ ...r, [problem.id]: data }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "제출 실패");
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{quiz?.title ?? "오늘의 Math Rush"}</h1>
        <span
          className={`rounded-full px-3 py-1 text-sm font-mono tabular-nums ${
            timeUp ? "bg-red-500/10 text-red-500" : "bg-black/5 dark:bg-white/10"
          }`}
        >
          {timeUp ? "종료" : mmss}
        </span>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
      {!quiz && !error && <p className="text-sm text-black/50 dark:text-white/50">불러오는 중…</p>}

      <div className="flex flex-col gap-4">
        {quiz?.problems.map((problem) => {
          const result = results[problem.id];
          const locked = problem.alreadySubmitted || !!result || timeUp;
          return (
            <div key={problem.id} className="rounded-lg border border-black/10 p-4 dark:border-white/10">
              <h2 className="mb-2 font-medium">{problem.title}</h2>
              <ContentBodyView body={problem.body} />
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="number"
                  value={answers[problem.id] ?? ""}
                  onChange={(e) => setAnswers((a) => ({ ...a, [problem.id]: e.target.value }))}
                  disabled={locked}
                  placeholder="답 입력"
                  className="w-32 rounded border border-black/15 bg-transparent px-2 py-1.5 text-sm outline-none disabled:opacity-50 dark:border-white/20"
                />
                <button
                  type="button"
                  onClick={() => submit(problem)}
                  disabled={locked || submitting === problem.id}
                  className="rounded-md bg-black px-3 py-1.5 text-sm text-white disabled:opacity-40 dark:bg-white dark:text-black"
                >
                  {submitting === problem.id ? "제출 중…" : "제출"}
                </button>
              </div>
              {result && (
                <p className={`mt-2 text-sm font-medium ${result.isCorrect ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                  {result.isCorrect ? "정답! " : "오답. "}
                  {result.message}
                </p>
              )}
              {problem.alreadySubmitted && !result && (
                <p className="mt-2 text-sm text-black/40 dark:text-white/40">이미 제출한 문제예요.</p>
              )}
            </div>
          );
        })}
      </div>

      {session?.user && (
        <section className="flex flex-col items-center gap-2 rounded-lg border border-black/10 p-4 dark:border-white/10">
          <h2 className="text-sm font-medium">나의 수학 스타일</h2>
          <StyleRadar />
        </section>
      )}
    </main>
  );
}

function StyleRadar() {
  const [style, setStyle] = useState<{
    logicScore: number;
    curiosityScore: number;
    calculationScore: number;
    intuitionScore: number;
    hasActivity: boolean;
  } | null>(null);

  useEffect(() => {
    fetch("/api/me/style")
      .then((res) => (res.ok ? res.json() : null))
      .then(setStyle);
  }, []);

  if (!style) return null;
  if (!style.hasActivity) {
    return <p className="text-xs text-black/40 dark:text-white/40">아직 활동 데이터가 부족해요 — 콘텐츠를 더 둘러보세요.</p>;
  }
  return <StyleRadarChart {...style} />;
}
