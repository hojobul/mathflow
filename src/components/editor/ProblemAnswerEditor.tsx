"use client";

export interface HintDraft {
  label: string;
  text: string;
  isFullSolution: boolean;
}

export type AnswerMode = "none" | "numeric" | "choice" | "expression";

export interface ProblemAnswerState {
  mode: AnswerMode;
  answer: string; // numeric value or expression text, as typed
  tolerance: number;
  options: string[]; // choice mode: option texts
  correctIndex: number;
  hints: HintDraft[];
}

export function emptyProblemAnswerState(): ProblemAnswerState {
  return { mode: "none", answer: "", tolerance: 0, options: ["", ""], correctIndex: 0, hints: [] };
}

interface ProblemAnswerEditorProps {
  value: ProblemAnswerState;
  onChange: (next: ProblemAnswerState) => void;
}

/**
 * 문제(PROBLEM) 콘텐츠용 정답 + 힌트(선택) 편집기. 정답은 현재 숫자형만
 * 지원(seed 데이터 및 grading.ts의 numeric 채점과 동일한 모양) — 객관식/수식
 * 채점은 이후 필요해지면 이 컴포넌트에 모드를 추가하면 된다.
 */
export function ProblemAnswerEditor({ value, onChange }: ProblemAnswerEditorProps) {
  const addHint = () => {
    onChange({ ...value, hints: [...value.hints, { label: "", text: "", isFullSolution: false }] });
  };
  const updateHint = (i: number, patch: Partial<HintDraft>) => {
    onChange({ ...value, hints: value.hints.map((h, idx) => (idx === i ? { ...h, ...patch } : h)) });
  };
  const removeHint = (i: number) => {
    onChange({ ...value, hints: value.hints.filter((_, idx) => idx !== i) });
  };

  return (
    <div className="flex flex-col gap-4 rounded-md border border-line p-4">
      <div>
        <h3 className="text-sm font-medium">정답 형식</h3>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {([["none", "채점 없음"], ["numeric", "숫자"], ["choice", "객관식"], ["expression", "수식"]] as const).map(([m, label]) => (
            <button
              key={m}
              type="button"
              onClick={() => onChange({ ...value, mode: m })}
              className={`rounded-full border px-3 py-1 text-xs ${
                value.mode === m ? "border-accent bg-accent-soft font-semibold" : "border-line hover:border-line-strong"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {value.mode === "numeric" && (
        <div className="flex items-center gap-3">
          <input type="number" value={value.answer} onChange={(e) => onChange({ ...value, answer: e.target.value })} placeholder="정답 (숫자)" className="w-36 rounded-lg border border-line bg-transparent px-2 py-1.5 text-sm outline-none focus:border-accent" />
          <input type="number" min={0} value={value.tolerance} onChange={(e) => onChange({ ...value, tolerance: Number(e.target.value) || 0 })} aria-label="허용 오차" placeholder="허용 오차" className="w-28 rounded-lg border border-line bg-transparent px-2 py-1.5 text-sm outline-none focus:border-accent" />
        </div>
      )}

      {value.mode === "expression" && (
        <div>
          <input value={value.answer} onChange={(e) => onChange({ ...value, answer: e.target.value })} placeholder="정답 수식 (예: 2x+1)" className="w-full rounded-lg border border-line bg-transparent px-2 py-1.5 text-sm outline-none focus:border-accent" />
          <p className="mt-1 text-xs text-muted">공백·괄호·대소문자는 무시하고 글자 그대로 비교해요 (2x+1 과 1+2x 는 다른 답).</p>
        </div>
      )}

      {value.mode === "choice" && (
        <div className="flex flex-col gap-2">
          {value.options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input type="radio" name="correct-option" checked={value.correctIndex === i} onChange={() => onChange({ ...value, correctIndex: i })} aria-label={`${i + 1}번을 정답으로`} />
              <input value={opt} onChange={(e) => onChange({ ...value, options: value.options.map((o, idx) => (idx === i ? e.target.value : o)) })} placeholder={`보기 ${i + 1}`} className="flex-1 rounded-lg border border-line bg-transparent px-2 py-1.5 text-sm outline-none focus:border-accent" />
              {value.options.length > 2 && (
                <button type="button" className="text-xs text-danger" onClick={() => onChange({ ...value, options: value.options.filter((_, idx) => idx !== i), correctIndex: Math.min(value.correctIndex, value.options.length - 2) })}>삭제</button>
              )}
            </div>
          ))}
          {value.options.length < 6 && (
            <button type="button" className="self-start text-xs underline" onClick={() => onChange({ ...value, options: [...value.options, ""] })}>+ 보기 추가</button>
          )}
          <p className="text-xs text-muted">정답인 보기 왼쪽 라디오를 선택하세요.</p>
        </div>
      )}

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium">힌트 (선택)</h3>
          <button
            type="button"
            onClick={addHint}
            className="rounded border border-line px-2.5 py-1 text-xs hover:bg-surface-2"
          >
            + 힌트 추가
          </button>
        </div>
        {value.hints.length === 0 ? (
          <p className="text-xs text-muted">힌트 없이 발행할 수도 있어요.</p>
        ) : (
          <ol className="flex flex-col gap-3">
            {value.hints.map((hint, i) => (
              <li key={i} className="rounded border border-line p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-muted">힌트 {i + 1}</span>
                  <button type="button" onClick={() => removeHint(i)} className="text-xs text-red-400 hover:text-red-600">
                    삭제
                  </button>
                </div>
                <input
                  value={hint.label}
                  onChange={(e) => updateHint(i, { label: e.target.value })}
                  placeholder="힌트 제목 (예: 핵심 개념)"
                  className="mb-2 w-full rounded border border-line bg-transparent px-2 py-1.5 text-sm outline-none "
                />
                <textarea
                  value={hint.text}
                  onChange={(e) => updateHint(i, { text: e.target.value })}
                  placeholder="힌트 내용"
                  rows={2}
                  className="mb-2 w-full resize-y rounded border border-line bg-transparent px-2 py-1.5 text-sm outline-none "
                />
                <label className="flex items-center gap-2 text-xs text-muted">
                  <input
                    type="checkbox"
                    checked={hint.isFullSolution}
                    onChange={(e) => updateHint(i, { isFullSolution: e.target.checked })}
                  />
                  전체 풀이입니다
                </label>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
