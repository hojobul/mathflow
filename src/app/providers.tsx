"use client";

import { BehaviorTrackerProvider } from "@/components/tracking/BehaviorTrackerProvider";
import { useEffectiveUser } from "@/lib/auth/useEffectiveUser";
import { Header } from "@/components/layout/Header";

export function Providers({ children }: { children: React.ReactNode }) {
  const { id: userId } = useEffectiveUser();
  return (
    <BehaviorTrackerProvider userId={userId}>
      <Header />
      {children}
    </BehaviorTrackerProvider>
  );
}
