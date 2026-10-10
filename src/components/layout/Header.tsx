"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { AuthWidget } from "@/components/auth/AuthWidget";

const NAV = [
  { href: "/feed", label: "피드" },
  { href: "/quiz", label: "Math Rush" },
  { href: "/library", label: "탐색" },
  { href: "/me/library", label: "내 서재" },
  { href: "/editor", label: "만들기" },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [q, setQ] = useState("");

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface/85 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-4 px-5 py-3">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-sm" style={{ color: "var(--accent-ink)" }}>
            ∑
          </span>
          MathFlow
        </Link>

        <nav className="hidden items-center gap-1 text-sm md:flex">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-1.5 transition-colors ${
                  active ? "bg-accent-soft font-semibold text-accent" : "text-muted hover:bg-surface-2 hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <form
          className="ml-auto hidden flex-1 sm:block sm:max-w-56"
          onSubmit={(e) => {
            e.preventDefault();
            if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
          }}
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="🔍 검색 (수식도 OK)"
            className="w-full rounded-xl border border-line bg-surface-2 px-3 py-1.5 text-sm outline-none focus:border-accent"
          />
        </form>

        <div className="ml-auto sm:ml-0">
          <AuthWidget />
        </div>
      </div>

      {/* mobile nav */}
      <nav className="flex gap-1 overflow-x-auto border-t border-line px-3 py-1.5 text-sm md:hidden">
        {[...NAV, { href: "/search", label: "검색" }].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`shrink-0 rounded-lg px-3 py-1 ${
              pathname === item.href ? "bg-accent-soft font-semibold text-accent" : "text-muted"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
