"use client";

import { useState } from "react";
import Link from "next/link";
import { LatexEditor } from "./LatexEditor";
import { ProblemAnswerEditor, emptyProblemAnswerState, type ProblemAnswerState } from "./ProblemAnswerEditor";
import type { ContentBody } from "@/lib/content/blocks";
import {
  SHORT_MAX_BLOCKS,
  SHORT_MAX_SECONDS,
  SHORT_MAX_TEXT_CHARS,
  bodyTextLength,
  emptyContentBody,
} from "@/lib/content/blocks";
import { useSession } from "@/lib/auth/client";
import { requestLogin } from "@/lib/auth/requestLogin";

const TYPE_OPTIONS = [
  { value: "PROBLEM", label: "문제" },
  { value: "HISTORY", label: "수학사" },
  { value: "ANECDOTE", label: "비하인드 스토리" },
  { value: "CONCEPT", label: "개념(시각화)" },
] as const;

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; contentId: string; title: string; isShort: boolean }
  | { status: "error"; message: string };

function buildAnswerPayload(a: ProblemAnswerState) {
  if (a.mode === "numeric" && a.answer.trim() !== "" && !Number.isNaN(Number(a.answer))) {
    return { kind: "numeric", value: Number(a.answer), tolerance: a.tolerance };
  }
  if (a.mode === "expression" && a.answer.trim() !== "") {
    return { kind: "expression", raw: a.answer.trim() };
  }
  if (a.mode === "choice") {
    const options = a.options.map((text, i) => ({ id: String(i + 1), text: text.trim() })).filter((o) => o.text);
    const correct = a.options[a.correctIndex]?.trim() ? String(a.correctIndex + 1) : null;
    if (options.length >= 2 && correct) return { kind: "choice", options, correctOptionId: correct };
  }
  return undefined;
}

