import { CreatorForm } from "@/components/editor/CreatorForm";

export default function EditorPage() {
  return (
    <main className="page max-w-5xl">
      <div>
        <h1 className="page-title">크리에이터 에디터</h1>
        <p className="text-sm text-muted">
          텍스트 + LaTeX 블록으로 콘텐츠를 작성하고 발행하세요.
        </p>
      </div>
      <CreatorForm />
    </main>
  );
}
