import { InlineMath, BlockMath } from "react-katex";
import type { ContentBlock, ContentBody } from "@/lib/content/blocks";

/**
 * Read-only renderer for a `ContentBody` — the same block shape the editor
 * produces. Used for the editor's live full-document preview and (later)
 * the feed / library card body.
 */
export function ContentBodyView({ body }: { body: ContentBody }) {
  if (body.blocks.length === 0 || body.blocks.every((b) => b.kind === "text" && !b.text.trim())) {
    return <p className="text-sm text-black/40 dark:text-white/40">아직 내용이 없습니다.</p>;
  }
  return (
    <div className="flex flex-col gap-3">
      {body.blocks.map((block) => (
        <ContentBlockView key={block.id} block={block} />
      ))}
    </div>
  );
}

function ContentBlockView({ block }: { block: ContentBlock }) {
  const renderError = () => <span className="text-xs text-red-500">수식 오류: 문법을 확인하세요</span>;

  switch (block.kind) {
    case "text":
      return block.text.trim() ? (
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{block.text}</p>
      ) : null;
    case "latex":
      return !block.source.trim() ? null : block.display === "block" ? (
        <div className="overflow-x-auto py-1">
          <BlockMath math={block.source} renderError={renderError} />
        </div>
      ) : (
        <InlineMath math={block.source} renderError={renderError} />
      );
    case "image":
      // eslint-disable-next-line @next/next/no-img-element -- arbitrary creator-supplied URLs, not build-time known
      return <img src={block.url} alt={block.alt} className="max-w-full rounded" />;
    case "widget":
      return (
        <div className="rounded border border-dashed border-black/15 p-3 text-xs text-black/50 dark:border-white/20 dark:text-white/50">
          인터랙티브 위젯: <code>{block.expression}</code> (변수: {Object.keys(block.variables).join(", ")})
        </div>
      );
  }
}
