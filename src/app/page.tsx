import Link from "next/link";

const FEATURES = [
  { icon: "🎯", title: "나에게 맞는 피드", body: "읽은 시간, 풀이 습관, 좋아요를 보고 내 실력과 취향에 맞는 콘텐츠를 먼저 보여줘요." },
  { icon: "⚡", title: "Daily Math Rush", body: "매일 3분 타임어택. 정답률과 상위 % 로 오늘의 나를 확인하세요." },
  { icon: "✍️", title: "수식으로 바로 만들기", body: "LaTeX 툴바와 실시간 미리보기로 문제·힌트·정답까지 한 번에 발행해요." },
  { icon: "📚", title: "나만의 수학 서재", body: "스크랩북, 틀린 문제를 모아주는 오답노트, 개념 앨범까지." },
];

export default function Home() {
  return (
    <main className="page max-w-4xl gap-12 py-14">
      <section className="flex flex-col items-center gap-5 text-center">
        <span className="chip chip-active pointer-events-none">수학이 피드가 되다</span>
        <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
          보다 보면 <span className="text-accent">수학이 늘어요</span>
        </h1>
        <p className="max-w-xl text-muted">
          문제, 수학사, 비하인드 스토리, 인터랙티브 그래프까지. 스크롤하는 만큼 나에게 맞춰지는 수학 콘텐츠 플랫폼.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/feed" className="btn-primary px-6 py-3">
            피드 시작하기
          </Link>
          <Link href="/quiz" className="btn-ghost px-6 py-3">
            오늘의 Math Rush
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <div key={f.title} className="card p-5">
            <div className="mb-2 text-2xl">{f.icon}</div>
            <h2 className="font-semibold">{f.title}</h2>
            <p className="mt-1 text-sm text-muted">{f.body}</p>
          </div>
        ))}
      </section>

      <section className="card flex flex-col items-center gap-3 p-8 text-center">
        <h2 className="text-xl font-bold">내가 아는 수학, 나눠볼까요?</h2>
        <p className="text-sm text-muted">크리에이터가 되어 채널을 만들고 구독자를 모아보세요.</p>
        <Link href="/editor" className="btn-primary">
          콘텐츠 만들기
        </Link>
      </section>
    </main>
  );
}
