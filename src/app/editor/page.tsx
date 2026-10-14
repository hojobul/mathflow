import { CreatorForm } from "@/components/editor/CreatorForm";

export const dynamic = "force-dynamic";

export default async function EditorPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const { edit } = await searchParams;

  return (
    <main className="page max-w-5xl">
      <div>
        <h1 className="page-title">{edit ? "수정" : "에디터"}</h1>
        <p className="mt-1 text-sm text-muted">텍스트와 LaTeX 블록으로 작성합니다. 문제는 정답과 힌트를 붙일 수 있습니다.</p>
      </div>
      <CreatorForm key={edit ?? "new"} editId={edit} />
    </main>
  );
}
