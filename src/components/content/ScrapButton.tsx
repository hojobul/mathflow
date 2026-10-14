"use client";

import { useState } from "react";
import { useSession } from "@/lib/auth/client";
import { requestLogin } from "@/lib/auth/requestLogin";
import { Icon } from "@/components/ui/Icon";

interface ScrapButtonProps {
  contentId: string;
  type?: "SCRAP" | "CONCEPT_ALBUM";
  initialSaved: boolean;
  vertical?: boolean;
}

const LABEL = { SCRAP: ["스크랩", "스크랩함"], CONCEPT_ALBUM: ["개념 앨범", "앨범에 저장됨"] } as const;

export function ScrapButton({ contentId, type = "SCRAP", initialSaved, vertical }: ScrapButtonProps) {
  const { data: session } = useSession();
  const [saved, setSaved] = useState(initialSaved);
  const [pending, setPending] = useState(false);

  async function toggle() {
    if (!session?.user) return requestLogin();
    setPending(true);
    const prev = saved;
    setSaved(!saved);
    try {
      const res = await fetch(`/api/content/${contentId}/scrap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      if (!res.ok) throw new Error();
      setSaved((await res.json()).saved);
    } catch {
      setSaved(prev);
    } finally {
      setPending(false);
    }
  }

  const icon = type === "SCRAP" ? "bookmark" : "stack";
  const text = LABEL[type][saved ? 1 : 0];

  if (vertical) {
    return (
      <button type="button" onClick={toggle} disabled={pending} aria-label={text} className="flex flex-col items-center gap-1 text-xs">
        <span
          className={`flex h-11 w-11 items-center justify-center border border-foreground ${
            saved ? "bg-foreground text-surface" : "bg-surface"
          }`}
        >
          <Icon name={icon} size={20} filled={saved && type === "SCRAP"} />
        </span>
        <span>저장</span>
      </button>
    );
  }
  return (
    <button type="button" onClick={toggle} disabled={pending} className={saved ? "chip chip-active" : "chip"}>
      <Icon name={icon} size={15} filled={saved && type === "SCRAP"} />
      {text}
    </button>
  );
}
