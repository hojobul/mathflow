"use client";

import { useState } from "react";
import { useSession } from "@/lib/auth/client";
import { useEffectiveUser } from "@/lib/auth/useEffectiveUser";
import { requestLogin } from "@/lib/auth/requestLogin";

interface SubscribeButtonProps {
  creatorId: string;
  initialSubscribed: boolean;
  initialCount: number;
  compact?: boolean;
}

export function SubscribeButton({ creatorId, initialSubscribed, initialCount, compact }: SubscribeButtonProps) {
  const { data: session } = useSession();
  const { id: effectiveUserId } = useEffectiveUser();
  const [subscribed, setSubscribed] = useState(initialSubscribed);
  const [count, setCount] = useState(initialCount);
  const [pending, setPending] = useState(false);

  if (effectiveUserId === creatorId) return null;

  async function toggle() {
    if (!session?.user) return requestLogin();
    setPending(true);
    const prev = { subscribed, count };
    setSubscribed(!subscribed);
    setCount((c) => c + (subscribed ? -1 : 1));
    try {
      const res = await fetch(`/api/creators/${creatorId}/subscribe`, { method: "POST" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSubscribed(data.subscribed);
      setCount(data.subscriberCount);
    } catch {
      setSubscribed(prev.subscribed);
      setCount(prev.count);
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className={`${subscribed ? "btn-ghost" : "btn-primary"} ${compact ? "!h-7 !px-2.5 text-xs" : ""}`}
    >
      {subscribed ? "구독중" : "구독"}
      <span className="font-mono font-normal tabular-nums">{count}</span>
    </button>
  );
}
