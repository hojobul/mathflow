import { CreatorForm } from "@/components/editor/CreatorForm";

export default function EditorPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold">크리에이터 에디터</h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          텍스트 + LaTeX 블록으로 콘텐츠를 작성하고 발행하세요.
        </p>
      </div>
      <CreatorForm />
    </main>
  );
}
