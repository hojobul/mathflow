"use client";

export interface HintDraft {
  label: string;
  text: string;
  isFullSolution: boolean;
}

export interface ProblemAnswerState {
  answer: string; // numeric answer as typed text; "" = not set
  tolerance: number;
  hints: HintDraft[];
}

export function emptyProblemAnswerState(): ProblemAnswerState {
  return { answer: "", tolerance: 0, hints: [] };
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
    <div className="flex flex-col gap-4 rounded-md border border-black/10 p-4 dark:border-white/10">
      <div>
        <h3 className="text-sm font-medium">정답</h3>
        <p className="text-xs text-black/50 dark:text-white/50">비워두면 채점 없는 문제로 발행돼요 (숫자 정답만 지원).</p>
      </div>
      <div className="flex items-center gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-black/60 dark:text-white/60">정답 (숫자)</span>
          <input
            type="number"
            value={value.answer}
            onChange={(e) => onChange({ ...value, answer: e.target.value })}
            placeholder="예: 5"
            className="w-32 rounded border border-black/15 bg-transparent px-2 py-1.5 text-sm outline-none dark:border-white/20"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-black/60 dark:text-white/60">허용 오차 (선택)</span>
          <input
            type="number"
            min={0}
            value={value.tolerance}
            onChange={(e) => onChange({ ...value, tolerance: Number(e.target.value) || 0 })}
            className="w-24 rounded border border-black/15 bg-transparent px-2 py-1.5 text-sm outline-none dark:border-white/20"
          />
        </label>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium">힌트 (선택)</h3>
          <button
            type="button"
            onClick={addHint}
            className="rounded border border-black/15 px-2.5 py-1 text-xs hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
          >
            + 힌트 추가
          </button>
        </div>
        {value.hints.length === 0 ? (
          <p className="text-xs text-black/40 dark:text-white/40">힌트 없이 발행할 수도 있어요.</p>
        ) : (
          <ol className="flex flex-col gap-3">
            {value.hints.map((hint, i) => (
              <li key={i} className="rounded border border-black/10 p-3 dark:border-white/15">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-black/50 dark:text-white/50">힌트 {i + 1}</span>
                  <button type="button" onClick={() => removeHint(i)} className="text-xs text-red-400 hover:text-red-600">
                    삭제
                  </button>
                </div>
                <input
                  value={hint.label}
                  onChange={(e) => updateHint(i, { label: e.target.value })}
                  placeholder="힌트 제목 (예: 핵심 개념)"
                  className="mb-2 w-full rounded border border-black/15 bg-transparent px-2 py-1.5 text-sm outline-none dark:border-white/20"
                />
                <textarea
                  value={hint.text}
                  onChange={(e) => updateHint(i, { text: e.target.value })}
                  placeholder="힌트 내용"
                  rows={2}
                  className="mb-2 w-full resize-y rounded border border-black/15 bg-transparent px-2 py-1.5 text-sm outline-none dark:border-white/20"
                />
                <label className="flex items-center gap-2 text-xs text-black/60 dark:text-white/60">
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
