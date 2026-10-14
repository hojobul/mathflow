"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { AuthWidget } from "@/components/auth/AuthWidget";
import { Icon, Logo } from "@/components/ui/Icon";

const NAV = [
  { href: "/feed", label: "피드" },
  { href: "/shorts", label: "쇼츠" },
  { href: "/quiz", label: "Math Rush" },
  { href: "/library", label: "탐색" },
  { href: "/me/library", label: "서재" },
  { href: "/editor", label: "에디터" },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [q, setQ] = useState("");

  return (
    <header className="sticky top-0 z-30 border-b border-foreground bg-background">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-5 px-5">
        <Link href="/" className="flex items-center gap-2 font-serif text-lg font-bold tracking-tight">
          <Logo />
          MathFlow
        </Link>

        <nav className="hidden items-center gap-4 text-sm md:flex">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? "hl font-bold" : "text-muted transition-colors hover:text-foreground"}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <form
          className="ml-auto hidden sm:block"
          onSubmit={(e) => {
            e.preventDefault();
            if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
          }}
        >
          <label className="flex h-8 w-52 items-center gap-2 border border-line-strong bg-surface px-2 focus-within:border-foreground">
            <Icon name="search" size={15} className="shrink-0 text-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="검색"
              aria-label="검색"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
            />
          </label>
        </form>

        <div className="ml-auto sm:ml-0">
          <AuthWidget />
        </div>
      </div>

      <nav className="flex gap-4 overflow-x-auto border-t border-line px-5 py-2 text-sm md:hidden">
        {[...NAV, { href: "/search", label: "검색" }].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`shrink-0 ${pathname === item.href ? "hl font-bold" : "text-muted"}`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
