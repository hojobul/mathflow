"use client";

import { useEffect, useState } from "react";
import { useSession } from "./client";
import { GUEST_USER_ID_CLIENT } from "./constants";

interface EffectiveUser {
  id: string;
  displayName: string;
  isGuest: boolean;
  loading: boolean;
}

/**
 * The app-level identity this browser should act as right now: the real
 * `User.id` once logged in, otherwise the shared guest id (비회원 사용) —
 * mirrors `GET /api/me` (see src/lib/auth/currentUser.ts), which does the
 * same session→app-user mapping server-side. Used for feed/behavior calls;
 * NOT sufficient for like/subscribe/publish, which the server gates on the
 * real session itself.
 */
export function useEffectiveUser(): EffectiveUser {
  const { data: session, isPending } = useSession();
  const [state, setState] = useState<EffectiveUser>({
    id: GUEST_USER_ID_CLIENT,
    displayName: "Guest",
    isGuest: true,
    loading: true,
  });

  useEffect(() => {
    if (isPending) return;
    let cancelled = false;
    fetch("/api/me")
      .then((res) => res.json())
      .then((me) => {
        if (!cancelled) setState({ id: me.id, displayName: me.displayName, isGuest: me.isGuest, loading: false });
      })
      .catch(() => {
        if (!cancelled) setState((s) => ({ ...s, loading: false }));
      });
    return () => {
      cancelled = true;
    };
    // Re-resolve whenever the session's user identity changes (login/logout).
  }, [isPending, session?.user?.id]);

  return state;
}
