"use client";

import { useState } from "react";
import Link from "next/link";
import { LatexEditor } from "./LatexEditor";
import { ProblemAnswerEditor, emptyProblemAnswerState, type ProblemAnswerState } from "./ProblemAnswerEditor";
import type { ContentBody } from "@/lib/content/blocks";
import { emptyContentBody } from "@/lib/content/blocks";
import { useSession } from "@/lib/auth/client";

const TYPE_OPTIONS = [
  { value: "PROBLEM", label: "문제" },
  { value: "HISTORY", label: "수학사" },
  { value: "ANECDOTE", label: "비하인드 스토리" },
  { value: "CONCEPT", label: "시각화 개념" },
] as const;

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; contentId: string; title: string }
  | { status: "error"; message: string };

/** Full 크리에이터 업로드 폼: 메타데이터 + LatexEditor + 발행 버튼. */
export function CreatorForm() {
  const { data: session, isPending: sessionPending } = useSession();
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [type, setType] = useState<(typeof TYPE_OPTIONS)[number]["value"]>("PROBLEM");
  const [difficulty, setDifficulty] = useState(2);
  const [estimatedSeconds, setEstimatedSeconds] = useState(90);
  const [categoriesInput, setCategoriesInput] = useState("");
  const [body, setBody] = useState<ContentBody>(emptyContentBody());
  const [problemAnswer, setProblemAnswer] = useState<ProblemAnswerState>(emptyProblemAnswerState());
  const [state, setState] = useState<SubmitState>({ status: "idle" });

  const hasContent = body.blocks.some(
    (b) => (b.kind === "text" && b.text.trim()) || (b.kind === "latex" && b.source.trim()),
  );
  const canSubmit = !!session?.user && title.trim().length > 0 && hasContent && state.status !== "submitting";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setState({ status: "submitting" });
    try {
      const res = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          title: title.trim(),
          summary: summary.trim() || undefined,
          difficulty,
          estimatedSeconds,
          categories: categoriesInput
            .split(",")
            .map((c) => c.trim())
            .filter(Boolean),
          body,
          answer:
            type === "PROBLEM" && problemAnswer.answer.trim() !== ""
              ? { kind: "numeric", value: Number(problemAnswer.answer), tolerance: problemAnswer.tolerance }
              : undefined,
          hints:
            type === "PROBLEM" && problemAnswer.hints.length > 0
              ? problemAnswer.hints
                  .filter((h) => h.text.trim())
                  .map((h) => ({ label: h.label.trim() || "힌트", text: h.text.trim(), isFullSolution: h.isFullSolution }))
              : undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error ? JSON.stringify(err.error) : `업로드 실패 (${res.status})`);
      }
      const { content } = await res.json();
      setState({ status: "success", contentId: content.id, title: content.title });
      setTitle("");
      setSummary("");
      setCategoriesInput("");
      setDifficulty(2);
      setEstimatedSeconds(90);
      setBody(emptyContentBody());
      setProblemAnswer(emptyProblemAnswerState());
    } catch (err) {
      setState({ status: "error", message: err instanceof Error ? err.message : "알 수 없는 오류" });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {!sessionPending && !session?.user && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
          콘텐츠를 발행하려면 로그인이 필요해요. 우측 상단에서 로그인해 주세요. (작성 중인 내용은 유지됩니다)
        </div>
      )}
      {state.status === "success" && (
        <div className="flex items-center justify-between rounded-md border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm">
          <span>
            <strong>{state.title}</strong> 발행 완료!
          </span>
          <Link href="/library" className="underline">
            라이브러리에서 보기 →
          </Link>
        </div>
      )}
      {state.status === "error" && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          업로드 실패: {state.message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-xs font-medium text-black/60 dark:text-white/60">제목 *</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 이차방정식의 판별식"
            required
            className="rounded border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/40 dark:border-white/20 dark:focus:border-white/40"
          />
        </label>

        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-xs font-medium text-black/60 dark:text-white/60">요약 (선택)</span>
          <input
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="피드 카드에 표시될 한 줄 요약"
            className="rounded border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/40 dark:border-white/20 dark:focus:border-white/40"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-black/60 dark:text-white/60">유형</span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as typeof type)}
            className="rounded border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/40 dark:border-white/20 dark:focus:border-white/40"
          >
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-black/60 dark:text-white/60">카테고리 (쉼표로 구분)</span>
          <input
            value={categoriesInput}
            onChange={(e) => setCategoriesInput(e.target.value)}
            placeholder="예: 미적분, 기하"
            className="rounded border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/40 dark:border-white/20 dark:focus:border-white/40"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-black/60 dark:text-white/60">난이도: {difficulty} / 5</span>
          <input
            type="range"
            min={1}
            max={5}
            value={difficulty}
            onChange={(e) => setDifficulty(Number(e.target.value))}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-black/60 dark:text-white/60">예상 소요 시간 (초)</span>
          <input
            type="number"
            min={10}
            max={3600}
            value={estimatedSeconds}
            onChange={(e) => setEstimatedSeconds(Number(e.target.value))}
            className="rounded border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/40 dark:border-white/20 dark:focus:border-white/40"
          />
        </label>
      </div>

      <LatexEditor initialValue={body} onChange={setBody} />

      {type === "PROBLEM" && <ProblemAnswerEditor value={problemAnswer} onChange={setProblemAnswer} />}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-black"
        >
          {state.status === "submitting" ? "발행 중…" : "발행하기"}
        </button>
        {!hasContent && <span className="text-xs text-black/40 dark:text-white/40">본문을 입력하면 발행할 수 있어요.</span>}
      </div>
    </form>
  );
}
