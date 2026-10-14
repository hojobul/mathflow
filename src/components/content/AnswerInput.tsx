"use client";

import { useState } from "react";
import type { PublicAnswerSpec, SubmittedAnswer } from "@/lib/grading";

interface AnswerInputProps {
  spec: PublicAnswerSpec;
  disabled?: boolean;
  pending?: boolean;
  onSubmit: (answer: SubmittedAnswer) => void;
}

/** 정답 형식(숫자 / 객관식 / 수식)에 맞는 입력. */
export function AnswerInput({ spec, disabled, pending, onSubmit }: AnswerInputProps) {
  const [text, setText] = useState("");
  const [optionId, setOptionId] = useState<string | null>(null);

  const ready =
    spec.kind === "choice"
      ? optionId !== null
      : spec.kind === "numeric"
        ? text.trim() !== "" && !Number.isNaN(Number(text))
        : text.trim() !== "";

  function submit() {
    if (!ready || disabled || pending) return;
    if (spec.kind === "choice") onSubmit({ kind: "choice", optionId: optionId! });
    else if (spec.kind === "numeric") onSubmit({ kind: "numeric", value: Number(text) });
    else onSubmit({ kind: "expression", raw: text });
  }

  return (
    <div className="flex flex-col gap-3">
      {spec.kind === "choice" ? (
        <div className="flex flex-col gap-1.5" role="radiogroup">
          {spec.options.map((opt, i) => (
            <label
              key={opt.id}
              className={`flex cursor-pointer items-center gap-3 border px-3 py-2 text-sm transition-colors ${
                optionId === opt.id ? "border-foreground bg-accent-soft" : "border-line-strong hover:border-foreground"
              } ${disabled ? "pointer-events-none opacity-60" : ""}`}
            >
              <input type="radio" className="sr-only" checked={optionId === opt.id} onChange={() => setOptionId(opt.id)} />
              <span className="meta w-4 shrink-0 font-bold text-foreground">{i + 1}</span>
              {opt.text}
            </label>
          ))}
        </div>
      ) : (
        <input
          type={spec.kind === "numeric" ? "number" : "text"}
          inputMode={spec.kind === "numeric" ? "decimal" : "text"}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          disabled={disabled}
          placeholder={spec.kind === "numeric" ? "숫자" : "식 (예: 2x+1)"}
          className="field max-w-56 font-mono disabled:opacity-50"
        />
      )}
      <button type="button" onClick={submit} disabled={!ready || disabled || pending} className="btn-primary self-start">
        {pending ? "채점 중" : "제출"}
      </button>
    </div>
  );
}
