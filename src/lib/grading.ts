import { z } from "zod";

const NumericKey = z.object({
  kind: z.literal("numeric"),
  value: z.number(),
  tolerance: z.number().default(0),
});
const ChoiceKey = z.object({
  kind: z.literal("choice"),
  correctOptionId: z.string(),
  options: z.array(z.object({ id: z.string(), text: z.string() })).default([]),
});
const ExpressionKey = z.object({
  kind: z.literal("expression"),
  // normalized-string comparison (whitespace/paren-insensitive) — a stand-in
  // for a real CAS equivalence check (e.g. via a symbolic-math microservice).
  normalized: z.string(),
  raw: z.string().optional(), // 작성자 편집용 원문. 클라이언트에는 나가지 않는다.
});

export const AnswerKey = z.discriminatedUnion("kind", [NumericKey, ChoiceKey, ExpressionKey]);
export type AnswerKey = z.infer<typeof AnswerKey>;

export const SubmittedAnswer = z.union([
  z.object({ kind: z.literal("numeric"), value: z.number() }),
  z.object({ kind: z.literal("choice"), optionId: z.string() }),
  z.object({ kind: z.literal("expression"), raw: z.string().max(200) }),
]);
export type SubmittedAnswer = z.infer<typeof SubmittedAnswer>;

/** What the client may see about a problem's answer format — never the answer itself. */
export type PublicAnswerSpec =
  | { kind: "numeric" }
  | { kind: "choice"; options: { id: string; text: string }[] }
  | { kind: "expression" };

export function toPublicAnswerSpec(rawKey: unknown): PublicAnswerSpec | null {
  const key = AnswerKey.safeParse(rawKey);
  if (!key.success) return null;
  switch (key.data.kind) {
    case "numeric":
      return { kind: "numeric" };
    case "choice":
      return { kind: "choice", options: key.data.options };
    case "expression":
      return { kind: "expression" };
  }
}

export function gradeAnswer(rawKey: unknown, rawSubmitted: unknown): boolean {
  const key = AnswerKey.safeParse(rawKey);
  const submitted = SubmittedAnswer.safeParse(rawSubmitted);
  if (!key.success || !submitted.success) return false;
  if (key.data.kind !== submitted.data.kind) return false;

  switch (key.data.kind) {
    case "numeric":
      return (
        submitted.data.kind === "numeric" &&
        Math.abs(submitted.data.value - key.data.value) <= key.data.tolerance
      );
    case "choice":
      return submitted.data.kind === "choice" && submitted.data.optionId === key.data.correctOptionId;
    case "expression":
      return (
        submitted.data.kind === "expression" &&
        normalizeExpression(submitted.data.raw) === key.data.normalized
      );
  }
}

export function normalizeExpression(raw: string): string {
  return raw.replace(/\s+/g, "").replace(/[()]/g, "").replace(/\\left|\\right/g, "").toLowerCase();
}
