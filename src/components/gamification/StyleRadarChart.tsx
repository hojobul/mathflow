interface StyleRadarChartProps {
  logicScore: number;
  curiosityScore: number;
  calculationScore: number;
  intuitionScore: number;
  /** Score value that reaches the outer ring — scores beyond it clip visually. */
  maxScore?: number;
}

const AXES = [
  { key: "logicScore", label: "논리력" },
  { key: "curiosityScore", label: "역사적 호기심" },
  { key: "calculationScore", label: "계산력" },
  { key: "intuitionScore", label: "직관력" },
] as const;

const SIZE = 240;
const CENTER = SIZE / 2;
const RADIUS = 84;
const RING_COUNT = 3;

/**
 * 수학 스타일 레이더 차트 — 단일 시리즈(본인 점수)라 범례 없이 제목으로 식별.
 * 팔레트 slot 1(blue)을 이 앱의 기존 dark: 미디어 변형 관례에 맞춰 사용.
 */
export function StyleRadarChart({
  logicScore,
  curiosityScore,
  calculationScore,
  intuitionScore,
  maxScore = 3,
}: StyleRadarChartProps) {
  const values = { logicScore, curiosityScore, calculationScore, intuitionScore };

  const pointFor = (index: number, valueRatio: number) => {
    const angle = -Math.PI / 2 + (index / AXES.length) * 2 * Math.PI;
    const r = RADIUS * valueRatio;
    return { x: CENTER + r * Math.cos(angle), y: CENTER + r * Math.sin(angle) };
  };

  const dataPoints = AXES.map((axis, i) => {
    const ratio = Math.max(0, Math.min(1, values[axis.key] / maxScore));
    return pointFor(i, ratio);
  });
  const polygon = dataPoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full max-w-xs" role="img" aria-label="수학 스타일 레이더 차트">
      {/* grid rings */}
      {Array.from({ length: RING_COUNT }, (_, ring) => {
        const ratio = (ring + 1) / RING_COUNT;
        const ringPoints = AXES.map((_, i) => pointFor(i, ratio));
        return (
          <polygon
            key={ring}
            points={ringPoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")}
            className="fill-none stroke-black/10 dark:stroke-white/10"
            strokeWidth={1}
          />
        );
      })}

      {/* axis spokes + labels */}
      {AXES.map((axis, i) => {
        const edge = pointFor(i, 1);
        const labelPos = pointFor(i, 1.22);
        return (
          <g key={axis.key}>
            <line
              x1={CENTER}
              y1={CENTER}
              x2={edge.x}
              y2={edge.y}
              className="stroke-black/10 dark:stroke-white/10"
              strokeWidth={1}
            />
            <text
              x={labelPos.x}
              y={labelPos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-black/60 text-[10px] dark:fill-white/60"
            >
              {axis.label}
            </text>
          </g>
        );
      })}

      {/* data polygon — single series */}
      <polygon
        points={polygon}
        className="fill-[#2a78d6]/20 stroke-[#2a78d6] dark:fill-[#3987e5]/25 dark:stroke-[#3987e5]"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3} className="fill-[#2a78d6] dark:fill-[#3987e5]" />
      ))}
    </svg>
  );
}
