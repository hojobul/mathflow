"use client";

export interface HintDraft {
  label: string;
  text: string;
  isFullSolution: boolean;
}

export type AnswerMode = "none" | "numeric" | "choice" | "expression";

export interface ProblemAnswerState {
  mode: AnswerMode;
  answer: string; // 숫자 정답 또는 수식 정답 원문
  tolerance: number;
  options: string[]; // 객관식 보기 텍스트
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

const MODES = [
  ["none", "채점 없음"],
  ["numeric", "숫자"],
  ["choice", "객관식"],
  ["expression", "수식"],
] as const;

/** 문제(PROBLEM) 전용: 정답 형식, 정답, 단계별 힌트(선택). */
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
    <div className="flex flex-col gap-5 border border-line p-4">
      <div>
        <h3 className="mb-2 text-xs font-bold">정답 형식</h3>
        <div className="flex flex-wrap gap-1.5">
          {MODES.map(([m, label]) => (
            <button
              key={m}
              type="button"
              onClick={() => onChange({ ...value, mode: m })}
              className={value.mode === m ? "chip chip-active" : "chip"}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {value.mode === "numeric" && (
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="number"
            value={value.answer}
            onChange={(e) => onChange({ ...value, answer: e.target.value })}
            placeholder="정답"
            className="field w-36"
          />
          <input
            type="number"
            min={0}
            value={value.tolerance}
            onChange={(e) => onChange({ ...value, tolerance: Number(e.target.value) || 0 })}
            aria-label="허용 오차"
            placeholder="허용 오차"
            className="field w-28"
          />
        </div>
      )}

      {value.mode === "expression" && (
        <div>
          <input
            value={value.answer}
            onChange={(e) => onChange({ ...value, answer: e.target.value })}
            placeholder="정답 식 (2x+1)"
            className="field max-w-sm"
          />
          <p className="mt-1.5 text-xs text-muted">
            공백, 괄호, 대소문자를 무시하고 문자열로 비교합니다. 2x+1과 1+2x는 다른 답으로 처리됩니다.
          </p>
        </div>
      )}

      {value.mode === "choice" && (
        <div className="flex flex-col gap-2">
          {value.options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="radio"
                name="correct-option"
                checked={value.correctIndex === i}
                onChange={() => onChange({ ...value, correctIndex: i })}
                aria-label={`${i + 1}번을 정답으로 지정`}
                className="accent-[var(--foreground)]"
              />
              <input
                value={opt}
                onChange={(e) =>
                  onChange({ ...value, options: value.options.map((o, idx) => (idx === i ? e.target.value : o)) })
                }
                placeholder={`보기 ${i + 1}`}
                className="field flex-1"
              />
              {value.options.length > 2 && (
                <button
                  type="button"
                  className="text-xs text-danger underline underline-offset-2"
                  onClick={() =>
                    onChange({
                      ...value,
                      options: value.options.filter((_, idx) => idx !== i),
                      correctIndex: Math.min(value.correctIndex, value.options.length - 2),
                    })
                  }
                >
                  삭제
                </button>
              )}
            </div>
          ))}
          {value.options.length < 6 && (
            <button
              type="button"
              className="self-start text-xs underline underline-offset-2"
              onClick={() => onChange({ ...value, options: [...value.options, ""] })}
            >
              보기 추가
            </button>
          )}
          <p className="text-xs text-muted">정답인 보기의 라디오를 선택합니다.</p>
        </div>
      )}

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-bold">힌트 (선택)</h3>
          <button type="button" onClick={addHint} className="btn-ghost !h-7 !px-2.5 text-xs">
            힌트 추가
          </button>
        </div>
        {value.hints.length === 0 ? (
          <p className="text-xs text-muted">힌트 없음</p>
        ) : (
          <ol className="flex flex-col gap-3">
            {value.hints.map((hint, i) => (
              <li key={i} className="border border-line p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="meta font-bold text-foreground">힌트 {i + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeHint(i)}
                    className="text-xs text-danger underline underline-offset-2"
                  >
                    삭제
                  </button>
                </div>
                <input
                  value={hint.label}
                  onChange={(e) => updateHint(i, { label: e.target.value })}
                  placeholder="제목 (핵심 개념, 접근법 등)"
                  className="field mb-2"
                />
                <textarea
                  value={hint.text}
                  onChange={(e) => updateHint(i, { text: e.target.value })}
                  placeholder="내용"
                  rows={2}
                  className="field mb-2 resize-y"
                />
                <label className="flex items-center gap-2 text-xs text-muted">
                  <input
                    type="checkbox"
                    checked={hint.isFullSolution}
                    onChange={(e) => updateHint(i, { isFullSolution: e.target.checked })}
                    className="accent-[var(--foreground)]"
                  />
                  전체 풀이
                </label>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
