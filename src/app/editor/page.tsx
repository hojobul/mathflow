import { CreatorForm } from "@/components/editor/CreatorForm";

export default function EditorPage() {
  return (
    <main className="page max-w-5xl">
      <div>
        <h1 className="page-title">에디터</h1>
        <p className="mt-1 text-sm text-muted">텍스트와 LaTeX 블록으로 작성합니다. 문제는 정답과 힌트를 붙일 수 있습니다.</p>
      </div>
      <CreatorForm />
    </main>
  );
}
