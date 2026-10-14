"use client";

import { useEffect, useMemo, useState } from "react";
import { ContentBodyView } from "@/components/content/ContentBodyView";
import { StyleRadarChart } from "@/components/gamification/StyleRadarChart";
import { AnswerInput } from "@/components/content/AnswerInput";
import { useEffectiveUser } from "@/lib/auth/useEffectiveUser";
import { useSession } from "@/lib/auth/client";
import type { ContentBody } from "@/lib/content/blocks";
import type { PublicAnswerSpec, SubmittedAnswer } from "@/lib/grading";

interface QuizProblem {
  id: string;
  order: number;
  title: string;
  body: ContentBody;
  difficulty: number;
  estimatedSeconds: number;
  answerSpec: PublicAnswerSpec;
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
  const [results, setResults] = useState<Record<string, SubmitResult>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/daily-quiz?userId=${userId}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(res.status === 404 ? "오늘의 퀴즈가 아직 없습니다." : `불러오기 실패 (${res.status})`))))
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

  async function submit(problem: QuizProblem, answer: SubmittedAnswer) {
    if (!quiz || timeUp || submitting) return;
    setSubmitting(problem.id);
    try {
      const res = await fetch("/api/daily-quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          dailyQuizId: quiz.id,
          contentId: problem.id,
          answer,
          timeTakenMs: (quiz.durationSeconds - (secondsLeft ?? 0)) * 1000,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "제출에 실패했습니다.");
      setResults((r) => ({ ...r, [problem.id]: data }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "제출에 실패했습니다.");
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <main className="page max-w-2xl">
      <div className="flex items-end justify-between gap-4 border-b-2 border-foreground pb-3">
        <div>
          <p className="meta">Daily Math Rush</p>
          <h1 className="page-title">{quiz?.title ?? "오늘의 퀴즈"}</h1>
        </div>
        <span
          className={`font-mono text-4xl font-bold tabular-nums ${timeUp ? "text-danger" : ""}`}
          aria-label="남은 시간"
        >
          {timeUp ? "종료" : mmss}
        </span>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      {!quiz && !error && <p className="meta">불러오는 중</p>}

      <div className="flex flex-col gap-5">
        {quiz?.problems.map((problem) => {
          const result = results[problem.id];
          const locked = problem.alreadySubmitted || !!result || timeUp;
          return (
            <section key={problem.id} className="card p-5">
              <p className="meta mb-1">문제 {problem.order}</p>
              <h2 className="mb-3 font-serif text-lg font-bold">{problem.title}</h2>
              <ContentBodyView body={problem.body} />
              <div className="mt-4">
                <AnswerInput
                  spec={problem.answerSpec}
                  disabled={locked}
                  pending={submitting === problem.id}
                  onSubmit={(a) => submit(problem, a)}
                />
              </div>
              {result && (
                <p className="mt-3 text-sm">
                  <strong className={result.isCorrect ? "text-success" : "text-danger"}>
                    {result.isCorrect ? "정답입니다." : "오답입니다."}
                  </strong>{" "}
                  <span className="text-muted">{result.message}</span>
                </p>
              )}
              {problem.alreadySubmitted && !result && <p className="meta mt-3">제출 완료</p>}
            </section>
          );
        })}
      </div>

      {session?.user && (
        <section className="card flex flex-col items-center gap-3 p-5">
          <h2 className="self-start text-xs font-bold tracking-wide">수학 스타일</h2>
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
    return <p className="text-sm text-muted">기록이 부족합니다. 콘텐츠를 더 읽으면 표시됩니다.</p>;
  }
  return <StyleRadarChart {...style} />;
}
