import type { ReactNode } from "react";

/** 직접 그린 선 아이콘 (24px 격자, 선 굵기 1.75, 모서리 각짐). 이모지·유니코드 기호 대신 사용한다. */
const PATHS: Record<string, ReactNode> = {
  heart: <path d="M12 20.5S4 15.6 4 9.9a4.4 4.4 0 0 1 8-2.5 4.4 4.4 0 0 1 8 2.5c0 5.7-8 10.6-8 10.6z" />,
  comment: <path d="M4 5h16v11H9.5L4 20.5V5z" />,
  bookmark: <path d="M6 3h12v18l-6-4.8L6 21V3z" />,
  stack: (
    <>
      <path d="M3 8l9-4 9 4-9 4-9-4z" />
      <path d="M3 12l9 4 9-4" />
      <path d="M3 16l9 4 9-4" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="M15 15l5.5 5.5" />
    </>
  ),
  close: <path d="M5 5l14 14M19 5L5 19" />,
  "arrow-left": <path d="M20 12H5M11 6l-6 6 6 6" />,
  "arrow-right": <path d="M4 12h15M13 6l6 6-6 6" />,
  "arrow-up": <path d="M12 20V5M6 11l6-6 6 6" />,
  "arrow-down": <path d="M12 4v15M6 13l6 6 6-6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="M4 12.5l5 5L20 6.5" />,
  play: <path d="M7 4l13 8-13 8V4z" />,
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
    </>
  ),
};

export type IconName = keyof typeof PATHS;

export function Icon({
  name,
  size = 18,
  filled = false,
  className,
}: {
  name: IconName;
  size?: number;
  filled?: boolean;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      className={className}
    >
      {PATHS[name]}
    </svg>
  );
}

/** 로고: 좌표축 위를 지나는 곡선과 극값 표시점. */
export function Logo({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3.5 2.5v18h18" stroke="currentColor" strokeWidth={2} strokeLinecap="square" />
      <path
        d="M6.5 17C9.5 17 9.5 6.5 13 6.5S17 13 21 13"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="square"
      />
      <rect x="11" y="4.5" width="4" height="4" fill="var(--hl)" stroke="currentColor" strokeWidth={1.5} />
    </svg>
  );
}
