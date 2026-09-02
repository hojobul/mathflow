import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold">MathFlow</h1>
      <p className="text-sm text-black/60 dark:text-white/60">
        개인화된 수학 콘텐츠 피드 및 추천 플랫폼 — 아키텍처 청사진
      </p>
      <div className="flex gap-3">
        <Link
          href="/editor"
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
        >
          콘텐츠 만들기
        </Link>
        <Link
          href="/library"
          className="rounded-md border border-black/15 px-4 py-2 text-sm hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
        >
          라이브러리 보기
        </Link>
      </div>
    </main>
  );
}
