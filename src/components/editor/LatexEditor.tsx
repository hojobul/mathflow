"use client";

import { useCallback, useRef, useState } from "react";
import { InlineMath } from "react-katex";
import type { ContentBlock, ContentBody } from "@/lib/content/blocks";
import { emptyContentBody, MAX_LATEX_SOURCE_LENGTH } from "@/lib/content/blocks";
import { ContentBodyView } from "@/components/content/ContentBodyView";
import { Icon } from "@/components/ui/Icon";
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
        <div className="flex flex-col gap-2 border border-line bg-surface-2 p-3">
          {LATEX_SNIPPET_GROUPS.map((group) => (
            <div key={group.title} className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 w-16 shrink-0 text-[11px] font-bold text-muted">{group.title}</span>
              {group.snippets.map((snippet) => (
                <button
                  key={snippet.label}
                  type="button"
                  onClick={() => insertSnippet(snippet)}
                  title={`삽입: ${snippet.insert}`}
                  className="border border-line-strong bg-surface px-2.5 py-1.5 text-sm hover:border-foreground"
                >
                  <InlineMath math={snippet.label} />
                </button>
              ))}
            </div>
          ))}
          <p className="text-[11px] text-muted">
            {activeLatexBlockId ? "커서 위치에 삽입됩니다." : "수식 블록이 없으면 기호를 누를 때 새로 만듭니다."}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {body.blocks.map((block, i) => (
            <div
              key={block.id}
              className={`relative border p-3 pl-10 ${activeLatexBlockId === block.id ? "border-foreground" : "border-line"}`}
            >
              <div className="absolute left-2 top-3 flex flex-col gap-1.5 text-muted">
                <button
                  type="button"
                  onClick={() => moveBlock(block.id, -1)}
                  disabled={i === 0}
                  aria-label="위로 이동"
                  className="hover:text-foreground disabled:opacity-20"
                >
                  <Icon name="arrow-up" size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => moveBlock(block.id, 1)}
                  disabled={i === body.blocks.length - 1}
                  aria-label="아래로 이동"
                  className="hover:text-foreground disabled:opacity-20"
                >
                  <Icon name="arrow-down" size={15} />
                </button>
                <button type="button" onClick={() => removeBlock(block.id)} aria-label="블록 삭제" className="hover:text-danger">
                  <Icon name="close" size={15} />
                </button>
              </div>

              <p className="mb-1.5 text-[11px] font-bold text-muted">{block.kind === "text" ? "텍스트" : "수식"}</p>

              {block.kind === "text" && (
                <textarea
                  value={block.text}
                  onChange={(e) => updateBlock(block.id, { text: e.target.value })}
                  onFocus={() => setActiveLatexBlockId(null)}
                  placeholder="본문"
                  rows={3}
                  className="w-full resize-y bg-transparent text-sm outline-none placeholder:text-muted"
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
                    className="w-full resize-y bg-surface-2 p-2 font-mono text-sm outline-none placeholder:text-muted"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <label className="flex items-center gap-2 text-xs text-muted">
                      <input
                        type="checkbox"
                        checked={block.display === "block"}
                        onChange={(e) => updateBlock(block.id, { display: e.target.checked ? "block" : "inline" })}
                        className="accent-[var(--foreground)]"
                      />
                      블록 수식 (줄 전체)
                    </label>
                    <span
                      className={`shrink-0 font-mono text-[11px] tabular-nums ${
                        block.source.length >= MAX_LATEX_SOURCE_LENGTH ? "text-danger" : "text-muted"
                      }`}
                    >
                      {block.source.length} / {MAX_LATEX_SOURCE_LENGTH}
                    </span>
                  </div>
                  {HANGUL_RE.test(block.source) && (
                    <p className="text-[11px] font-semibold text-danger">수식 블록에 한글이 있습니다. 설명은 텍스트 블록에 쓰세요.</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <button type="button" onClick={() => addBlock("text")} className="btn-ghost">
            <Icon name="plus" size={15} />
            텍스트
          </button>
          <button type="button" onClick={() => addBlock("latex")} className="btn-ghost">
            <Icon name="plus" size={15} />
            수식
          </button>
        </div>
      </div>

      <div className="lg:sticky lg:top-20 lg:self-start">
        <p className="mb-1.5 text-xs font-bold text-muted">미리보기</p>
        <div className="card p-4">
          <ContentBodyView body={body} />
        </div>
      </div>
    </div>
  );
}
