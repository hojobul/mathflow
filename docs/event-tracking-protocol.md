# 이벤트 트래킹 프로토콜

클라이언트 → 백엔드로 전송되는 행동 데이터 텔레메트리의 페이로드 구조.
타입 정의(source of truth)는 [`src/lib/telemetry/schema.ts`](../src/lib/telemetry/schema.ts)이며,
집계 로직은 [`src/lib/telemetry/aggregate.ts`](../src/lib/telemetry/aggregate.ts)에 있습니다.

## 설계 원칙

1. **메인 스레드를 막지 않는다.** 모든 상호작용은 클라이언트 메모리 버퍼에만 즉시 기록되고,
   네트워크 전송은 별도 타이머/이벤트로 배치 처리된다 (`BehaviorTrackerProvider`).
2. **하나의 요청 = 여러 콘텐츠 세션의 배치.** 빠르게 스크롤하는 사용자가 플러시 전에
   여러 카드를 지나칠 수 있으므로, 한 배치에 여러 `ContentSession`을 담는다.
3. **오프셋 기반 타임스탬프.** 각 이벤트는 `atMs`(세션 시작 대비 상대 시간, ms)를 사용한다.
   절대 시각(clock skew, 시간대 이슈)에 의존하지 않고, 페이로드 크기도 작게 유지된다.
   서버는 수신 시점에 `createdAt`을 별도로 부여한다.

## 플러시 트리거

| 트리거 | 방식 |
|---|---|
| 5초 주기 타이머 | `fetch(..., { keepalive: true })` |
| 버퍼가 `BATCH_MAX_EVENTS`(200개) 초과 | 즉시 `fetch` |
| 탭 숨김 / 페이지 이탈 (`visibilitychange`, `pagehide`) | `navigator.sendBeacon` |

## 페이로드 구조

```ts
BehaviorBatchPayload {
  userId: string;
  feedSessionId: string;       // 하나의 피드 스크롤 세션을 묶는 id
  clientSentAt: string;        // ISO-8601, 배치 전송 시각
  sessions: ContentSession[];  // 최대 50개
}

ContentSession {
  contentId: string;
  sessionId: string;           // 콘텐츠 1회 노출당 uuid — 서버 UserBehaviorLog.sessionId와 1:1
  events: TelemetryEvent[];    // 최소 1개
}
```

## 이벤트 타입

| type | 설명 | 추가 필드 |
|---|---|---|
| `view_start` / `view_end` | IntersectionObserver 기준 60% 이상 노출 시작/종료 | — |
| `scroll_progress` | 콘텐츠 본문 스크롤 깊이 샘플 (300ms 스로틀) | `depthPct: 0–100` |
| `latex_focus_start` / `latex_focus_end` | LaTeX 블록이 뷰포트에 들어오고 나감 | `blockId` |
| `hint_view` | 힌트가 순서대로 열람됨 | `hintId`, `order` |
| `answer_reveal` | 전체 풀이/정답 열람 | — |
| `like` / `unlike` | 좋아요 토글 | — |
| `scrap` / `unscrap` | 스크랩 토글 | — |
| `widget_interact` | 인터랙티브 위젯(슬라이더 등) 조작 | — |

## 서버 처리 파이프라인

```
POST /api/behavior
  → BehaviorBatchPayload 검증 (zod)
  → 세션별 aggregateSession() 으로 원시 이벤트 → 집계값 변환
      (dwellTimeMs, scrollDepthPct, latexFocusTimeMs, hintViewCount, interactionCount, ...)
  → computeInterestScore() 로 관심도 점수 산출
  → UserBehaviorLog upsert (sessionId 기준, 재전송 시 최신값으로 갱신)
  → applyPreferenceUpdate() 로 UserPreferenceVector / UserStyleProfile EMA 갱신
```

재전송(네트워크 재시도)은 `sessionId` 기준 upsert로 자연스럽게 멱등 처리됩니다.
