"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
type ContentType = (typeof TYPE_OPTIONS)[number]["value"];

const VISIBILITY_OPTIONS = [
  { value: "PUBLIC", label: "공개", note: "피드, 검색, 채널에 노출됩니다." },
  { value: "UNLISTED", label: "일부공개", note: "링크를 아는 사람만 볼 수 있고 피드와 검색에는 나오지 않습니다." },
  { value: "PRIVATE", label: "비공개", note: "나만 볼 수 있습니다." },
] as const;
type Visibility = (typeof VISIBILITY_OPTIONS)[number]["value"];

interface FormState {
  title: string;
  summary: string;
  type: ContentType;
  inFeed: boolean;
  inShorts: boolean;
  visibility: Visibility;
  difficulty: number;
  estimatedSeconds: number;
  categoriesInput: string;
  body: ContentBody;
  problemAnswer: ProblemAnswerState;
}

function initialState(): FormState {
  return {
    title: "",
    summary: "",
    type: "PROBLEM",
    inFeed: true,
    inShorts: false,
    visibility: "PUBLIC",
    difficulty: 2,
    estimatedSeconds: 90,
    categoriesInput: "",
    body: emptyContentBody(),
    problemAnswer: emptyProblemAnswerState(),
  };
}

const LOCAL_KEY = "mathflow:editor:new";

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

/** 서버에 저장된 answerKey를 에디터 입력 상태로 되돌린다. */
function answerStateFromKey(
  key: unknown,
  hints: { label: string; text: string; isFullSolution: boolean }[],
): ProblemAnswerState {
  const base = { ...emptyProblemAnswerState(), hints };
  const k = key as Record<string, unknown> | null;
  if (!k || typeof k !== "object") return base;
  if (k.kind === "numeric") return { ...base, mode: "numeric", answer: String(k.value), tolerance: Number(k.tolerance) || 0 };
  if (k.kind === "expression") return { ...base, mode: "expression", answer: String(k.raw ?? k.normalized ?? "") };
  if (k.kind === "choice") {
    const options = (k.options as { id: string; text: string }[]) ?? [];
    return {
      ...base,
      mode: "choice",
      options: options.map((o) => o.text),
      correctIndex: Math.max(0, options.findIndex((o) => o.id === k.correctOptionId)),
    };
  }
  return base;
}

type Notice = { kind: "ok" | "error"; text: string; href?: string; linkLabel?: string } | null;

