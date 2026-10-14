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
  submittedCorrect: boolean | null;
}

interface SubmitResult {
  isCorrect: boolean;
  percentCorrect: number;
  message: string;
}

interface Quiz {
  id: string;
  title: string;
  durationSeconds: number;
  problems: QuizProblem[];
}

const mmss = (total: number) => `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;

export default function QuizPage() {
  const { id: userId } = useEffectiveUser();
  const { data: session } = useSession();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [finishedAt, setFinishedAt] = useState<number | null>(null);
  const [results, setResults] = useState<Record<string, SubmitResult>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/daily-quiz?userId=${userId}`)
      .then((res) =>
        res.ok ? res.json() : Promise.reject(new Error(res.status === 404 ? "오늘의 퀴즈가 아직 없습니다." : `불러오기 실패 (${res.status})`)),
      )
      .then((data: Quiz) => {
        setQuiz(data);
        // 새로고침해도 타이머가 처음부터 다시 시작하지 않도록 시작 시각을 브라우저에 남긴다.
        const key = `mathflow:rush:${data.id}:${userId}`;
        let started = Date.now();
        try {
          const saved = Number(localStorage.getItem(key));
          if (saved > 0) started = saved;
          else localStorage.setItem(key, String(started));
        } catch {
          /* 저장소를 못 쓰면 이번 방문 기준으로 시작한다 */
        }
        setStartedAt(started);
        setNow(Date.now());
      })
      .catch((err) => setError(err.message));
  }, [userId]);

  const allDone = !!quiz && quiz.problems.length > 0 && quiz.problems.every((p) => p.alreadySubmitted || results[p.id]);

  const duration = quiz?.durationSeconds ?? 0;
  const elapsed =
    startedAt === null ? 0 : Math.max(0, Math.floor(((finishedAt ?? now) - startedAt) / 1000));
  const secondsLeft = Math.max(0, duration - elapsed);
  const timeUp = !!quiz && startedAt !== null && !allDone && secondsLeft === 0;
  const ended = allDone || timeUp;

  useEffect(() => {
    if (!quiz || ended) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [quiz, ended]);

  const correctCount = useMemo(
    () =>
      quiz?.problems.filter((p) => (results[p.id] ? results[p.id].isCorrect : p.alreadySubmitted && p.submittedCorrect)).length ?? 0,
    [quiz, results],
  );

  async function submit(problem: QuizProblem, answer: SubmittedAnswer) {
    if (!quiz || ended || submitting) return;
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
          timeTakenMs: Math.max(0, (now - (startedAt ?? now))),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "제출에 실패했습니다.");
      const nextResults = { ...results, [problem.id]: data as SubmitResult };
      setResults(nextResults);
      // 마지막 문제까지 제출하면 그 시점에 러시를 끝내고 시간을 멈춘다.
      if (quiz.problems.every((p) => p.alreadySubmitted || nextResults[p.id])) setFinishedAt(now);
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
          aria-label={ended ? "러시 종료" : "남은 시간"}
        >
          {!quiz || startedAt === null ? "--:--" : allDone ? (finishedAt === null ? "완료" : mmss(elapsed)) : timeUp ? "종료" : mmss(secondsLeft)}
        </span>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      {!quiz && !error && <p className="meta">불러오는 중</p>}

      {quiz && ended && (
        <section className="border border-foreground bg-accent-soft p-5" role="status">
          <p className="meta mb-1">{allDone ? "러시 종료" : "시간 종료"}</p>
          <p className="font-serif text-2xl font-bold">
            {quiz.problems.length}문제 중 {correctCount}문제 정답
          </p>
          <p className="mt-1 text-sm">
            {allDone
              ? `모든 문제를 제출했습니다.${finishedAt === null ? "" : ` 소요 시간 ${mmss(elapsed)}`}${correctCount === quiz.problems.length ? " / 전부 정답" : ""}`
              : "제한 시간이 지나 남은 문제는 제출할 수 없습니다."}
          </p>
        </section>
      )}

      <div className="flex flex-col gap-5">
        {quiz?.problems.map((problem) => {
          const result = results[problem.id];
          const locked = problem.alreadySubmitted || !!result || ended;
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
              {problem.alreadySubmitted && !result && (
                <p className="meta mt-3">
                  제출 완료{problem.submittedCorrect === null ? "" : problem.submittedCorrect ? " / 정답" : " / 오답"}
                </p>
              )}
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
