"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { authClient, useSession } from "@/lib/auth/client";
import { useEffectiveUser } from "@/lib/auth/useEffectiveUser";
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
  const { id, isGuest, loading } = useEffectiveUser();

  async function handleSignOut() {
    setPending(true);
    await authClient.signOut();
    // 서버 컴포넌트가 세션을 다시 읽도록 전체 새로고침한다.
    window.location.reload();
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      {!loading && !isGuest ? (
        <Link href={`/creator/${id}`} className="hidden max-w-32 truncate font-semibold hover:underline sm:inline" title="내 채널">
          {name}
        </Link>
      ) : (
        <span className="hidden max-w-32 truncate font-semibold sm:inline">{name}</span>
      )}
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
    try {
      // 인증 실패는 반환값이 아니라 예외로 올라오는 경우가 있어 둘 다 처리한다.
      const { error: authError } =
        mode === "signIn"
          ? await authClient.signIn.email({ email, password })
          : await authClient.signUp.email({ email, password, name: name || email });
      if (authError) throw authError;
      window.location.reload();
    } catch (err) {
      setError(authMessage(err, mode));
    } finally {
      setPending(false);
    }
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

/** 인증 라이브러리의 영어 오류를 사용자에게 보여줄 문장으로 바꾼다. */
function authMessage(err: unknown, mode: "signIn" | "signUp"): string {
  const raw = (err as { message?: string; code?: string } | null) ?? {};
  const text = `${raw.code ?? ""} ${raw.message ?? ""}`.toLowerCase();
  if (text.includes("invalid email or password") || text.includes("invalid_email_or_password")) {
    return "이메일 또는 비밀번호가 맞지 않습니다.";
  }
  if (text.includes("already") || text.includes("exists")) return "이미 가입된 이메일입니다.";
  if (text.includes("password") && text.includes("short")) return "비밀번호는 8자 이상이어야 합니다.";
  if (text.includes("invalid origin")) return "이 주소에서는 로그인할 수 없습니다.";
  return mode === "signIn" ? "로그인하지 못했습니다. 잠시 후 다시 시도해 주세요." : "가입하지 못했습니다. 잠시 후 다시 시도해 주세요.";
}
