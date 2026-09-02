import { NextResponse } from "next/server";
import { getOrCreateGuestUser, getSessionAppUser } from "@/lib/auth/currentUser";

/**
 * GET /api/me — the effective identity for this request: the logged-in
 * app user if there's a session, otherwise the shared guest identity
 * (비회원 사용). The client uses this id for feed/behavior calls; it is
 * NOT sufficient authorization for like/subscribe/publish, which resolve
 * the session server-side themselves and reject guests outright.
 */
export async function GET() {
  const appUser = await getSessionAppUser();
  if (appUser) {
    return NextResponse.json({
      id: appUser.id,
      displayName: appUser.displayName,
      email: appUser.email,
      isGuest: false,
    });
  }
  const guest = await getOrCreateGuestUser();
  return NextResponse.json({ id: guest.id, displayName: guest.displayName, email: guest.email, isGuest: true });
}
