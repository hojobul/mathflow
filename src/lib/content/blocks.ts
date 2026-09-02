/**
 * Shared block shape for `Content.body` / `Hint.body` (see prisma/schema.prisma).
 * Kept framework-agnostic (no React types) so it can be imported from both
 * the editor (client) and the feed renderer / API routes (server).
 */
export type ContentBlock =
  | { id: string; kind: "text"; text: string }
  | { id: string; kind: "latex"; source: string; display: "inline" | "block" }
  | { id: string; kind: "image"; url: string; alt: string }
  | { id: string; kind: "widget"; widgetType: "graph"; expression: string; variables: Record<string, number> };

export interface ContentBody {
  blocks: ContentBlock[];
}

// 너무 긴 수식은 렌더링 성능/가독성을 해치므로 블록당 소스 길이를 제한한다.
// 에디터(client)와 /api/content(server) 양쪽에서 이 값을 기준으로 강제한다.
export const MAX_LATEX_SOURCE_LENGTH = 400;

export function emptyContentBody(): ContentBody {
  return { blocks: [{ id: crypto.randomUUID(), kind: "text", text: "" }] };
}

/** Extracts LaTeX sources for `Content.latexExpressions` (expression-unit search). */
export function extractLatexExpressions(body: ContentBody): string[] {
  return body.blocks.filter((b): b is Extract<ContentBlock, { kind: "latex" }> => b.kind === "latex").map((b) => b.source);
}

/** Flattens text + latex blocks into a plain string for `Content.searchText`. */
export function extractSearchText(body: ContentBody): string {
  return body.blocks
    .map((b) => {
      if (b.kind === "text") return b.text;
      if (b.kind === "latex") return b.source;
      if (b.kind === "image") return b.alt;
      return "";
    })
    .join(" ")
    .trim();
}
