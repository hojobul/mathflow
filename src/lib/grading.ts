import { z } from "zod";

const NumericKey = z.object({
  kind: z.literal("numeric"),
  value: z.number(),
  tolerance: z.number().default(0),
});
const ChoiceKey = z.object({ kind: z.literal("choice"), correctOptionId: z.string() });
const ExpressionKey = z.object({
  kind: z.literal("expression"),
  // normalized-string comparison (whitespace/paren-insensitive) — a stand-in
  // for a real CAS equivalence check (e.g. via a symbolic-math microservice).
  normalized: z.string(),
});

export const AnswerKey = z.discriminatedUnion("kind", [NumericKey, ChoiceKey, ExpressionKey]);
export type AnswerKey = z.infer<typeof AnswerKey>;

export const SubmittedAnswer = z.union([
  z.object({ kind: z.literal("numeric"), value: z.number() }),
  z.object({ kind: z.literal("choice"), optionId: z.string() }),
  z.object({ kind: z.literal("expression"), raw: z.string() }),
]);
export type SubmittedAnswer = z.infer<typeof SubmittedAnswer>;

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

function normalizeExpression(raw: string): string {
  return raw.replace(/\s+/g, "").replace(/[()]/g, "").toLowerCase();
}
