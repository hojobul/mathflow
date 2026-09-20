"use client";

import { useMemo, useState } from "react";
import { compileExpression, ExpressionError } from "@/lib/math/evaluate";
import type { GraphWidgetConfig } from "@/lib/content/widget";

const X_MIN = -10;
const X_MAX = 10;
const SAMPLES = 120;
const WIDTH = 320;
const HEIGHT = 220;
const PADDING = 24;

/**
 * 인터랙티브 그래프 위젯 — 슬라이더로 변수(a, b, c, …)를 조작하면 실시간으로
 * 반영되는 함수 그래프. 팔레트 slot 1(blue)을 레이더 차트와 동일하게 사용.
 */
interface InteractiveGraphWidgetProps {
  config: GraphWidgetConfig;
  onInteract?: () => void;
}

export function InteractiveGraphWidget({ config, onInteract }: InteractiveGraphWidgetProps) {
  const [values, setValues] = useState<Record<string, number>>(config.variables);

  const compiled = useMemo(() => {
    try {
      return { fn: compileExpression(config.expression), error: null as string | null };
    } catch (err) {
      return { fn: null, error: err instanceof ExpressionError ? err.message : "수식 오류" };
    }
  }, [config.expression]);

  const { points, yMin, yMax, evalError } = useMemo(() => {
    if (!compiled.fn) return { points: [] as [number, number][], yMin: -1, yMax: 1, evalError: compiled.error };
    const pts: [number, number][] = [];
    let error: string | null = null;
    for (let i = 0; i <= SAMPLES; i++) {
      const x = X_MIN + ((X_MAX - X_MIN) * i) / SAMPLES;
      try {
        const y = compiled.fn({ ...values, x });
        if (Number.isFinite(y)) pts.push([x, y]);
      } catch (err) {
        error = err instanceof ExpressionError ? err.message : "계산 오류";
        break;
      }
    }
    const ys = pts.map(([, y]) => y);
    const rawMin = ys.length ? Math.min(...ys) : -1;
    const rawMax = ys.length ? Math.max(...ys) : 1;
    // Pad the range a bit so the curve doesn't touch the frame, and never collapse to zero height.
    const span = Math.max(rawMax - rawMin, 1e-6);
    return { points: pts, yMin: rawMin - span * 0.1, yMax: rawMax + span * 0.1, evalError: error };
  }, [compiled, values]);

  const toSvg = (x: number, y: number): [number, number] => {
    const sx = PADDING + ((x - X_MIN) / (X_MAX - X_MIN)) * (WIDTH - 2 * PADDING);
    const sy = HEIGHT - PADDING - ((y - yMin) / (yMax - yMin)) * (HEIGHT - 2 * PADDING);
    return [sx, sy];
  };

  const pathD = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"} ${toSvg(x, y).map((v) => v.toFixed(1)).join(",")}`)
    .join(" ");

  const zeroY = yMin <= 0 && yMax >= 0 ? toSvg(0, 0)[1] : null;
  const zeroX = X_MIN <= 0 && X_MAX >= 0 ? toSvg(0, 0)[0] : null;

  return (
    <div className="flex flex-col gap-3 rounded-md border border-black/10 p-3 dark:border-white/10">
      <div className="rounded bg-black/[.02] px-2 py-1 font-mono text-xs text-black/60 dark:bg-white/[.04] dark:text-white/60">
        y = {config.expression}
      </div>

      {evalError ? (
        <p className="text-xs text-red-500">수식을 계산할 수 없어요: {evalError}</p>
      ) : (
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full max-w-xs self-center" role="img" aria-label="함수 그래프">
          <rect x={0} y={0} width={WIDTH} height={HEIGHT} className="fill-none" />
          {zeroX !== null && (
            <line x1={zeroX} y1={PADDING} x2={zeroX} y2={HEIGHT - PADDING} className="stroke-black/15 dark:stroke-white/15" strokeWidth={1} />
          )}
          {zeroY !== null && (
            <line x1={PADDING} y1={zeroY} x2={WIDTH - PADDING} y2={zeroY} className="stroke-black/15 dark:stroke-white/15" strokeWidth={1} />
          )}
          <path
            d={pathD}
            className="fill-none stroke-[#2a78d6] dark:stroke-[#3987e5]"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}

      <div className="flex flex-col gap-2">
        {Object.entries(config.ranges).map(([name, [min, max]]) => (
          <label key={name} className="flex items-center gap-2 text-xs">
            <span className="w-16 shrink-0 font-mono">
              {name} = {values[name]?.toFixed(2) ?? min}
            </span>
            <input
              type="range"
              min={min}
              max={max}
              step={(max - min) / 100}
              value={values[name] ?? min}
              onChange={(e) => {
                setValues((v) => ({ ...v, [name]: Number(e.target.value) }));
                onInteract?.();
              }}
              className="flex-1"
            />
          </label>
        ))}
      </div>
    </div>
  );
}
