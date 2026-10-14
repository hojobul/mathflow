"use client";

import { useEffect, useState } from "react";
import { authClient, useSession } from "@/lib/auth/client";
import { LOGIN_EVENT } from "@/lib/auth/requestLogin";
import { Icon } from "@/components/ui/Icon";

/** 로그인·회원가입·로그아웃 (Neon Auth). */
export function AuthWidget() {
  const { data: session, isPending } = useSession();

  if (isPending) return <div className="h-9 w-16 animate-pulse bg-surface-2" />;
  if (session?.user) return <SignedIn name={session.user.name || session.user.email} />;
  return <SignInForm />;
}

function SignedIn({ name }: { name: string }) {
  const [pending, setPending] = useState(false);

  async function handleSignOut() {
    setPending(true);
    await authClient.signOut();
    // 서버 컴포넌트가 세션을 다시 읽도록 전체 새로고침한다.
    window.location.reload();
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="hidden max-w-32 truncate font-semibold sm:inline">{name}</span>
      <button type="button" onClick={handleSignOut} disabled={pending} className="btn-ghost h-8 px-3 text-xs">
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

  useEffect(() => {
    const onRequest = () => setOpen(true);
    window.addEventListener(LOGIN_EVENT, onRequest);
    return () => window.removeEventListener(LOGIN_EVENT, onRequest);
  }, []);

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
      setError(authError.message ?? "인증에 실패했습니다.");
      return;
    }
    window.location.reload();
  }

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} className="btn-primary">
        로그인
      </button>
      {open && (
        <form
          onSubmit={handleSubmit}
          className="card absolute right-0 top-11 z-40 flex w-72 flex-col gap-3 border-foreground p-4"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold">{mode === "signIn" ? "로그인" : "회원가입"}</span>
            <button type="button" onClick={() => setOpen(false)} aria-label="닫기" className="text-muted hover:text-foreground">
              <Icon name="close" size={16} />
            </button>
          </div>
          {mode === "signUp" && (
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="이름" className="field" />
          )}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일"
            required
            className="field"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호 (8자 이상)"
            required
            minLength={8}
            className="field"
          />
          {error && <p className="text-xs text-danger">{error}</p>}
          <button type="submit" disabled={pending} className="btn-primary w-full">
            {pending ? "처리 중" : mode === "signIn" ? "로그인" : "가입"}
          </button>
          <button
            type="button"
            onClick={() => setMode(mode === "signIn" ? "signUp" : "signIn")}
            className="text-left text-xs text-muted underline underline-offset-2 hover:text-foreground"
          >
            {mode === "signIn" ? "회원가입" : "로그인"}
          </button>
        </form>
      )}
    </div>
  );
}
