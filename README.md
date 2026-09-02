# MathFlow

개인화된 수학 콘텐츠 피드 및 추천 플랫폼 — 아키텍처 청사진 + 초기 구현.

전체 시스템 아키텍처와 설계 근거는 [docs/architecture.md](docs/architecture.md),
행동 데이터 텔레메트리 페이로드 스펙은 [docs/event-tracking-protocol.md](docs/event-tracking-protocol.md)를 참고하세요.

## 스택

- **Frontend**: Next.js 16 (App Router) + TypeScript + Tailwind CSS
- **DB / ORM**: PostgreSQL + Prisma 6 (`prisma/schema.prisma`)
- **수식 렌더링**: KaTeX (`react-katex`)
- **검증**: Zod

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 데이터베이스 연결

**권장 — Vercel Marketplace (Neon)로 자동 프로비저닝:**

```bash
npm i -g vercel
vercel link
vercel integration add neon
vercel env pull .env.local --yes
```

**대안 — 직접 연결 문자열 사용:** `.env.example`을 `.env.local`로 복사하고
`DATABASE_URL`을 원하는 Postgres 인스턴스(Neon, Supabase, 로컬 등)로 채워주세요.

### 3. 스키마 적용 + 시드 데이터

```bash
npm run db:migrate        # 로컬 개발 DB에 마이그레이션 적용 (prisma/migrations 재생)
npm run db:seed           # 카테고리/콘텐츠/오늘의 Daily Quiz 시드
```

베이스라인 마이그레이션은 `prisma/migrations/*_init/migration.sql`에 DB 연결 없이
미리 생성해 두었습니다 — 실제 DB가 연결되면 `db:migrate`(dev) 또는
`db:migrate:deploy`(prod/CI)로 그대로 재생됩니다.

### 4. 개발 서버 실행

```bash
npm run dev
```

- `/` — 랜딩
- `/editor` — 크리에이터용 Rich Text + LaTeX 블록 에디터 데모

## 프로젝트 구조

```
prisma/schema.prisma              # DB 모델 (1단계)
prisma/seed.ts                    # 로컬 개발용 시드

src/lib/telemetry/schema.ts       # 이벤트 트래킹 프로토콜 (Zod)
src/lib/telemetry/aggregate.ts    # 원시 이벤트 → UserBehaviorLog 집계
src/lib/recommendation/
  scoreEngine.ts                  # 관심도 점수 공식
  feedService.ts                  # 개인화 피드 랭킹
  preferenceUpdater.ts            # 분야별 선호도 / 스타일 레이더 EMA 업데이트
src/lib/grading.ts                # 문제 채점 로직
src/lib/content/blocks.ts         # Content.body 블록 스키마 (에디터 ⇄ API 공유)

src/app/api/feed/route.ts                 # GET  개인화 피드
src/app/api/behavior/route.ts             # POST 배치 행동 로그 수집
src/app/api/content/[id]/hints/route.ts   # GET  단계별 힌트 차등 열람
src/app/api/daily-quiz/route.ts           # GET  오늘의 Daily Math Rush
src/app/api/daily-quiz/submit/route.ts    # POST 채점 + "상위 N%" 피드백

src/components/tracking/          # 행동 데이터 트래킹 래퍼 (2단계 §1)
src/components/editor/            # LaTeX 블록 에디터 (2단계 §2)
```

## 참고

- `DATABASE_URL`이 비어 있으면 `/api/*` 라우트는 연결 시점에 실패합니다 — 위 2단계를 먼저 완료하세요.
- 인증은 아직 연결되어 있지 않습니다. API는 임시로 `userId`를 쿼리/바디로 직접 받습니다 —
  실제 인증 연동 시 `TODO(auth)` 주석이 달린 지점들을 교체하세요.
