"use client";

import { useState } from "react";
import { authClient, useSession } from "@/lib/auth/client";

/** Compact sign-in/sign-up/sign-out widget — Neon Auth (Managed Better Auth). */
export function AuthWidget() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return <div className="h-8 w-20 animate-pulse rounded bg-black/5 dark:bg-white/10" />;
  }

  if (session?.user) {
    return <SignedIn name={session.user.name || session.user.email} />;
  }

  return <SignInForm />;
}

function SignedIn({ name }: { name: string }) {
  const [pending, setPending] = useState(false);

  async function handleSignOut() {
    setPending(true);
    await authClient.signOut();
    // Neon Auth session is server-verified per request — a full reload is
    // the simplest way to make every server component re-check it.
    window.location.reload();
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-black/70 dark:text-white/70">{name}</span>
      <button
        type="button"
        onClick={handleSignOut}
        disabled={pending}
        className="rounded border border-black/15 px-2.5 py-1 text-xs hover:bg-black/5 disabled:opacity-50 dark:border-white/20 dark:hover:bg-white/10"
      >
        로그아웃
      </button>
    </div>
  );
}

function SignInForm() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white dark:bg-white dark:text-black"
      >
        로그인
      </button>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const { error: authError } =
      mode === "signIn"
        ? await authClient.signIn.email({ email, password })
        : await authClient.signUp.email({ email, password, name: name || email });
    setPending(false);
    if (authError) {
      setError(authError.message ?? "인증에 실패했습니다");
      return;
    }
    window.location.reload();
  }

  return (
    <div className="relative">
      <form
        onSubmit={handleSubmit}
        className="absolute right-0 top-0 z-10 flex w-64 flex-col gap-2 rounded-md border border-black/10 bg-background p-3 shadow-lg dark:border-white/15"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium">{mode === "signIn" ? "로그인" : "회원가입"}</span>
          <button type="button" onClick={() => setOpen(false)} className="text-xs text-black/40 dark:text-white/40">
            ✕
          </button>
        </div>
        {mode === "signUp" && (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="이름"
            className="rounded border border-black/15 bg-transparent px-2 py-1.5 text-sm outline-none dark:border-white/20"
          />
        )}
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="이메일"
          required
          className="rounded border border-black/15 bg-transparent px-2 py-1.5 text-sm outline-none dark:border-white/20"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호"
          required
          minLength={8}
          className="rounded border border-black/15 bg-transparent px-2 py-1.5 text-sm outline-none dark:border-white/20"
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {pending ? "처리 중…" : mode === "signIn" ? "로그인" : "가입하기"}
        </button>
        <button
          type="button"
          onClick={() => setMode(mode === "signIn" ? "signUp" : "signIn")}
          className="text-xs text-black/50 hover:underline dark:text-white/50"
        >
          {mode === "signIn" ? "계정이 없나요? 회원가입" : "이미 계정이 있나요? 로그인"}
        </button>
      </form>
    </div>
  );
}