/** 업로드 폼: 형식(일반/쇼츠), 메타데이터, 본문 에디터, 문제 정답·힌트. */
export function CreatorForm() {
  const { data: session, isPending: sessionPending } = useSession();
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [type, setType] = useState<(typeof TYPE_OPTIONS)[number]["value"]>("PROBLEM");
  const [isShort, setIsShort] = useState(false);
  const [difficulty, setDifficulty] = useState(2);
  const [estimatedSeconds, setEstimatedSeconds] = useState(90);
  const [categoriesInput, setCategoriesInput] = useState("");
  const [body, setBody] = useState<ContentBody>(emptyContentBody());
  const [problemAnswer, setProblemAnswer] = useState<ProblemAnswerState>(emptyProblemAnswerState());
  const [state, setState] = useState<SubmitState>({ status: "idle" });

  const hasContent = body.blocks.some(
    (b) => (b.kind === "text" && b.text.trim()) || (b.kind === "latex" && b.source.trim()),
  );
  const textChars = bodyTextLength(body);
  const shortProblem = isShort
    ? textChars > SHORT_MAX_TEXT_CHARS
      ? `쇼츠 본문은 ${SHORT_MAX_TEXT_CHARS}자까지입니다.`
      : body.blocks.length > SHORT_MAX_BLOCKS
        ? `쇼츠는 블록 ${SHORT_MAX_BLOCKS}개까지입니다.`
        : null
    : null;
  const canSubmit =
    !!session?.user && title.trim().length > 0 && hasContent && !shortProblem && state.status !== "submitting";

  function chooseShort(next: boolean) {
    setIsShort(next);
    if (next) setEstimatedSeconds((s) => Math.min(s, SHORT_MAX_SECONDS));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!session?.user) return requestLogin();
    if (!canSubmit) return;
    setState({ status: "submitting" });
    try {
      const res = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          isShort,
          title: title.trim(),
          summary: summary.trim() || undefined,
          difficulty,
          estimatedSeconds: isShort ? Math.min(estimatedSeconds, SHORT_MAX_SECONDS) : estimatedSeconds,
          categories: categoriesInput
            .split(",")
            .map((c) => c.trim())
            .filter(Boolean),
          body,
          answer: type === "PROBLEM" ? buildAnswerPayload(problemAnswer) : undefined,
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
        throw new Error(
          typeof err?.error === "string" ? err.error : err?.error ? JSON.stringify(err.error) : `발행 실패 (${res.status})`,
        );
      }
      const { content } = await res.json();
      setState({ status: "success", contentId: content.id, title: content.title, isShort });
      setTitle("");
      setSummary("");
      setCategoriesInput("");
      setDifficulty(2);
      setEstimatedSeconds(isShort ? 45 : 90);
      setBody(emptyContentBody());
      setProblemAnswer(emptyProblemAnswerState());
    } catch (err) {
      setState({ status: "error", message: err instanceof Error ? err.message : "알 수 없는 오류" });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-7">
      {!sessionPending && !session?.user && (
        <p className="border-l-4 border-foreground bg-accent-soft px-4 py-3 text-sm">
          발행하려면 로그인해야 합니다. 작성 중인 내용은 유지됩니다.
        </p>
      )}
      {state.status === "success" && (
        <p className="flex items-center justify-between gap-3 border-l-4 border-success bg-surface-2 px-4 py-3 text-sm">
          <span>
            <strong>{state.title}</strong>을(를) 발행했습니다.
          </span>
          <Link href={state.isShort ? "/shorts" : `/library/${state.contentId}`} className="font-bold underline underline-offset-2">
            {state.isShort ? "쇼츠에서 보기" : "보기"}
          </Link>
        </p>
      )}
      {state.status === "error" && (
        <p className="border-l-4 border-danger bg-surface-2 px-4 py-3 text-sm text-danger">발행 실패: {state.message}</p>
      )}

      <fieldset>
        <legend className="mb-2 text-xs font-bold">형식</legend>
        <div className="flex gap-2">
          <button type="button" onClick={() => chooseShort(false)} className={!isShort ? "chip chip-active" : "chip"}>
            일반
          </button>
          <button type="button" onClick={() => chooseShort(true)} className={isShort ? "chip chip-active" : "chip"}>
            쇼츠
          </button>
        </div>
        {isShort && (
          <p className="mt-2 text-xs text-muted">
            쇼츠는 본문 {SHORT_MAX_TEXT_CHARS}자, 블록 {SHORT_MAX_BLOCKS}개, {SHORT_MAX_SECONDS}초 이내로 제한됩니다. 쇼츠
            탭에서만 노출됩니다.
          </p>
        )}
      </fieldset>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-xs font-bold">제목</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="이차방정식의 판별식" required className="field" />
        </label>

        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-xs font-bold">요약 (선택)</span>
          <input value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="한 줄 요약" className="field" />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold">유형</span>
          <select value={type} onChange={(e) => setType(e.target.value as typeof type)} className="field">
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold">카테고리 (쉼표로 구분)</span>
          <input value={categoriesInput} onChange={(e) => setCategoriesInput(e.target.value)} placeholder="미적분, 기하" className="field" />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold">난이도 {difficulty}</span>
          <input
            type="range"
            min={1}
            max={5}
            value={difficulty}
            onChange={(e) => setDifficulty(Number(e.target.value))}
            className="accent-[var(--foreground)]"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold">예상 소요 시간 (초)</span>
          <input
            type="number"
            min={10}
            max={isShort ? SHORT_MAX_SECONDS : 3600}
            value={estimatedSeconds}
            onChange={(e) => setEstimatedSeconds(Number(e.target.value))}
            className="field"
          />
        </label>
      </div>

      <LatexEditor initialValue={body} onChange={setBody} />
      {isShort && (
        <p className={`meta -mt-4 ${shortProblem ? "font-bold !text-danger" : ""}`}>
          본문 {textChars} / {SHORT_MAX_TEXT_CHARS}자 / 블록 {body.blocks.length} / {SHORT_MAX_BLOCKS}
          {shortProblem && ` — ${shortProblem}`}
        </p>
      )}

      {type === "PROBLEM" && <ProblemAnswerEditor value={problemAnswer} onChange={setProblemAnswer} />}

      <div className="flex items-center gap-3 border-t border-line pt-5">
        <button type="submit" disabled={!canSubmit && !!session?.user} className="btn-primary px-6">
          {state.status === "submitting" ? "발행 중" : "발행"}
        </button>
        {!hasContent && <span className="text-xs text-muted">본문이 필요합니다.</span>}
      </div>
    </form>
  );
}
