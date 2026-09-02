"use client";

import { useCallback, useRef, useState } from "react";
import { InlineMath } from "react-katex";
import type { ContentBlock, ContentBody } from "@/lib/content/blocks";
import { emptyContentBody, MAX_LATEX_SOURCE_LENGTH } from "@/lib/content/blocks";
import { ContentBodyView } from "@/components/content/ContentBodyView";
import { LATEX_SNIPPET_GROUPS, type LatexSnippet } from "./latexSnippets";

interface LatexEditorProps {
  initialValue?: ContentBody;
  onChange: (body: ContentBody) => void;
}

const HANGUL_RE = /[ㄱ-ㆎ가-힣]/;

/**
 * Block-based rich text + LaTeX editor (§2-D / 3단계 §2).
 *
 * Two-column layout: block editor on the left, a live full-document
 * preview on the right (sticky) so the writer always sees the finished
 * card, not just an isolated per-block snippet. The toolbar never sits
 * disabled — clicking a symbol with no LaTeX block focused creates one at
 * the end of the document and inserts into it, so there's no dead click.
 */
export function LatexEditor({ initialValue, onChange }: LatexEditorProps) {
  const [body, setBody] = useState<ContentBody>(initialValue ?? emptyContentBody());
  const [activeLatexBlockId, setActiveLatexBlockId] = useState<string | null>(
    body.blocks.find((b) => b.kind === "latex")?.id ?? null,
  );
  const textareaRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map());
  const pendingInsertRef = useRef<LatexSnippet | null>(null);

  const commit = useCallback(
    (next: ContentBody) => {
      setBody(next);
      onChange(next);
    },
    [onChange],
  );

  const updateBlock = useCallback(
    (id: string, patch: Partial<ContentBlock>) => {
      commit({
        blocks: body.blocks.map((b) => (b.id === id ? ({ ...b, ...patch } as ContentBlock) : b)),
      });
    },
    [body.blocks, commit],
  );

  const addBlock = useCallback(
    (kind: "text" | "latex") => {
      const block: ContentBlock =
        kind === "text"
          ? { id: crypto.randomUUID(), kind: "text", text: "" }
          : { id: crypto.randomUUID(), kind: "latex", source: "", display: "block" };
      commit({ blocks: [...body.blocks, block] });
      if (kind === "latex") setActiveLatexBlockId(block.id);
      return block.id;
    },
    [body.blocks, commit],
  );

  const removeBlock = useCallback(
    (id: string) => {
      commit({ blocks: body.blocks.filter((b) => b.id !== id) });
      if (activeLatexBlockId === id) setActiveLatexBlockId(null);
    },
    [activeLatexBlockId, body.blocks, commit],
  );

  const moveBlock = useCallback(
    (id: string, direction: -1 | 1) => {
      const index = body.blocks.findIndex((b) => b.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= body.blocks.length) return;
      const next = [...body.blocks];
      [next[index], next[target]] = [next[target], next[index]];
      commit({ blocks: next });
    },
    [body.blocks, commit],
  );

  const insertIntoBlock = useCallback(
    (blockId: string, snippet: LatexSnippet) => {
      const block = body.blocks.find((b) => b.id === blockId);
      if (!block || block.kind !== "latex") return;
      const textarea = textareaRefs.current.get(blockId);
      const caret = textarea?.selectionStart ?? block.source.length;
      const room = MAX_LATEX_SOURCE_LENGTH - block.source.length;
      if (room <= 0) return; // already at the cap — nothing to insert
      const insert = snippet.insert.slice(0, room);
      const nextSource = block.source.slice(0, caret) + insert + block.source.slice(caret);
      updateBlock(blockId, { source: nextSource });

      requestAnimationFrame(() => {
        const el = textareaRefs.current.get(blockId);
        if (!el) return;
        const cursor = caret + Math.min(snippet.cursorOffset ?? insert.length, insert.length);
        el.focus();
        el.setSelectionRange(cursor, cursor);
      });
    },
    [body.blocks, updateBlock],
  );

  const insertSnippet = useCallback(
    (snippet: LatexSnippet) => {
      if (activeLatexBlockId) {
        insertIntoBlock(activeLatexBlockId, snippet);
        return;
      }
      // No LaTeX block focused yet — create one and insert into it instead
      // of leaving the toolbar looking dead.
      pendingInsertRef.current = snippet;
      const newId = addBlock("latex");
      // addBlock's state update lands next render; apply the pending
      // insert once that block actually exists.
      requestAnimationFrame(() => {
        const pending = pendingInsertRef.current;
        pendingInsertRef.current = null;
        if (pending) insertIntoBlock(newId, pending);
      });
    },
    [activeLatexBlockId, addBlock, insertIntoBlock],
  );

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 rounded-md border border-black/10 bg-black/[.02] p-3 dark:border-white/10 dark:bg-white/[.03]">
          {LATEX_SNIPPET_GROUPS.map((group) => (
            <div key={group.title} className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 shrink-0 text-[11px] font-medium text-black/45 dark:text-white/45">
                {group.title}
              </span>
              {group.snippets.map((snippet) => (
                <button
                  key={snippet.label}
                  type="button"
                  onClick={() => insertSnippet(snippet)}
                  title={`삽입: ${snippet.insert}`}
                  className="rounded border border-black/10 bg-background px-2.5 py-1.5 text-sm hover:border-black/25 hover:bg-black/5 dark:border-white/15 dark:hover:border-white/30 dark:hover:bg-white/10"
                >
                  <InlineMath math={snippet.label} />
                </button>
              ))}
            </div>
          ))}
          <p className="text-[11px] text-black/40 dark:text-white/40">
            {activeLatexBlockId
              ? "선택한 기호가 현재 커서 위치에 삽입됩니다."
              : "수식 블록을 클릭하거나, 기호를 바로 눌러 새 수식 블록을 만들 수 있어요."}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {body.blocks.map((block, i) => (
            <div
              key={block.id}
              className={`relative rounded-md border p-3 pl-8 ${
                activeLatexBlockId === block.id
                  ? "border-blue-400/60 dark:border-blue-400/50"
                  : "border-black/10 dark:border-white/10"
              }`}
            >
              <div className="absolute left-1.5 top-3 flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => moveBlock(block.id, -1)}
                  disabled={i === 0}
                  aria-label="위로 이동"
                  className="text-xs text-black/35 hover:text-black/70 disabled:opacity-20 dark:text-white/35 dark:hover:text-white/70"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveBlock(block.id, 1)}
                  disabled={i === body.blocks.length - 1}
                  aria-label="아래로 이동"
                  className="text-xs text-black/35 hover:text-black/70 disabled:opacity-20 dark:text-white/35 dark:hover:text-white/70"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => removeBlock(block.id)}
                  aria-label="블록 삭제"
                  className="text-xs text-red-400 hover:text-red-600"
                >
                  ✕
                </button>
              </div>

              <div className="mb-1.5 flex items-center gap-2">
                <span className="rounded bg-black/5 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-black/50 dark:bg-white/10 dark:text-white/50">
                  {block.kind === "text" ? "텍스트" : "수식"}
                </span>
              </div>

              {block.kind === "text" && (
                <textarea
                  value={block.text}
                  onChange={(e) => updateBlock(block.id, { text: e.target.value })}
                  onFocus={() => setActiveLatexBlockId(null)}
                  placeholder="본문을 입력하세요…"
                  rows={3}
                  className="w-full resize-y bg-transparent text-sm outline-none"
                />
              )}

              {block.kind === "latex" && (
                <div className="flex flex-col gap-2">
                  <textarea
                    ref={(el) => {
                      if (el) textareaRefs.current.set(block.id, el);
                      else textareaRefs.current.delete(block.id);
                    }}
                    value={block.source}
                    onChange={(e) => updateBlock(block.id, { source: e.target.value.slice(0, MAX_LATEX_SOURCE_LENGTH) })}
                    onFocus={() => setActiveLatexBlockId(block.id)}
                    placeholder="\int_{a}^{b} f(x)\,dx"
                    rows={2}
                    spellCheck={false}
                    maxLength={MAX_LATEX_SOURCE_LENGTH}
                    className="w-full resize-y rounded bg-black/[.03] p-2 font-mono text-sm outline-none dark:bg-white/[.05]"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <label className="flex items-center gap-2 text-xs text-black/60 dark:text-white/60">
                      <input
                        type="checkbox"
                        checked={block.display === "block"}
                        onChange={(e) => updateBlock(block.id, { display: e.target.checked ? "block" : "inline" })}
                      />
                      블록 수식으로 표시 (한 줄 전체 차지)
                    </label>
                    <span
                      className={`shrink-0 text-[11px] tabular-nums ${
                        block.source.length >= MAX_LATEX_SOURCE_LENGTH
                          ? "text-red-500"
                          : "text-black/35 dark:text-white/35"
                      }`}
                    >
                      {block.source.length} / {MAX_LATEX_SOURCE_LENGTH}
                    </span>
                  </div>
                  {HANGUL_RE.test(block.source) && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400">
                      한글이 섞여 있어요 — 설명 문장은 수식 블록 대신 텍스트 블록에 적어주세요.
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => addBlock("text")}
            className="rounded border border-black/15 px-3 py-1.5 text-sm hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
          >
            + 텍스트 블록
          </button>
          <button
            type="button"
            onClick={() => addBlock("latex")}
            className="rounded border border-black/15 px-3 py-1.5 text-sm hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
          >
            + 수식 블록
          </button>
        </div>
      </div>

      <div className="lg:sticky lg:top-4 lg:self-start">
        <div className="mb-1.5 text-xs font-medium text-black/50 dark:text-white/50">미리보기</div>
        <div className="rounded-md border border-black/10 bg-background p-4 dark:border-white/10">
          <ContentBodyView body={body} />
        </div>
      </div>
    </div>
  );
}
