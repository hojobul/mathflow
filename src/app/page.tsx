import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

const INDEX = [
  { no: "01", href: "/feed", title: "피드", note: "읽은 시간과 풀이 기록을 반영해 순서를 정한 콘텐츠" },
  { no: "02", href: "/shorts", title: "쇼츠", note: "60초 안에 끝나는 짧은 문제와 설명" },
  { no: "03", href: "/quiz", title: "Math Rush", note: "하루 한 번, 3분 제한 퀴즈" },
  { no: "04", href: "/me/library", title: "서재", note: "스크랩, 오답노트, 개념 앨범" },
  { no: "05", href: "/editor", title: "에디터", note: "LaTeX로 작성. 문제는 정답과 힌트를 붙일 수 있음" },
];

export default function Home() {
  return (
    <main className="page max-w-3xl gap-10 py-14">
      <section>
        <p className="meta mb-4">MathFlow</p>
        <h1 className="font-serif text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
          문제, 수학사, 증명 뒷이야기를
          <br />
          <span className="hl">짧게 읽고 직접 풉니다.</span>
        </h1>
        <p className="mt-5 max-w-xl text-muted">
          콘텐츠는 읽은 시간, 힌트 사용, 정답 여부, 좋아요, 구독을 기준으로 정렬됩니다. 작성자는 누구나 될 수 있습니다.
        </p>
        <div className="mt-6 flex gap-3">
          <Link href="/feed" className="btn-primary">
            피드 열기
          </Link>
          <Link href="/shorts" className="btn-ghost">
            쇼츠
          </Link>
        </div>
      </section>

      <section>
        <h2 className="section-label mb-1">목차</h2>
        <ol>
          {INDEX.map((row) => (
            <li key={row.no}>
              <Link href={row.href} className="row-link flex items-baseline gap-4">
                <span className="meta w-6 shrink-0">{row.no}</span>
                <span className="w-28 shrink-0 font-serif text-lg font-bold">{row.title}</span>
                <span className="flex-1 text-sm text-muted">{row.note}</span>
                <Icon name="arrow-right" size={16} className="shrink-0 self-center text-muted" />
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
