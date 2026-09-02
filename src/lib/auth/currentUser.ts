import { prisma } from "@/lib/prisma";
import { auth } from "./server";
import { GUEST_EMAIL_CLIENT, GUEST_USER_ID_CLIENT } from "./constants";

/**
 * Bridges a Neon Auth session to our own `User` row. Auth owns identity
 * (`neon_auth.users_sync`); our `User` table stays the FK target for every
 * other model (behavior logs, likes, subscriptions, …), linked by
 * `User.authUserId`. First call after a fresh sign-in creates the row.
 */
export async function getSessionAppUser() {
  const { data: session } = await auth.getSession();
  const authUser = session?.user;
  if (!authUser) return null;

  return prisma.user.upsert({
    where: { authUserId: authUser.id },
    create: {
      authUserId: authUser.id,
      email: authUser.email,
      displayName: authUser.name || authUser.email,
    },
    update: {
      email: authUser.email,
      displayName: authUser.name || authUser.email,
    },
  });
}

// Used for browsing/telemetry so 비회원 사용 (guest usage) still works;
// identity-sensitive actions (like, subscribe, publish) require real login
// and never fall back to this.
export async function getOrCreateGuestUser() {
  return prisma.user.upsert({
    where: { email: GUEST_EMAIL_CLIENT },
    create: { id: GUEST_USER_ID_CLIENT, email: GUEST_EMAIL_CLIENT, displayName: "Guest", role: "STUDENT" },
    update: {},
  });
}
