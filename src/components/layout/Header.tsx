"use client";

import Link from "next/link";
import { AuthWidget } from "@/components/auth/AuthWidget";

export function Header() {
  return (
    <header className="flex items-center justify-between border-b border-black/10 px-6 py-3 dark:border-white/10">
      <nav className="flex items-center gap-4 text-sm">
        <Link href="/" className="font-semibold">
          MathFlow
        </Link>
        <Link href="/editor" className="text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white">
          에디터
        </Link>
        <Link href="/library" className="text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white">
          라이브러리
        </Link>
      </nav>
      <AuthWidget />
    </header>
  );
}
