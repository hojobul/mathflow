"use client";

import { useState } from "react";
import { useSession } from "@/lib/auth/client";
import { useEffectiveUser } from "@/lib/auth/useEffectiveUser";

interface SubscribeButtonProps {
  creatorId: string;
  initialSubscribed: boolean;
  initialCount: number;
}

export function SubscribeButton({ creatorId, initialSubscribed, initialCount }: SubscribeButtonProps) {
  const { data: session } = useSession();
  const { id: effectiveUserId } = useEffectiveUser();
  const [subscribed, setSubscribed] = useState(initialSubscribed);
  const [count, setCount] = useState(initialCount);
  const [pending, setPending] = useState(false);

  if (effectiveUserId === creatorId) return null; // no self-subscribe UI

  async function toggle() {
    if (!session?.user) {
      alert("구독은 로그인 후 이용할 수 있어요.");
      return;
    }
    setPending(true);
    setSubscribed(!subscribed);
    setCount((c) => c + (subscribed ? -1 : 1));
    try {
      const res = await fetch(`/api/creators/${creatorId}/subscribe`, { method: "POST" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSubscribed(data.subscribed);
      setCount(data.subscriberCount);
    } catch {
      setSubscribed(subscribed);
      setCount((c) => c + (subscribed ? 1 : -1));
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className={subscribed ? "chip" : "btn-primary rounded-full"}
    >
      {subscribed ? `구독 중 · ${count}` : `구독 · ${count}`}
    </button>
  );
}
