"use client";

import { useEffect, useRef } from "react";

interface LatexFocusZoneProps {
  blockId: string;
  onFocusChange: (blockId: string, focused: boolean) => void;
  children: React.ReactNode;
  className?: string;
}

/**
 * Wraps one rendered LaTeX block and reports viewport dwell via
 * IntersectionObserver — the raw signal behind "LaTeX 영역 노출 시간" in the
 * interest-score formula.
 */
export function LatexFocusZone({ blockId, onFocusChange, children, className }: LatexFocusZoneProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const io = new IntersectionObserver(
      ([entry]) => onFocusChange(blockId, entry.isIntersecting),
      { threshold: 0.5 },
    );
    io.observe(node);
    return () => {
      io.disconnect();
      onFocusChange(blockId, false);
    };
  }, [blockId, onFocusChange]);

  return (
    <div ref={ref} className={className} data-latex-block-id={blockId}>
      {children}
    </div>
  );
}
