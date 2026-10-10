"use client";

import { useState } from "react";
import { useSession } from "@/lib/auth/client";

interface ScrapButtonProps {
  contentId: string;
  type?: "SCRAP" | "CONCEPT_ALBUM";
  initialSaved: boolean;
}

const LABEL = { SCRAP: ["🔖 스크랩", "🔖 스크랩됨"], CONCEPT_ALBUM: ["🗂 개념 앨범", "🗂 앨범에 저장됨"] } as const;

export function ScrapButton({ contentId, type = "SCRAP", initialSaved }: ScrapButtonProps) {
  const { data: session } = useSession();
  const [saved, setSaved] = useState(initialSaved);
  const [pending, setPending] = useState(false);

  async function toggle() {
    if (!session?.user) {
      alert("저장은 로그인 후 이용할 수 있어요.");
      return;
    }
    setPending(true);
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
      setSaved(saved);
    } finally {
      setPending(false);
    }
  }

  return (
    <button type="button" onClick={toggle} disabled={pending} className={saved ? "chip chip-active" : "chip"}>
      {LABEL[type][saved ? 1 : 0]}
    </button>
  );
}