/** 에디터 폼. editId가 있으면 저장된 콘텐츠를 불러와 수정한다. */
export function CreatorForm({ editId }: { editId?: string }) {
  const router = useRouter();
  const { data: session, isPending: sessionPending } = useSession();
  const [form, setForm] = useState<FormState>(initialState);
  const [savedId, setSavedId] = useState<string | undefined>(editId);
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED" | null>(null);
  const [loading, setLoading] = useState(!!editId);
  const [busy, setBusy] = useState<"draft" | "publish" | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [editorKey, setEditorKey] = useState(0); // 불러온 본문을 LatexEditor에 반영하려고 다시 마운트한다
  const hydrated = useRef(false);

  const patch = (p: Partial<FormState>) => setForm((f) => ({ ...f, ...p }));

  // 기존 콘텐츠 불러오기, 새 글이면 브라우저에 남겨 둔 작성 중 내용 복원
  useEffect(() => {
    if (editId) {
      fetch(`/api/content/${editId}`)
        .then(async (res) => {
          const data = await res.json();
          if (!res.ok) throw new Error(data?.error ?? "불러오지 못했습니다.");
          setForm({
            title: data.title,
            summary: data.summary,
            type: data.type,
            inFeed: data.inFeed,
            inShorts: data.inShorts,
            visibility: data.visibility,
            difficulty: data.difficulty,
            estimatedSeconds: data.estimatedSeconds,
            categoriesInput: (data.categories as string[]).join(", "),
            body: data.body,
            problemAnswer: answerStateFromKey(data.answerKey, data.hints),
          });
          setStatus(data.status);
          setEditorKey((k) => k + 1);
        })
        .catch((err) => setNotice({ kind: "error", text: err instanceof Error ? err.message : "불러오지 못했습니다." }))
        .finally(() => {
          setLoading(false);
          hydrated.current = true;
        });
      return;
    }
    // 하이드레이션 이후 한 틱 뒤에 복원한다(effect 본문에서 동기적으로 setState하지 않기 위해).
    void Promise.resolve().then(() => {
      try {
        const raw = localStorage.getItem(LOCAL_KEY);
        if (raw) {
          setForm({ ...initialState(), ...JSON.parse(raw) });
          setEditorKey((k) => k + 1);
          setNotice({ kind: "ok", text: "이전에 작성하던 내용을 불러왔습니다." });
        }
      } catch {
        /* 저장소를 쓸 수 없는 환경이면 복원만 건너뛴다 */
      }
      hydrated.current = true;
    });
  }, [editId]);

  // 새 글은 입력할 때마다 브라우저에 보관한다(로그인·새로고침·검증 오류로 내용이 사라지지 않게).
  useEffect(() => {
    if (editId || !hydrated.current) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(LOCAL_KEY, JSON.stringify(form));
      } catch {
        /* 용량 초과 등은 무시 */
      }
    }, 600);
    return () => clearTimeout(t);
  }, [form, editId]);

  const textChars = bodyTextLength(form.body);
  const shortProblem = form.inShorts
    ? textChars > SHORT_MAX_TEXT_CHARS
      ? `쇼츠 본문은 ${SHORT_MAX_TEXT_CHARS}자까지입니다.`
      : form.body.blocks.length > SHORT_MAX_BLOCKS
        ? `쇼츠는 블록 ${SHORT_MAX_BLOCKS}개까지입니다.`
        : null
    : null;

  /** 발행 전 클라이언트 검사. 서버도 같은 규칙을 다시 검사한다. */
  function publishProblem(): string | null {
    if (!form.title.trim()) return "제목이 필요합니다.";
    const hasContent = form.body.blocks.some(
      (b) => (b.kind === "text" && b.text.trim()) || (b.kind === "latex" && b.source.trim()),
    );
    if (!hasContent) return "본문이 필요합니다. 작성한 내용은 그대로 남아 있고, 임시저장으로 보관할 수 있습니다.";
    if (!form.inFeed && !form.inShorts) return "노출 위치를 하나 이상 선택해야 합니다.";
    return shortProblem;
  }

  async function save(target: "DRAFT" | "PUBLISHED") {
    if (!session?.user) {
      setNotice({ kind: "error", text: "저장하려면 로그인해야 합니다. 작성한 내용은 이 브라우저에 보관됩니다." });
      requestLogin();
      return;
    }
    if (target === "PUBLISHED") {
      const problem = publishProblem();
      if (problem) {
        setNotice({ kind: "error", text: problem });
        return;
      }
    }

    setBusy(target === "DRAFT" ? "draft" : "publish");
    setNotice(null);
    try {
      const payload = {
        status: target,
        visibility: form.visibility,
        inFeed: form.inFeed,
        inShorts: form.inShorts,
        type: form.type,
        title: form.title.trim(),
        summary: form.summary.trim() || undefined,
        difficulty: form.difficulty,
        estimatedSeconds: form.inShorts ? Math.min(form.estimatedSeconds, SHORT_MAX_SECONDS) : form.estimatedSeconds,
        categories: form.categoriesInput
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean),
        body: form.body,
        answer: form.type === "PROBLEM" ? buildAnswerPayload(form.problemAnswer) : undefined,
        hints:
          form.type === "PROBLEM"
            ? form.problemAnswer.hints
                .filter((h) => h.text.trim())
                .map((h) => ({ label: h.label.trim() || "힌트", text: h.text.trim(), isFullSolution: h.isFullSolution }))
            : undefined,
      };
      const res = await fetch(savedId ? `/api/content/${savedId}` : "/api/content", {
        method: savedId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          typeof data?.error === "string" ? data.error : data?.error ? "입력 내용을 확인해 주세요." : `저장 실패 (${res.status})`,
        );
      }

      const content = data.content as { id: string; title: string };
      setSavedId(content.id);
      setStatus(target);
      try {
        localStorage.removeItem(LOCAL_KEY);
      } catch {
        /* noop */
      }
      // 새로고침해도 같은 글을 이어서 수정하도록 주소를 맞춘다.
      window.history.replaceState(null, "", `/editor?edit=${content.id}`);

      setNotice(
        target === "DRAFT"
          ? { kind: "ok", text: "임시저장했습니다." }
          : {
              kind: "ok",
              text: `${content.title || "콘텐츠"}을(를) 발행했습니다.`,
              href: `/library/${content.id}`,
              linkLabel: "보기",
            },
      );
    } catch (err) {
      setNotice({ kind: "error", text: `저장 실패: ${err instanceof Error ? err.message : "알 수 없는 오류"}` });
    } finally {
      setBusy(null);
    }
  }

  function resetForNew() {
    try {
      localStorage.removeItem(LOCAL_KEY);
    } catch {
      /* noop */
    }
    router.push("/editor");
  }

  if (loading) return <p className="meta">불러오는 중</p>;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void save("PUBLISHED");
      }}
      className="flex flex-col gap-7"
    >
      {!sessionPending && !session?.user && (
        <p className="border-l-4 border-foreground bg-accent-soft px-4 py-3 text-sm">
          저장하려면 로그인해야 합니다. 작성 중인 내용은 이 브라우저에 자동으로 보관됩니다.
        </p>
      )}
      {notice && (
        <p
          role="status"
          className={`flex items-center justify-between gap-3 border-l-4 bg-surface-2 px-4 py-3 text-sm ${
            notice.kind === "ok" ? "border-success" : "border-danger text-danger"
          }`}
        >
          <span>{notice.text}</span>
          {notice.href && (
            <Link href={notice.href} className="font-bold underline underline-offset-2">
              {notice.linkLabel}
            </Link>
          )}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="meta">
          {savedId ? (status === "PUBLISHED" ? "발행됨 / 수정 중" : "임시저장됨") : "새 콘텐츠"}
        </p>
        {savedId && (
          <button type="button" onClick={resetForNew} className="text-xs text-muted underline underline-offset-2">
            새 콘텐츠 작성
          </button>
        )}
      </div>

      <fieldset>
        <legend className="mb-2 text-xs font-bold">노출 위치 (복수 선택)</legend>
        <div className="flex gap-2">
          <button type="button" aria-pressed={form.inFeed} onClick={() => patch({ inFeed: !form.inFeed })} className={form.inFeed ? "chip chip-active" : "chip"}>
            일반 피드
          </button>
          <button
            type="button"
            aria-pressed={form.inShorts}
            onClick={() =>
              patch({
                inShorts: !form.inShorts,
                estimatedSeconds: !form.inShorts ? Math.min(form.estimatedSeconds, SHORT_MAX_SECONDS) : form.estimatedSeconds,
              })
            }
            className={form.inShorts ? "chip chip-active" : "chip"}
          >
            쇼츠
          </button>
        </div>
        {form.inShorts && (
          <p className="mt-2 text-xs text-muted">
            쇼츠에 내려면 본문 {SHORT_MAX_TEXT_CHARS}자, 블록 {SHORT_MAX_BLOCKS}개, {SHORT_MAX_SECONDS}초 이내여야 합니다.
          </p>
        )}
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-xs font-bold">공개 범위</legend>
        <div className="flex flex-wrap gap-2">
          {VISIBILITY_OPTIONS.map((v) => (
            <button
              key={v.value}
              type="button"
              aria-pressed={form.visibility === v.value}
              onClick={() => patch({ visibility: v.value })}
              className={form.visibility === v.value ? "chip chip-active" : "chip"}
            >
              {v.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">{VISIBILITY_OPTIONS.find((v) => v.value === form.visibility)?.note}</p>
      </fieldset>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-xs font-bold">제목</span>
          <input value={form.title} onChange={(e) => patch({ title: e.target.value })} placeholder="이차방정식의 판별식" className="field" />
        </label>

        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-xs font-bold">요약 (선택)</span>
          <input value={form.summary} onChange={(e) => patch({ summary: e.target.value })} placeholder="한 줄 요약" className="field" />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold">유형</span>
          <select value={form.type} onChange={(e) => patch({ type: e.target.value as ContentType })} className="field">
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold">카테고리 (쉼표로 구분)</span>
          <input value={form.categoriesInput} onChange={(e) => patch({ categoriesInput: e.target.value })} placeholder="미적분, 기하" className="field" />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold">난이도 {form.difficulty}</span>
          <input
            type="range"
            min={1}
            max={5}
            value={form.difficulty}
            onChange={(e) => patch({ difficulty: Number(e.target.value) })}
            className="accent-[var(--foreground)]"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold">예상 소요 시간 (초)</span>
          <input
            type="number"
            min={10}
            max={form.inShorts ? SHORT_MAX_SECONDS : 3600}
            value={form.estimatedSeconds}
            onChange={(e) => patch({ estimatedSeconds: Number(e.target.value) })}
            className="field"
          />
        </label>
      </div>

      <LatexEditor key={editorKey} initialValue={form.body} onChange={(body) => patch({ body })} />
      {form.inShorts && (
        <p className={`meta -mt-4 ${shortProblem ? "font-bold !text-danger" : ""}`}>
          본문 {textChars} / {SHORT_MAX_TEXT_CHARS}자 / 블록 {form.body.blocks.length} / {SHORT_MAX_BLOCKS}
          {shortProblem && ` — ${shortProblem}`}
        </p>
      )}

      {form.type === "PROBLEM" && (
        <ProblemAnswerEditor value={form.problemAnswer} onChange={(problemAnswer) => patch({ problemAnswer })} />
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
        <button type="submit" disabled={busy !== null} className="btn-primary px-6">
          {busy === "publish" ? "발행 중" : status === "PUBLISHED" ? "수정 내용 저장" : "발행"}
        </button>
        {status !== "PUBLISHED" && (
          <button type="button" onClick={() => save("DRAFT")} disabled={busy !== null} className="btn-ghost">
            {busy === "draft" ? "저장 중" : "임시저장"}
          </button>
        )}
        {status === "PUBLISHED" && (
          <button type="button" onClick={() => save("DRAFT")} disabled={busy !== null} className="btn-ghost">
            {busy === "draft" ? "저장 중" : "발행 취소(임시저장으로)"}
          </button>
        )}
      </div>
    </form>
  );
}
