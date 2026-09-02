/**
 * Seed for local development: 3 categories + 5 content items (covering all
 * four ContentTypes) + today's Daily Math Rush. Uses fixed ids so re-running
 * `npm run db:seed` replaces the seed set instead of duplicating it — it
 * only ever touches these 5 ids, never content created through the app.
 * Run with: npx tsx prisma/seed.ts  (or `npm run db:seed`)
 */
import path from "node:path";
import { config as loadEnv } from "dotenv";
import { PrismaClient, ContentType } from "@prisma/client";

// tsx doesn't auto-load .env.local the way Next.js does — mirror
// prisma.config.ts's loading so `npm run db:seed` works standalone.
loadEnv({ path: path.join(__dirname, "..", ".env") });
loadEnv({ path: path.join(__dirname, "..", ".env.local"), override: true });

const prisma = new PrismaClient();

const SEED_IDS = ["seed-quadratic", "seed-euler", "seed-parabola", "seed-pythagoras", "seed-fermat"];

async function main() {
  const [calculus, geometry, numberTheory] = await Promise.all(
    [
      { slug: "calculus", name: "미적분" },
      { slug: "geometry", name: "기하" },
      { slug: "number-theory", name: "정수론" },
    ].map((c) => prisma.categoryTag.upsert({ where: { slug: c.slug }, create: c, update: {} })),
  );

  // Fixed id so it matches the client-side DEMO_USER_ID placeholder
  // (src/app/providers.tsx) until real auth replaces both.
  const user = await prisma.user.upsert({
    where: { email: "demo@mathflow.app" },
    create: { id: "demo-user", email: "demo@mathflow.app", displayName: "Demo Creator", role: "CREATOR" },
    update: {},
  });

  // Replace the seed set (cascades to hints / category links via onDelete: Cascade).
  await prisma.content.deleteMany({ where: { id: { in: SEED_IDS } } });

  await prisma.content.create({
    data: {
      id: "seed-quadratic",
      type: ContentType.PROBLEM,
      title: "이차방정식의 판별식",
      summary: "판별식을 이용해 근의 개수를 구해보세요.",
      body: {
        blocks: [
          { id: "b1", kind: "text", text: "다음 이차방정식의 실근의 개수를 구하시오." },
          { id: "b2", kind: "latex", source: "x^2 - 4x + 4 = 0", display: "block" },
        ],
      },
      searchText: "이차방정식 판별식 실근",
      latexExpressions: ["x^2 - 4x + 4 = 0"],
      difficulty: 2,
      estimatedSeconds: 90,
      answerKey: { kind: "numeric", value: 1, tolerance: 0 },
      authorId: user.id,
      categories: { create: [{ categoryId: numberTheory.id }] },
      hints: {
        create: [
          { order: 1, label: "핵심 개념", body: { blocks: [{ id: "h1", kind: "text", text: "판별식 D = b² - 4ac" }] } },
          { order: 2, label: "접근법", body: { blocks: [{ id: "h2", kind: "text", text: "D = 0이면 중근(실근 1개)" }] } },
          {
            order: 3,
            label: "전체 풀이",
            isFullSolution: true,
            body: { blocks: [{ id: "h3", kind: "text", text: "D = 16 - 16 = 0 → 실근 1개" }] },
          },
        ],
      },
    },
  });

  await prisma.content.create({
    data: {
      id: "seed-euler",
      type: ContentType.HISTORY,
      title: "오일러와 쾨니히스베르크의 다리",
      summary: "그래프 이론의 탄생 비화.",
      body: {
        blocks: [
          { id: "b1", kind: "text", text: "1736년, 오일러는 일곱 개의 다리를 한 번씩만 건너는 문제를 풀며 그래프 이론의 기초를 놓았다." },
        ],
      },
      searchText: "오일러 쾨니히스베르크 그래프 이론",
      difficulty: 1,
      estimatedSeconds: 120,
      authorId: user.id,
      categories: { create: [{ categoryId: geometry.id }] },
    },
  });

  await prisma.content.create({
    data: {
      id: "seed-parabola",
      type: ContentType.CONCEPT,
      title: "포물선 계수 조작해보기",
      summary: "a, b, c를 슬라이더로 바꾸며 포물선의 변화를 관찰하세요.",
      body: { blocks: [{ id: "b1", kind: "text", text: "슬라이더를 움직여 y = ax² + bx + c 그래프의 변화를 확인하세요." }] },
      widgetConfig: {
        variables: { a: 1, b: 0, c: 0 },
        ranges: { a: [-5, 5], b: [-5, 5], c: [-5, 5] },
        expression: "a*x^2 + b*x + c",
      },
      difficulty: 2,
      estimatedSeconds: 60,
      authorId: user.id,
      categories: { create: [{ categoryId: calculus.id }] },
    },
  });

  await prisma.content.create({
    data: {
      id: "seed-pythagoras",
      type: ContentType.PROBLEM,
      title: "피타고라스 정리 활용하기",
      summary: "직각삼각형의 빗변 길이를 구해보세요.",
      body: {
        blocks: [
          { id: "b1", kind: "text", text: "두 변의 길이가 3, 4인 직각삼각형의 빗변 길이를 구하시오." },
          { id: "b2", kind: "latex", source: "a^2 + b^2 = c^2", display: "block" },
        ],
      },
      searchText: "피타고라스 정리 직각삼각형 빗변",
      latexExpressions: ["a^2 + b^2 = c^2"],
      difficulty: 1,
      estimatedSeconds: 60,
      answerKey: { kind: "numeric", value: 5, tolerance: 0 },
      authorId: user.id,
      categories: { create: [{ categoryId: geometry.id }] },
      hints: {
        create: [
          { order: 1, label: "핵심 개념", body: { blocks: [{ id: "h1", kind: "text", text: "피타고라스 정리: a² + b² = c²" }] } },
          {
            order: 2,
            label: "전체 풀이",
            isFullSolution: true,
            body: { blocks: [{ id: "h2", kind: "text", text: "3² + 4² = 9 + 16 = 25 → c = 5" }] },
          },
        ],
      },
    },
  });

  await prisma.content.create({
    data: {
      id: "seed-fermat",
      type: ContentType.ANECDOTE,
      title: "페르마의 마지막 정리, 여백이 부족하다",
      summary: "17세기의 낙서 한 줄이 350년 뒤 앤드루 와일스를 만나기까지.",
      body: {
        blocks: [
          {
            id: "b1",
            kind: "text",
            text: "1637년, 페르마는 책 여백에 \"나는 이 명제의 놀라운 증명을 발견했으나, 여백이 부족하여 적지 않는다\"라고 적었다. 이 한 줄은 이후 350년간 수학자들을 괴롭혔다.",
          },
          { id: "b2", kind: "latex", source: "x^n + y^n = z^n", display: "block" },
        ],
      },
      searchText: "페르마의 마지막 정리 앤드루 와일스",
      latexExpressions: ["x^n + y^n = z^n"],
      difficulty: 1,
      estimatedSeconds: 100,
      authorId: user.id,
      categories: { create: [{ categoryId: numberTheory.id }] },
    },
  });

  const today = new Date();
  const dateOnly = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  await prisma.dailyQuiz.upsert({
    where: { date: dateOnly },
    create: {
      date: dateOnly,
      title: "오늘의 Math Rush",
      durationSeconds: 180,
      problems: {
        create: [
          { order: 1, contentId: "seed-quadratic" },
          { order: 2, contentId: "seed-pythagoras" },
        ],
      },
    },
    update: {},
  });

  console.log(`Seed complete: ${SEED_IDS.length} content items + today's Daily Quiz.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
