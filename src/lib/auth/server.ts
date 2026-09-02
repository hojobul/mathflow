import { createNeonAuth } from "@neondatabase/auth/next/server";

/**
 * Neon Auth (Managed Better Auth) server instance. Auth data lives in this
 * same Neon database's `neon_auth` schema — separate from our own `User`
 * table (see prisma/schema.prisma). We never query `neon_auth` directly;
 * `getCurrentAppUser()` below is the bridge between the two.
 */
export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET!,
  },
});
